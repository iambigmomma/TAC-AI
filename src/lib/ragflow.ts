import axios from 'axios';
import {
  getRagflowApiKey,
  getRagflowApiUrl,
  getRagflowChatId, // Use Chat ID (Assistant ID from UI)
} from './config';
import { EventEmitter, Readable } from 'stream';
import db from '@/lib/db'; // Import db
import { chats } from '@/lib/db/schema'; // Import chats schema
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto'; // Import randomUUID
import {
  RagflowReference,
  // Re-add types needed for temporary stream parsing
  RagflowStreamChunk,
  RagflowCompletionData,
  // RagflowDocAgg, // Not needed directly here
} from './types'; // Import shared types

// Interface for the non-streaming completion response data field
interface RagflowNonStreamData {
  answer: string;
  reference: RagflowReference; // References are included directly
  session_id: string;
  // Other potential fields like 'created_at', 'latency' might exist
}

// Interface for the overall non-streaming response
interface RagflowNonStreamResponse {
  code: number;
  message: string;
  data: RagflowNonStreamData;
}

// Remove the hardcoded opener message
// const RAGFLOW_OPENER_MESSAGE = ...;

// Modify the main export function signature - NO LONGER RETURNS ReadableStream
export const getRagflowChatCompletionNonStream = async (
  appChatId: string,
  query: string,
): Promise<{ content: string; references: RagflowReference | null }> => {
  // Call the refactored async logic function
  return startRagflowProcessingNonStream(appChatId, query);
};

