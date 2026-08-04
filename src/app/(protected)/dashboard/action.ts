/**
 * @file src/app/(protected)/dashboard/action.ts
 * @description Server Action implementing the RAG (Retrieval-Augmented Generation) query system.
 * 
 * WHY IT'S NEEDED:
 * Allows developers to ask questions about the codebase and receive answers grounded in the actual codebase files.
 * 
 * FLOW OF EXECUTION:
 * 1. `askQuestion(question, projectId)`: Called from dashboard client components.
 * 2. Authenticates user session using Clerk (`auth()`).
 * 3. Checks local DB to verify user has >= 10 credits. Deducts 10 credits if successful.
 * 4. Calls Gemini to convert the question string into a 768-dimensional query vector.
 * 5. Runs a raw SQL query `db.$queryRaw` executing cosine distance similarity (`<=>`) comparing the question vector
 *    against database `SourceCodeEmbeddings` (similarity > 0.55 threshold).
 * 6. Applies a relative filtering threshold (at least `top_match - 0.12`) to keep only relevant context files.
 * 7. Constructs a context block combining source file content and summaries.
 * 8. Launches an asynchronous generator fetching `streamText` from Groq's `llama-3.3-70b-versatile` model.
 * 9. Streams response tokens back to the client in real-time via `createStreamableValue`.
 * 
 * CONNECTIONS:
 * - Invoked by AskQuestionCard client components.
 * - Imports database client (`src/server/db.ts`) and vector generator (`src/lib/gemini.ts`).
 */

"use server";
import { streamText } from "ai";
import { createStreamableValue } from '@ai-sdk/rsc'
import { createGroq } from "@ai-sdk/groq"
import { generateEmbedding } from "@/lib/gemini";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";

// Initialize Groq provider instance using the system api key
const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Server Action to answer questions using vector search context.
 * @param question User input question string
 * @param projectId Project ID reference
 */
export async function askQuestion(question: string, projectId: string) {
    // 1. Authenticate user context
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    // 2. Query credit count and apply deduction limit
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < 10) {
        throw new Error(`Insufficient credits: You need 10 credits to ask a question. You currently have ${user?.credits ?? 0} credits. Please top up on the Billing page.`);
    }

    // Deduct 10 credits from database user record
    await db.user.update({
        where: { id: userId },
        data: { credits: { decrement: 10 } }
    });

    // Initialize streamable channel to allow Next.js server component to stream responses
    const stream = createStreamableValue()

    // 3. Generate query embeddings
    const queryVector = await generateEmbedding(question)
    const vectorQuery = `[${queryVector.join(",")}]`

    // 4. Query PostgreSQL database using pgvector cosine similarity search
    const rawResult = await db.$queryRaw`
    SELECT "fileName" , "sourceCode" , "summary",
    1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
    FROM "SourceCodeEmbeddings"
    WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.55
    AND "projectId" = ${projectId}
    ORDER BY similarity DESC
    LIMIT 7
    ` as { fileName: string, sourceCode: string, summary: string, similarity: number }[]

    // 5. Apply dynamic relative similarity filter
    // Prevents low-scoring noise files from diluting context if we have highly-relevant files.
    let result = rawResult;
    if (rawResult.length > 0 && rawResult[0]) {
        const topSimilarity = rawResult[0].similarity;
        const relativeThreshold = Math.max(0.55, topSimilarity - 0.12);
        result = rawResult.filter(doc => doc.similarity >= relativeThreshold);
    }

    // 6. Map context data block string
    let context = ''
    for (const doc of result) {
        context += `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\n summary of file: ${doc.summary}\n\n`
    }

    // 7. Invoke async generator stream to output tokens
    (async () => {
        const { textStream } = await streamText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: `
            You are a ai code assistant who answers questions about the codebase. Your target audience is a technical intern who is new to the codebase.
            AI assistant is a brand new, powerful, human-like artificial intelligence.
            The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
            AI is a well-behaved and well-mannered individual.
            AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
            AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in the world.
            If the question is asking about code or a specific file, AI will provide the detailed answer, giving step by step instructions.
            START CONTEXT BLOCK
            ${context}
            END CONTEXT BLOCK
            
            START QUESTION
            ${question}
            END QUESTION
            AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
            If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I cannot answer this question because the codebase does not contain the required information."
            AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
            AI assistant will not invent anything that is not drawn directly from the context.
            Answer in markdown syntax with code snippets if needed. Do as detailed as possible when answering, make sure to specify which file the code snippets are in.
            `
        })

        for await (const delta of textStream) {
            stream.update(delta)
        }

        stream.done()
    })()

    return {
        output: stream.value,
        filesReferences: result
    }
}

