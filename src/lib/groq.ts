/**
 * @file src/lib/groq.ts
 * @description Inbound API connector to Groq's high-speed inference engine using LLaMA models.
 * 
 * WHY IT'S NEEDED:
 * Provides an alternative LLM pipeline to process file summaries and commit changes, bypassing Gemini limits.
 * 
 * FLOW OF EXECUTION:
 * 1. `callGroqChat(messages, model)`: Sends native HTTP fetch requests to Groq's API with deterministic parameters (temp 0.1).
 * 2. `retryWithBackoff(fn)`: Retries dynamically upon hitting a 429 status or parsing wait times from Groq exception messages.
 * 3. `summariseCodeGroq(doc)`: Summarizes source code using `llama-3.1-8b-instant` limited to 5k characters.
 * 4. `summariseCommit(diff)`: Summarizes git diff modifications using LLaMA systems prompts.
 * 
 * CONNECTIONS:
 * - Executed by the repository indexing pipeline in `src/lib/github-loaders.ts`.
 * - Commits are summarized via `summariseCommit` in `src/lib/github.ts`.
 */

import { Document } from '@langchain/core/documents';

/**
 * Standard utility to fetch chat completions from Groq's OpenAI-compatible API.
 * Uses native fetch to avoid dependencies and keep imports extremely clean.
 */
async function callGroqChat(messages: { role: string; content: string }[], model = "llama-3.3-70b-versatile"): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not defined in environment variables. Please add it to your .env file.");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.1, // Low temperature for deterministic/factual summaries
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

/**
 * Robust retry wrapper with exponential backoff and random jitter designed to handle Groq API rate limits (429).
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 10, delay = 2000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        const errorMsg = String(error?.message || error);
        // Groq rate limits can return 429 status code or mention rate limits / quota limits
        const isRateLimit = errorMsg.includes("429") || 
                            errorMsg.includes("rate limit") || 
                            errorMsg.includes("RESOURCE_EXHAUSTED") ||
                            errorMsg.includes("quota");
        
        if (retries > 0 && isRateLimit) {
            let waitTime = delay;
            // Groq error messages often say "try again in X.XXs"
            const match = errorMsg.match(/try again in ([\d\.]+)s/i);
            if (match && match[1]) {
                waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 500;
            }
            
            // Add random jitter to stagger retry requests
            const jitter = Math.random() * 2000 + 500;
            const totalWait = waitTime + jitter;

            console.warn(`Groq rate limit hit. Waiting ${(totalWait / 1000).toFixed(2)}s before retrying... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, totalWait));
            return retryWithBackoff(fn, retries - 1, delay * 1.5);
        }
        throw error;
    }
}

/**
 * Summarize a file's code content for onboarding description context using Groq.
 * @param doc LangChain Document representing a source code file.
 */
export async function summariseCodeGroq(doc: Document): Promise<string> {
    try {
        const code = doc.pageContent.slice(0, 5000); // Limit to 5k characters to stay within context and lower Token usage (TPM)
        const fileName = doc.metadata.source || "unknown";

        const summary = await retryWithBackoff(() => callGroqChat([
            {
                role: "system",
                content: "You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects. Your goal is to explain the purpose of files in a clean and concise manner."
            },
            {
                role: "user",
                content: `You are onboarding a junior software engineer and explaining to them the purpose of the ${fileName} file.\n\nHere is the code:\n---\n${code}\n---\nGive a summary no more than 100 words of the code above.`
            }
        ], "llama-3.1-8b-instant"));

        return summary;
    } catch (error) {
        console.error(`Groq code summarization failed for file ${doc.metadata.source || "unknown"}:`, error);
        return "";
    }
}

// Default export alias
export const summariseCode = summariseCodeGroq;

/**
 * Summarize a git diff commit message for log history using Groq.
 * @param diff The raw git diff output string
 */
export async function summariseCommit(diff: string): Promise<string> {
    try {
        const slicedDiff = diff.slice(0, 10000); // Slice diff to stay within context and limit token usage (TPM)
        const summary = await retryWithBackoff(() => callGroqChat([
            {
                role: "system",
                content: `You are an expert programmer, and you are trying to summarize a git diff.
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

EXAMPLE SUMMARY COMMENTS:
\`\`\`
* Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
* Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
* Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
* Added an OpenAI API for completions [packages/utils/apis/openai.ts]
* Lowered numeric tolerance for test files
\`\`\`
Most commits will have less comments than this examples list.
The last comment does not include the file names, because there were more than two relevant files in the hypothetical commit.
Do not include parts of the example in your summary. It is given only as an example of appropriate comments.`
            },
            {
                role: "user",
                content: `Please summarise the following diff file:\n\n${slicedDiff}`
            }
        ], "llama-3.1-8b-instant"));

        return summary;
    } catch (error) {
        console.error("Groq commit summarization failed:", error);
        return "";
    }
}

