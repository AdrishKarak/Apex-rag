import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { aisummariseCommit } from "./gemini";

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

export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
    const parts = githubUrl.split("/");
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1];
    if (!owner || !repo) {
        throw new Error("Invalid githubUrl");
    }

    const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
    })

    const sortedCommits = data.sort((a: any, b: any) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime())

    return sortedCommits.slice(0, 10).map((commit: any) => ({
        commitHash: commit.sha as string,
        commitMessage: commit.commit?.message ?? "",
        commitDate: commit.commit?.author?.date ?? "",
        commitAuthorName: commit.commit?.author?.name ?? "",
        commitAuthorAvatar: commit?.author?.avatar_url ?? "",
    }))
}

export const pollCommits = async (projectId: string) => {
    const { project, githubUrl } = await fetchProjectGithubUrl(projectId)
    const commitHashes = await getCommitHashes(githubUrl)
    const unProcesssedCommits = await filterUnProcesssedCommits(projectId, commitHashes)
    const summariseResponse = await Promise.allSettled(unProcesssedCommits.map(commit => {
        return summariseCommit(githubUrl, commit.commitHash);
    }))
    const summaries = summariseResponse.map((response) => {
        if (response.status === 'fulfilled') {
            return response.value as string;
        }
        return "";
    })

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

async function summariseCommit(githubUrl: string, commitHash: string) {
    const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
        headers: {
            Accept: 'application/vnd.github.v3.diff'
        }
    })
    return await aisummariseCommit(data) || "";
}

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

export const filterUnProcesssedCommits = async (projectId: string, commitHashes: Response[]) => {
    const processedCommits = await db.commit.findMany({
        where: { projectId }
    })

    const unProcesssedCommits = commitHashes.filter((commit) => !processedCommits.some((processedCommit) => processedCommit.commitHash === commit.commitHash))
    return unProcesssedCommits;
}