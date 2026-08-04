/**
 * @file src/lib/assembly.ts
 * @description Background processing worker that transcribes and summarizes meeting audio files.
 * 
 * WHY IT'S NEEDED:
 * Automatically processes team audio calls uploaded via the meetings interface, generating structured summaries (Issues)
 * map-linked to specific timestamps in the transcript.
 * 
 * FLOW OF EXECUTION:
 * 1. `processMeeting(meetingId, meetingUrl)`: Triggered as a background promise.
 * 2. Uses AssemblyAI Universal speech models to transcribe the file with speaker labels enabled.
 * 3. Fetches the structured paragraphs transcript.
 * 4. `getChunkCount(audioDuration)`: Determines how many chunks to segment the audio into.
 * 5. `chunkParagraphs(...)`: Segments the paragraphs list into balanced group arrays.
 * 6. `summarizeChunk(...)`: Sends each group text block to the AssemblyAI LLM gateway (configured with `gemini-2.0-flash`)
 *    demanding structured JSON containing a headline, summary, and gist.
 * 7. Stores each compiled summary inside the `Issue` model table linked to the parent `Meeting`.
 * 8. Updates the `Meeting` status to `COMPLETED` when successfully processed.
 * 
 * CONNECTIONS:
 * - Spawned asynchronously by the `uploadMeeting` mutation in `src/server/api/routers/project.ts`.
 * - Populates timelines displayed by meeting detail views.
 */

import { AssemblyAI } from 'assemblyai';
import { db } from '@/server/db';

// Initialize the AssemblyAI SDK client using the environment token
const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

/**
 * Determines how many summary chunks to create based on audio duration.
 * Short audio → 1 summary, longer audio → more granular sections.
 */
function getChunkCount(audioDurationSeconds: number): number {
    const minutes = audioDurationSeconds / 60;

    if (minutes < 5) return 1;
    if (minutes < 15) return Math.min(3, Math.ceil(minutes / 5));
    if (minutes < 30) return Math.min(5, Math.ceil(minutes / 6));
    return Math.ceil(minutes / 7);
}

/**
 * Splits an array of paragraphs into roughly equal chunks.
 */
function chunkParagraphs<T>(paragraphs: T[], chunkCount: number): T[][] {
    if (paragraphs.length === 0) return [];
    const actualChunks = Math.min(chunkCount, paragraphs.length);
    const chunkSize = Math.ceil(paragraphs.length / actualChunks);
    const result: T[][] = [];

    for (let i = 0; i < paragraphs.length; i += chunkSize) {
        result.push(paragraphs.slice(i, i + chunkSize));
    }

    return result;
}

/**
 * Format milliseconds to a human-readable time string (e.g., "02:34").
 */
function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface SummaryResult {
    headline: string;
    summary: string;
    gist: string;
}

/**
 * Calls the AssemblyAI LLM Gateway to summarize a transcript chunk.
 * Enforces structured JSON output.
 */
async function summarizeChunk(
    chunkText: string,
    chunkIndex: number,
    totalChunks: number
): Promise<SummaryResult> {
    const apiKey = process.env.ASSEMBLYAI_API_KEY!;

    const systemPrompt = totalChunks === 1
        ? `You are an expert meeting analyst. Summarize the following meeting transcript. 
Provide your response in EXACTLY this JSON format with no additional text:
{"headline": "A concise, descriptive headline (max 10 words)", "summary": "A detailed 3-5 sentence summary of the key points discussed", "gist": "A one-sentence overview"}`
        : `You are an expert meeting analyst. Summarize section ${chunkIndex + 1} of ${totalChunks} from a meeting transcript.
Provide your response in EXACTLY this JSON format with no additional text:
{"headline": "A concise, descriptive headline for this section (max 10 words)", "summary": "A detailed 3-5 sentence summary of what was discussed in this section", "gist": "A one-sentence overview of this section"}`;

    // Request Groq/Gemini synthesis via AssemblyAI LLM Gateway
    const response = await fetch('https://llm-gateway.assemblyai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gemini-2.0-flash',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: chunkText },
            ],
            max_tokens: 500,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM Gateway error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    try {
        // Try to parse the JSON response directly
        const parsed = JSON.parse(content);
        return {
            headline: parsed.headline || 'Meeting Section',
            summary: parsed.summary || content,
            gist: parsed.gist || '',
        };
    } catch {
        // If JSON parsing fails, extract what we can as text fallback
        return {
            headline: `Meeting Section ${chunkIndex + 1}`,
            summary: content,
            gist: content.slice(0, 120),
        };
    }
}

