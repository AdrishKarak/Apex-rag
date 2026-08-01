"use server";
import { streamText } from "ai";
import { createStreamableValue } from '@ai-sdk/rsc'
import { createGroq } from "@ai-sdk/groq"
import { generateEmbedding } from "@/lib/gemini";
import { db } from "@/server/db";


const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function askQuestion(question: string, projectId: string) {
    const stream = createStreamableValue()

    const queryVector = await generateEmbedding(question)
    const vectorQuery = `[${queryVector.join(",")}]`

    const result = await db.$queryRaw`
    SELECT "fileName" , "sourceCode" , "summary",
    1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
    FROM "SourceCodeEmbeddings"
    WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5
    AND "projectId" = ${projectId}
    ORDER BY similarity DESC
    LIMIT 7
    ` as { fileName: string, sourceCode: string, summary: string, similarity: number }[]

    let context = ''
    for (const doc of result) {
        context += `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\n summary of file: ${doc.summary}\n\n`
    }

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