// Renamed async function to contain the main non-streaming logic
async function startRagflowProcessingNonStream(
  appChatId: string,
  query: string,
): Promise<{ content: string; references: RagflowReference | null }> {
  const apiUrl = getRagflowApiUrl();
  const apiKey = getRagflowApiKey();
  const ragflowChatAssistantId = getRagflowChatId();

  if (!apiUrl || !apiKey || !ragflowChatAssistantId) {
    throw new Error('Missing RAGflow configuration.');
  }

  const endpoint = `${apiUrl}/api/v1/chats/${ragflowChatAssistantId}/completions`;
  let knownRagflowSessionId: string | null = null;
  let finalAnswer: string = '';
  let finalReferences: RagflowReference | null = null;

  try {
    // 1. Check DB for existing session ID (same as before)
    const chatRecord = await db.query.chats.findFirst({
      where: eq(chats.id, appChatId),
      columns: { ragflowSessionId: true },
    });
    knownRagflowSessionId = chatRecord?.ragflowSessionId || null;

    let sessionIdToUse = knownRagflowSessionId;

    if (!sessionIdToUse) {
      // --- CREATE NEW SESSION (Use streaming temporarily to get ID) ---
      console.log(
        `No RAGflow session ID for ${appChatId}. Creating new session via stream...`,
      );

      // Promise to handle the initial stream for session ID extraction
      const newSessionId = await new Promise<string>(
        async (resolve, reject) => {
          try {
            const firstResponse = await axios.post(
              endpoint,
              { question: query, stream: true }, // Use stream: true for first call
              {
                headers: { Authorization: `Bearer ${apiKey}` },
                responseType: 'stream',
                timeout: 30000, // Shorter timeout is ok for getting session ID
              },
            );

            const firstStream = firstResponse.data as Readable;
            let sessionIdFound: string | null = null;
            let resolved = false;
            let buffer = '';

            const onData = (chunk: Buffer) => {
              if (resolved) return;
              buffer += chunk.toString('utf-8');
              let nextMessageIndex;
              // Use the same reliable parsing logic as before for stream chunks
              while (
                (nextMessageIndex = buffer.indexOf('\ndata:')) !== -1 ||
                (buffer.startsWith('data:') &&
                  buffer.indexOf('\ndata:', 5) === -1) ||
                (buffer.startsWith('data:') &&
                  buffer.indexOf('\ndata:', 5) !== -1)
              ) {
                let messageEndIndex;
                let startIndex = buffer.startsWith('data:')
                  ? 5
                  : nextMessageIndex + 6;
                let nextDataPrefixIndex = buffer.indexOf('\ndata:', startIndex);
                messageEndIndex =
                  nextDataPrefixIndex !== -1
                    ? nextDataPrefixIndex
                    : buffer.length;

                const jsonStr = buffer
                  .substring(startIndex, messageEndIndex)
                  .trim();
                const processedLength = messageEndIndex;

                if (!jsonStr) {
                  buffer = buffer.substring(processedLength);
                  continue;
                }

                try {
                  // Use RagflowStreamChunk and RagflowCompletionData types here
                  const parsed: RagflowStreamChunk = JSON.parse(jsonStr);
                  if (
                    typeof parsed.data === 'object' &&
                    (parsed.data as RagflowCompletionData).session_id
                  ) {
                    sessionIdFound = (parsed.data as RagflowCompletionData)
                      .session_id;
                    // Ensure sessionIdFound is not null before resolving
                    if (sessionIdFound) {
                      console.log(
                        '[Stream Extraction] Found session ID:',
                        sessionIdFound,
                      );
                      resolved = true;
                      firstStream.destroy(); // Destroy stream once ID is found
                      resolve(sessionIdFound); // Now guaranteed to be string
                      return;
                    } else {
                      // Should not happen if session_id exists, but good practice
                      console.warn(
                        '[Stream Extraction] session_id found but was null/empty?',
                      );
                    }
                  }
                } catch (e) {
                  /* Ignore parse errors, wait for session ID chunk */
                }
                buffer = buffer.substring(processedLength);
                if (buffer.startsWith('\n')) buffer = buffer.substring(1); // Clean leading newline if any
              }
            };

            const onEnd = () => {
              if (!resolved) {
                resolved = true;
                firstStream.destroy();
                reject(new Error('RAGflow stream ended without session ID.'));
              }
            };
            const onError = (err: Error) => {
              if (!resolved) {
                resolved = true;
                firstStream.destroy();
                reject(err);
              }
            };

            firstStream.on('data', onData);
            firstStream.on('end', onEnd);
            firstStream.on('error', onError);

            // Safety timeout
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                firstStream.destroy();
                reject(new Error('Timeout waiting for RAGflow session ID'));
              }
            }, 30000);
          } catch (firstCallError) {
            console.error(
              '[Stream Extraction] Error on initial stream call:',
              firstCallError,
            );
            reject(firstCallError); // Reject promise if axios call fails
          }
        },
      ); // End of Promise for session ID extraction

      // Assign the obtained session ID
      sessionIdToUse = newSessionId;
      console.log(`Obtained new RAGflow session ID: ${sessionIdToUse}`);

      // Save the new session ID to DB (now we should have a valid ID)
      await db
        .update(chats)
        .set({ ragflowSessionId: sessionIdToUse })
        .where(eq(chats.id, appChatId))
        .execute();
      console.log(`Saved session ID ${sessionIdToUse} for chat ${appChatId}`);

      // --- NOW MAKE THE SECOND CALL (Non-streaming) to get the actual content ---
      console.log(
        `Making second call (non-stream) with session ID: ${sessionIdToUse}`,
      );
      const secondResponse = await axios.post<RagflowNonStreamResponse>(
        endpoint,
        {
          question: query,
          stream: false, // Explicitly false for the content call
          session_id: sessionIdToUse,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          responseType: 'json',
          timeout: 180000, // Allow longer timeout for full answer
        },
      );

      if (secondResponse.data.code !== 0) {
        throw new Error(
          `RAGflow API error on second call: ${secondResponse.data.message}`,
        );
      }
      finalAnswer = secondResponse.data.data.answer;
      finalReferences = secondResponse.data.data.reference;
    } else {
      // --- USE EXISTING SESSION (Non-streaming) ---
      console.log(`Using existing RAGflow session ID: ${sessionIdToUse}`);
      const response = await axios.post<RagflowNonStreamResponse>(
        endpoint,
        {
          question: query,
          stream: false, // Set stream to false
          session_id: sessionIdToUse,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          responseType: 'json', // Expect JSON response now
          timeout: 180000, // Potentially long timeout needed
        },
      );

      if (response.data.code !== 0) {
        throw new Error(`RAGflow API error: ${response.data.message}`);
      }

      // Extract content and references from the single response
      finalAnswer = response.data.data.answer;
      finalReferences = response.data.data.reference;
    }

    return {
      content: finalAnswer,
      references: finalReferences,
    };
  } catch (error) {
    console.error(`Error in RAGflow non-stream processing:`, error);
    let errorMessage = `Failed to get completion: ${(error as Error).message}`;
    if (axios.isAxiosError(error) && !error.response) {
      errorMessage = `Network error contacting RAGflow: ${error.message}`;
    } else if (axios.isAxiosError(error) && error.response) {
      console.error('RAGflow API Error Response:', error.response?.data);
      // Try to parse error details if available in non-streaming error
      const ragflowErrorMsg =
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data
          ? error.response.data.message
          : error.response?.statusText;
      errorMessage = `RAGflow API error: ${ragflowErrorMsg}`;
    }
    // Throw the error to be handled by the API route
    throw new Error(errorMessage);
  }
}

// Remove getRagflowAgentCompletion if it exists
/*
export const getRagflowAgentCompletion = async (
  // ... old implementation ...
) => {};
*/