/**
 * Main processing pipeline:
 * 1. Transcribe audio using AssemblyAI SDK
 * 2. Chunk transcript based on audio duration
 * 3. Summarize each chunk via LLM Gateway
 * 4. Save results as Issue records
 * 5. Update meeting status to COMPLETED
 */
export async function processMeeting(meetingId: string, meetingUrl: string): Promise<void> {
    try {
        console.log(`[AssemblyAI] Starting transcription for meeting: ${meetingId}`);

        // 1. Transcribe the audio
        const transcript = await client.transcripts.transcribe({
            audio: meetingUrl,
            speech_models: ['universal-3-5-pro', 'universal-2'],
            speaker_labels: true,
        });

        if (transcript.status === 'error') {
            throw new Error(`Transcription failed: ${transcript.error}`);
        }

        console.log(`[AssemblyAI] Transcription completed for meeting: ${meetingId}, duration: ${transcript.audio_duration}s`);

        // 2. Fetch paragraphs for structured chunking
        const paragraphsResponse = await client.transcripts.paragraphs(transcript.id);
        const paragraphs = paragraphsResponse.paragraphs;

        if (!paragraphs || paragraphs.length === 0) {
            // If no paragraphs, create a single issue from the full text
            await db.issue.create({
                data: {
                    meetingId,
                    start: '00:00',
                    end: formatTime((transcript.audio_duration ?? 0) * 1000),
                    headline: 'Meeting Summary',
                    summary: transcript.text ?? 'No transcript available.',
                    gist: (transcript.text ?? '').slice(0, 120),
                },
            });

            await db.meeting.update({
                where: { id: meetingId },
                data: { status: 'COMPLETED' },
            });
            return;
        }

        // 3. Determine chunk count based on audio duration
        const audioDuration = transcript.audio_duration ?? 0;
        const chunkCount = getChunkCount(audioDuration);
        const chunks = chunkParagraphs(paragraphs, chunkCount);

        console.log(`[AssemblyAI] Processing ${chunks.length} chunks for meeting: ${meetingId}`);

        // 4. Summarize each chunk and save as Issue
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]!;
            const chunkText = chunk.map(p => p.text).join('\n');
            const startTime = formatTime(chunk[0]!.start);
            const endTime = formatTime(chunk[chunk.length - 1]!.end);

            try {
                const result = await summarizeChunk(chunkText, i, chunks.length);

                await db.issue.create({
                    data: {
                        meetingId,
                        start: startTime,
                        end: endTime,
                        headline: result.headline,
                        summary: result.summary,
                        gist: result.gist,
                    },
                });

                console.log(`[AssemblyAI] Saved chunk ${i + 1}/${chunks.length} for meeting: ${meetingId}`);
            } catch (chunkError) {
                console.error(`[AssemblyAI] Failed to summarize chunk ${i + 1} for meeting ${meetingId}:`, chunkError);

                // Save the raw transcript chunk as fallback
                await db.issue.create({
                    data: {
                        meetingId,
                        start: startTime,
                        end: endTime,
                        headline: `Section ${i + 1}`,
                        summary: chunkText.slice(0, 2000),
                        gist: chunkText.slice(0, 120),
                    },
                });
            }
        }

        // 5. Mark meeting as completed
        await db.meeting.update({
            where: { id: meetingId },
            data: { status: 'COMPLETED' },
        });

        console.log(`[AssemblyAI] Meeting processing completed: ${meetingId}`);
    } catch (error) {
        console.error(`[AssemblyAI] Failed to process meeting ${meetingId}:`, error);
        // Meeting stays in PROCESSING state for potential retry
        throw error;
    }
}

