/**
 * @file src/lib/gemini.ts
 * @description Integrates Google Gemini API for commit summaries, file onboarding explanations, and vector embeddings.
 * 
 * WHY IT'S NEEDED:
 * Standardizes AI features like indexing codebase vectors (used in RAG Q&A) and generating text descriptions of changes.
 * 
 * FLOW OF EXECUTION:
 * 1. `retryWithBackoff(fn)`: A wrapper around Gemini calls. If it encounters a 429 rate limit (RESOURCE_EXHAUSTED),
 *    it parses the wait duration from the API error message, applies a random jitter buffer, and retries.
 * 2. `aisummariseCommit(diff)`: Sends a code diff block to `gemini-2.0-flash` to get a structured bulleted summary.
 * 3. `summariseCode(doc)`: Summarizes source files to under 100 words in an onboarding tone.
 * 4. `generateEmbedding(summary)`: Translates text into a 768-dimensional float array using `gemini-embedding-2`.
 * 
 * CONNECTIONS:
 * - `generateEmbedding` is imported by `src/app/(protected)/dashboard/action.ts` to vectorize user questions.
 * - Used during repository indexing (`src/lib/github-loaders.ts`) and commit parsing (`src/lib/github.ts`).
 */

import { GoogleGenAI } from '@google/genai';
import { Document } from '@langchain/core/documents';

// Instantiate GoogleGenAI SDK (will read standard GEMINI_API_KEY environment variable)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Robust retry wrapper with exponential backoff designed to handle Gemini API rate limits (429).
 * Dynamically parses the required wait time (e.g. "Please retry in X.XXs") from the API error message.
 * Also introduces random jitter to stager parallel query limits.
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 10, delay = 5000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        const isRateLimit = error?.status === 429 ||
            errorMsg.includes("RESOURCE_EXHAUSTED") ||
            errorMsg.includes("quota");

        if (retries > 0 && isRateLimit) {
            let waitTime = delay;
            // Extract the API's recommended retry delay dynamically (e.g. "Please retry in 29.5s")
            const match = errorMsg.match(/Please retry in ([\d\.]+)s/);
            if (match && match[1]) {
                // Parse delay in seconds, convert to ms, and add a 1-second safety buffer
                waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
            }

            // Add random jitter (1 to 5 seconds) to stagger retries and prevent "thundering herd" collisions
            const jitter = Math.random() * 4000 + 1000;
            const totalWait = waitTime + jitter;

            console.warn(`Gemini rate limit hit. Waiting ${(totalWait / 1000).toFixed(2)}s before retrying... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, totalWait));
            return retryWithBackoff(fn, retries - 1, delay * 1.5);
        }
        throw error;
    }
}

/**
 * Summarizes a git diff using the gemini-2.0-flash model.
 * Gives structured bullet points with changed file references.
 * @param diff The raw git diff output string
 */
export const aisummariseCommit = async (diff: string) => {
    try {
        const response = await retryWithBackoff(() => ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `You are an expert programmer, and you are trying to summarize a git diff.
Reminders about the git diff format:
For every file, there are a few metadata lines, like (for example):
\`\`\`
diff --git a/lib/index.js b/lib/index.js
index aadf691..bfef803 106044
--- a/lib/index.js
+++ b/lib/index.js
\`\`\`
This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
Then there is a specifier of the lines that were modified.
A line starting with \`+\` means it was added.
A line starting with \`-\` means it was deleted.
A line that starts with neither \`+\` nor \`-\` is code given for context and better understanding.
It is not part of the diff.
[...]
EXAMPLE SUMMARY COMMENTS:
\`\`\`
* Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
* Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
* Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
* Added an OpenAI API for completions [packages/utils/apis/openai.ts]
* Lowered numeric tolerance for test files
\`\`\`
Most commits will have less comments than this examples list.
The last comment does not include the file names,
because there were more than two relevant files in the hypothetical commit.
Do not include parts of the example in your summary.
It is given only as an example of appropriate comments.`
                        },
                        {
                            text: `Please summarise the following diff file: \n\n${diff}`
                        }
                    ]
                }
            ]
        }));

        return response.text ?? "";
    } catch (error) {
        console.error("Gemini AI summarization failed:", error);
        return "";
    }
}

/**
 * Creates a brief, junior-developer onboarding summary of code files using gemini-2.0-flash.
 * Limited to 10,000 characters of input code to stay within limits.
 * @param doc LangChain Document containing the source code and file metadata.
 */
export async function summariseCodeGemini(doc: Document): Promise<string> {
    try {
        const code = doc.pageContent.slice(0, 10000); // Limit to 10000 characters
        const response = await retryWithBackoff(() => ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects.
You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file.
Here is the code:
---
${code}
---
Give a summary no more than 100 words of the code above.`
                        }
                    ]
                }
            ]
        }));

        return response.text ?? "";
    } catch (error) {
        console.error("Gemini AI code summarization failed:", error);
        return "";
    }
}

// Alias export for consistency with Groq loader integration
export const summariseCode = summariseCodeGemini;

/**
 * Generates a 768-dimensional float embedding vector of a text string.
 * @param summary String context (e.g. codebase summaries or user Q&A queries)
 */
export async function generateEmbedding(summary: string) {
    // Avoid API crash (400) if summary text is empty
    if (!summary || summary.trim() === "") {
        console.warn("Skipping embedding generation: Input summary is empty.");
        return [];
    }

    try {
        const response = await retryWithBackoff(() => ai.models.embedContent({
            model: "gemini-embedding-2",
            contents: summary,
            config: {
                outputDimensionality: 768,
            }
        }));

        return response.embeddings?.[0]?.values ?? [];
    } catch (error) {
        console.error("Gemini AI embedding generation failed:", error);
        return [];
    }
}