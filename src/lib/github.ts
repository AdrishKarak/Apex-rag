/**
 * @file src/lib/github.ts
 * @description Syncs git commit histories from GitHub, downloading code diffs and creating AI summaries.
 * 
 * WHY IT'S NEEDED:
 * Populates the dashboard commit timeline log so developers can see what code changes have occurred.
 * 
 * FLOW OF EXECUTION:
 * 1. `pollCommits(projectId)`: Invokes repository URL loader.
 * 2. Fetches the latest 10 commits from GitHub via `getCommitHashes`.
 * 3. Filters out already processed SHAs via `filterUnProcesssedCommits`.
 * 4. Downloads code diff files using `getAndSummariseCommit` (via Octokit or fallback API GET).
 * 5. Passes diff string to Groq LLM model to compile a summary description.
 * 6. Batch saves the commit hashes, messages, authors, dates, and summaries into database records.
 * 
 * CONNECTIONS:
 * - Invoked by project creations and synchronization endpoints in `src/server/api/routers/project.ts`.
 */

import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { summariseCommit as groqSummariseCommit } from "./groq";

// Initialize the Octokit REST API client using environment token auth credentials
export const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
})

type Response = {
    commitHash: string
    commitMessage: string
    commitDate: string
    commitAuthorName: string
    commitAuthorAvatar: string
}

/**
 * Retrieves the 10 most recent commits from a GitHub repository.
 * Parses the owner/repo names from the repository url string.
 * @param githubUrl Repository HTTP url
 */
export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
    const cleanUrl = githubUrl.replace(/\/+$/, "").replace(/\.git$/, "");
    const parts = cleanUrl.split("/");
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1];
    if (!owner || !repo) {
        throw new Error("Invalid githubUrl");
    }

    // Call Octokit to list repository commits
    const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
    })

    // Sort commits chronologically descending (newest first)
    const sortedCommits = data.sort((a: any, b: any) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime())

    // Map top 10 commits to structured metadata records
    return sortedCommits.slice(0, 10).map((commit: any) => ({
        commitHash: commit.sha as string,
        commitMessage: commit.commit?.message ?? "",
        commitDate: commit.commit?.author?.date ?? "",
        commitAuthorName: commit.commit?.author?.name ?? "",
        commitAuthorAvatar: commit?.author?.avatar_url ?? "",
    }))
}

/**
 * Main polling handler that fetches, filters, summarizes, and inserts new commit logs.
 * @param projectId Unique project record ID
 */
export const pollCommits = async (projectId: string) => {
    const { project, githubUrl } = await fetchProjectGithubUrl(projectId)
    // Get latest commits from GitHub API
    const commitHashes = await getCommitHashes(githubUrl)
    // Filter out already processed commits
    const unProcesssedCommits = await filterUnProcesssedCommits(projectId, commitHashes)
    if (unProcesssedCommits.length === 0) {
        return [];
    }

    // Fetch and summarize diff content in parallel
    const summariseResponse = await Promise.allSettled(unProcesssedCommits.map(commit => {
        return getAndSummariseCommit(githubUrl, commit.commitHash);
    }))
    const summaries = summariseResponse.map((response) => {
        if (response.status === 'fulfilled') {
            return response.value as string;
        }
        return "";
    })

    // Batch write to the database
    const commits = await db.commit.createMany({
        data: summaries.map((summary, index) => {
            return {
                projectId,
                commitHash: unProcesssedCommits[index]!.commitHash,
                commitMessage: unProcesssedCommits[index]!.commitMessage,
                commitDate: unProcesssedCommits[index]!.commitDate,
                commitAuthorName: unProcesssedCommits[index]!.commitAuthorName,
                commitAuthorAvatar: unProcesssedCommits[index]!.commitAuthorAvatar,
                summary: summary
            }
        })
    })
    return commits;
}

/**
 * Requests raw diff files from GitHub API and generates structured explanations using Groq.
 * @param githubUrl Repository URL
 * @param commitHash Unique commit hash identifier
 */
async function getAndSummariseCommit(githubUrl: string, commitHash: string) {
    try {
        const cleanUrl = githubUrl.replace(/\/+$/, "").replace(/\.git$/, "");
        const parts = cleanUrl.split("/");
        const owner = parts[parts.length - 2];
        const repo = parts[parts.length - 1];

        let diff = "";
        try {
            // First attempt to fetch the diff headers via Octokit API adapter
            const response = await octokit.rest.repos.getCommit({
                owner: owner!,
                repo: repo!,
                ref: commitHash,
                headers: {
                    accept: 'application/vnd.github.v3.diff'
                }
            });
            diff = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        } catch {
            // Fallback: Fetch raw diff using an Axios HTTP request
            const response = await axios.get(`${cleanUrl}/commit/${commitHash}.diff`, {
                headers: {
                    Accept: 'application/vnd.github.v3.diff',
                    'User-Agent': 'Github-RAG'
                }
            });
            diff = response.data;
        }

        // Summarize the diff using Groq
        return (await groqSummariseCommit(diff)) || "";
    } catch (err) {
        console.error(`Failed to summarize commit ${commitHash}:`, err);
        return "";
    }
}

/**
 * Resolves repository URL matching a project ID.
 */
async function fetchProjectGithubUrl(projectId: string) {
    const project = await db.project.findUnique({
        where: { id: projectId },
        select: {
            githubUrl: true,
        }
    })
    if (!project?.githubUrl) {
        throw new Error("Project not found");
    }
    return { project, githubUrl: project.githubUrl }
}

/**
 * Compares retrieved commits list against existing database records to filter out duplicates.
 */
export const filterUnProcesssedCommits = async (projectId: string, commitHashes: Response[]) => {
    const processedCommits = await db.commit.findMany({
        where: { projectId }
    })

    const unProcesssedCommits = commitHashes.filter((commit) => !processedCommits.some((processedCommit) => processedCommit.commitHash === commit.commitHash))
    return unProcesssedCommits;
}