import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from '@langchain/core/documents';
import { generateEmbedding } from "./gemini";
import { summariseCode } from "./groq";
import { db } from "@/server/db";
import crypto from "crypto";

/**
 * Helper utility to process asynchronous tasks in parallel with a concurrency limit.
 * 
 * WHY IT'S NEEDED:
 * 1. API Rate Limits: Standard Promise.all fires all promises at once. If we have 100 files,
 *    we would call Gemini 100 times simultaneously, causing immediate 429 (Rate Limit Exceeded) errors.
 * 2. DB Connection Pool Exhaustion: Writing too many rows concurrently will exceed Prisma's
 *    available connection pool (usually capped between 10-20), leading to query timeout errors.
 * 
 * HOW IT WORKS:
 * It initializes a fixed number of 'workers' (equal to the limit). Each worker iterates and pulls
 * the next item from the queue dynamically until no items remain. It uses Promise.allSettled behavior
 * to capture failures gracefully.
 */
const limitConcurrency = async <T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> => {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let index = 0; // Tracks the next item in the queue to be processed

    const worker = async () => {
        while (index < items.length) {
            const currentIndex = index++;
            const item = items[currentIndex]!;
            try {
                const value = await fn(item, currentIndex);
                results[currentIndex] = { status: 'fulfilled', value };
            } catch (reason) {
                results[currentIndex] = { status: 'rejected', reason };
            }
        }
    };

    // Spawn a fixed number of worker instances in parallel
    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);
    return results;
};

/**
 * Loads documents from a specified GitHub repository using LangChain's loader.
 * 
 * WHAT IT DOES:
 * Connects to the GitHub API, recursively retrieves the file tree (ignoring standard lock files),
 * reads files under standard safety concurrency (maxConcurrency: 5), and returns an array of Documents.
 */
export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || '',
        branch: 'main',
        ignoreFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5 // Capped to avoid hitting GitHub API rate limits
    });

    const docs = await loader.load();
    return docs;
}

const isExcludeFile = (fileName: string): boolean => {
    const excludedExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', // Images
        '.woff', '.woff2', '.ttf', '.eot', // Fonts
        '.pdf', '.zip', '.tar', '.gz', // Binaries
        '.css', '.scss', '.sass', '.less', // Stylesheets
        '.json', '.md', '.gitignore', '.env' // Config/Docs
    ];
    return excludedExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};

/**
 * Main orchestrator to load, summarize, embed, and index a GitHub repository.
 * 
 * FLOW OF EXECUTION:
 * 1. Pulls files from GitHub using the loadGithubRepo function.
 * 2. Filters out assets, documents, and styles to keep summaries focused only on code.
 * 3. Passes files to generateEmbeddings (generating summaries & 768-dim vectors).
 * 4. Deletes any pre-existing indexed embeddings for the project to prevent duplicates (idempotency).
 * 5. Iterates through generated embeddings with a database write limit of 4 parallel workers.
 *    Inside the worker, we write the data using a single direct raw SQL `INSERT` statement.
 * 
 * WHY RAW SQL IS USED:
 * Prisma does not natively support Object-relational mapping (ORM) insertions for `Unsupported` data types
 * like PostgreSQL's `vector`. To write vector embeddings, we must write custom raw SQL.
 * By constructing a single `INSERT` statement per embedding, we reduce database roundtrips by 50%
 * compared to doing a Prisma `create` followed by a raw `UPDATE`.
 */
export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    // 1. Fetch files from repository
    const docs = await loadGithubRepo(githubUrl, githubToken);

    // Filter out asset, stylesheet, and documentation files to optimize indexing speed
    const filteredDocs = docs.filter(doc => !isExcludeFile(doc.metadata.source || ''));

    // 2. Generate summaries and vector embeddings for all filtered code files
    const allEmbeddings = await generateEmbeddings(filteredDocs);

    // 3. Clear old database records for the project to support re-indexing clean updates
    await db.sourceCodeEmbeddings.deleteMany({
        where: { projectId }
    });

    // 4. Batch insert new records concurrently, capped at 4 writes at a time to prevent DB pool timeouts
    await limitConcurrency(allEmbeddings, 4, async (embedding, index) => {
        console.log(`Saving document ${index + 1} of ${allEmbeddings.length} to database`);

        if (!embedding) return;

        // Generate ID client-side (Prisma defaults are client-side only and bypassed in raw SQL)
        const id = crypto.randomUUID();
        // Convert the float array to PostgreSQL's standard vector string format: [val1,val2,...]
        const embeddingStr = `[${embedding.embedding.join(",")}]`;

        // Direct INSERT to save both regular columns and vector type in a single database roundtrip
        await db.$executeRaw`
            INSERT INTO "SourceCodeEmbeddings" ("id", "summaryEmbedding", "sourceCode", "fileName", "summary", "projectId")
            VALUES (${id}, ${embeddingStr}::vector, ${embedding.sourceCode}, ${embedding.fileName}, ${embedding.summary}, ${projectId})
        `;
    });
}

/**
 * Worker pipeline to transform LangChain Documents into summarized, embedded entities.
 * 
 * WHAT IT DOES:
 * Processes each document by first calling Gemini Flash to generate a code summary,
 * then sending that summary to Gemini Embedding to get a 768-dimensional vector,
 * and finally returning a structured object.
 * 
 * CONCURRENCY MANAGEMENT:
 * We use `limitConcurrency` set to 1. This ensures that documents are processed
 * sequentially to stay well within Groq's Tokens-Per-Minute (TPM) limits on the free tier.
 */
const generateEmbeddings = async (docs: Document[]) => {
    const results = await limitConcurrency(docs, 1, async (doc) => {
        // Step A: Request Gemini to summarize the file's code purpose
        const summary = await summariseCode(doc);
        
        // Step B: Generate vector representation from the summary text
        const embedding = await generateEmbedding(summary);
        
        return {
            summary,
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source || "",
        };
    });

    // Filter out any documents that failed or returned empty embeddings (e.g. rate limit failures or empty files)
    return results
        .filter((r): r is PromiseFulfilledResult<{
            summary: string;
            embedding: number[];
            sourceCode: string;
            fileName: string;
        }> => r.status === 'fulfilled' && r.value.embedding && r.value.embedding.length > 0)
        .map(r => r.value);
}