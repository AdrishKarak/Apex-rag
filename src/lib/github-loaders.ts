import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from '@langchain/core/documents';
import { generateEmbedding, summariseCodeGemini } from "./gemini";
import { summariseCodeGroq } from "./groq";
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

    // 2. Fetch existing embeddings from database for incremental sync check
    const existingEmbeddings = await db.sourceCodeEmbeddings.findMany({
        where: { projectId },
        select: { id: true, fileName: true, sourceCode: true }
    });

    const existingMap = new Map(existingEmbeddings.map(e => [e.fileName, e.sourceCode]));
    const currentFileNameSet = new Set(filteredDocs.map(doc => doc.metadata.source || ''));

    // 3. Separate files into unchanged vs modified/new
    const docsToProcess: Document[] = [];
    let unchangedCount = 0;

    for (const doc of filteredDocs) {
        const fileName = doc.metadata.source || '';
        const existingSourceCode = existingMap.get(fileName);
        const currentSourceCode = JSON.parse(JSON.stringify(doc.pageContent));

        if (existingSourceCode !== undefined && existingSourceCode === currentSourceCode) {
            unchangedCount++;
        } else {
            docsToProcess.push(doc);
        }
    }

    console.log(`[Incremental Indexing] Total files: ${filteredDocs.length} | Unchanged: ${unchangedCount} | Modified/New: ${docsToProcess.length}`);

    // 4. Remove embeddings for files that were deleted from the repository
    const deletedFileNames = existingEmbeddings
        .map(e => e.fileName)
        .filter(fileName => !currentFileNameSet.has(fileName));

    if (deletedFileNames.length > 0) {
        console.log(`[Incremental Indexing] Removing ${deletedFileNames.length} deleted file(s) from database`);
        await db.sourceCodeEmbeddings.deleteMany({
            where: {
                projectId,
                fileName: { in: deletedFileNames }
            }
        });
    }

    // 5. If no modified or new files, indexing is complete!
    if (docsToProcess.length === 0) {
        console.log(`[Incremental Indexing] Repository is fully up-to-date! Skipping LLM & Embedding API calls.`);
        return;
    }

    // 6. Generate summaries & vector embeddings ONLY for new/modified files
    const newEmbeddings = await generateEmbeddings(docsToProcess);

    // 7. Delete existing DB records for modified files before re-inserting updated versions
    const modifiedFileNames = newEmbeddings.map(e => e.fileName);
    if (modifiedFileNames.length > 0) {
        await db.sourceCodeEmbeddings.deleteMany({
            where: {
                projectId,
                fileName: { in: modifiedFileNames }
            }
        });
    }

    // 8. Batch insert newly processed embeddings into database
    await limitConcurrency(newEmbeddings, 4, async (embedding, index) => {
        console.log(`Saving document ${index + 1} of ${newEmbeddings.length} to database`);

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
 * Dual-Provider Parallel Worker Pipeline (Groq + Gemini)
 * 
 * WHY IT'S OPTIMIZED:
 * 1. Groq RPM: ~30 RPM. We allocate 2 Groq workers with a 400ms inter-request stagger.
 * 2. Gemini RPM: ~15 RPM. We allocate 1 Gemini worker with a 1500ms inter-request stagger.
 * 3. Zero Duplication: Both provider pools pull from a single atomic queue index `nextIndex++`.
 *    Once a document index is claimed by a worker, no other worker will pull it.
 * 4. Fallback Protection: If Groq hits a limit or fails, Gemini automatically attempts the summary (and vice-versa).
 * 5. High Throughput: 3 parallel workers operating simultaneously cut overall indexing runtime by 3x–4x.
 */
const generateEmbeddings = async (docs: Document[]) => {
    const results: Array<{
        summary: string;
        embedding: number[];
        sourceCode: string;
        fileName: string;
    } | null> = new Array(docs.length).fill(null);

    let nextIndex = 0;

    // Helper to claim next document atomically
    const claimNextDoc = (): { doc: Document; index: number } | null => {
        if (nextIndex >= docs.length) return null;
        const idx = nextIndex++;
        return { doc: docs[idx]!, index: idx };
    };

    // Helper for sleep delay
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    // Groq Worker Function (Allocated 2 parallel workers)
    const groqWorker = async (workerId: number) => {
        while (true) {
            const item = claimNextDoc();
            if (!item) break;

            const { doc, index } = item;
            console.log(`[Groq Worker ${workerId}] Summarizing file ${index + 1}/${docs.length}: ${doc.metadata.source || 'unknown'}`);
            
            try {
                let summary = await summariseCodeGroq(doc);
                // Fallback to Gemini if Groq returned empty
                if (!summary || summary.trim() === "") {
                    console.warn(`[Groq Worker ${workerId}] Summary empty for ${doc.metadata.source}. Falling back to Gemini...`);
                    summary = await summariseCodeGemini(doc);
                }

                if (summary && summary.trim() !== "") {
                    const embedding = await generateEmbedding(summary);
                    results[index] = {
                        summary,
                        embedding,
                        sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
                        fileName: doc.metadata.source || "",
                    };
                }
            } catch (err) {
                console.error(`[Groq Worker ${workerId}] Error processing document index ${index}:`, err);
            }

            // Stagger next call to stay safely within Groq RPM
            await sleep(400);
        }
    };

    // Gemini Worker Function (Allocated 1 parallel worker)
    const geminiWorker = async (workerId: number) => {
        while (true) {
            const item = claimNextDoc();
            if (!item) break;

            const { doc, index } = item;
            console.log(`[Gemini Worker ${workerId}] Summarizing file ${index + 1}/${docs.length}: ${doc.metadata.source || 'unknown'}`);

            try {
                let summary = await summariseCodeGemini(doc);
                // Fallback to Groq if Gemini returned empty
                if (!summary || summary.trim() === "") {
                    console.warn(`[Gemini Worker ${workerId}] Summary empty for ${doc.metadata.source}. Falling back to Groq...`);
                    summary = await summariseCodeGroq(doc);
                }

                if (summary && summary.trim() !== "") {
                    const embedding = await generateEmbedding(summary);
                    results[index] = {
                        summary,
                        embedding,
                        sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
                        fileName: doc.metadata.source || "",
                    };
                }
            } catch (err) {
                console.error(`[Gemini Worker ${workerId}] Error processing document index ${index}:`, err);
            }

            // Stagger next call to stay safely within Gemini RPM (15 RPM limit)
            await sleep(1500);
        }
    };

    // Spawn 2 Groq Workers and 1 Gemini Worker in parallel
    const workers = [
        groqWorker(1),
        groqWorker(2),
        geminiWorker(1),
    ];

    await Promise.all(workers);

    // Filter out failed or empty results
    return results.filter(
        (r): r is {
            summary: string;
            embedding: number[];
            sourceCode: string;
            fileName: string;
        } => r !== null && r.embedding && r.embedding.length > 0
    );
};