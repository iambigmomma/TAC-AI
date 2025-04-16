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
  RagflowReferenceChunk,
  RagflowDocAgg,
} from './types'; // Import shared types

// Interface for the completion response data field
interface RagflowCompletionData {
  answer: string;
  session_id: string;
  reference?: RagflowReference; // Add optional reference field
}

// Interface for the overall streaming chunk
interface RagflowStreamChunk {
  code: number;
  message: string;
  data: RagflowCompletionData | boolean; // Can be boolean(true) for end signal
}

// Remove the hardcoded opener message
// const RAGFLOW_OPENER_MESSAGE = ...;

// Function to process the actual RAGflow response stream and forward to frontend
const processRagflowStream = (
  ragflowResponseStream: Readable,
  controller: ReadableStreamDefaultController<any>, // Pass the controller
  messageId: string, // Pass the messageId for messageEnd event
  appChatId: string,
  initialSessionId: string | null, // Used to know if we need to save a new ID
) => {
  let buffer = '';
  let firstChunkProcessed = !initialSessionId; // Consider first chunk processed if session existed
  let savedSessionId = initialSessionId;
  let lastReferenceData: RagflowReference | null = null; // Track the last reference object

  ragflowResponseStream.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf-8');
    // console.log('--- Buffer Updated ---\n', buffer, '\n--- End Buffer ---'); // Debug log

    let nextMessageIndex;
    while (
      (nextMessageIndex = buffer.indexOf('\ndata:')) !== -1 ||
      (buffer.startsWith('data:') && buffer.indexOf('\ndata:', 5) === -1) || // Handle single message case
      (buffer.startsWith('data:') && buffer.indexOf('\ndata:', 5) !== -1) // Handle first message when multiple exist
    ) {
      let messageEndIndex;
      let startIndex = buffer.startsWith('data:') ? 5 : nextMessageIndex + 6; // 6 is length of '\ndata:'
      let nextDataPrefixIndex = buffer.indexOf('\ndata:', startIndex);

      // Determine the end of the current message block
      if (nextDataPrefixIndex !== -1) {
        messageEndIndex = nextDataPrefixIndex;
      } else {
        // If no more '\ndata:' prefixes, the rest of the buffer is the potential message
        messageEndIndex = buffer.length;
      }

      const jsonStr = buffer.substring(startIndex, messageEndIndex).trim();
      const processedLength =
        buffer.startsWith('data:') && nextMessageIndex === -1
          ? buffer.length
          : messageEndIndex;

      if (!jsonStr) {
        // If jsonStr is empty, it means we likely just have delimiters
        // Remove the processed part from buffer and continue
        buffer = buffer.substring(processedLength);
        continue;
      }

      try {
        // Attempt to parse the extracted JSON string
        const parsedChunk: RagflowStreamChunk = JSON.parse(jsonStr);
        console.log('Successfully parsed RAGflow chunk:', parsedChunk);

        // --- Process the valid parsedChunk ---
        if (parsedChunk.code !== 0) {
          // ... handle error chunk ...
          controller.error(
            new Error(parsedChunk.message || 'RAGflow stream error'),
          );
          // Potentially stop processing further? Or just log?
          // Depending on the error code, we might want to break the loop or stop the stream.
        } else if (
          typeof parsedChunk.data === 'boolean' &&
          parsedChunk.data === true
        ) {
          console.log('RAGflow boolean end signal received.');
          // This might indicate the end, but we rely on the stream 'end' event primarily
        } else if (typeof parsedChunk.data === 'object') {
          const completionData = parsedChunk.data as RagflowCompletionData;
          // Save session ID
          if (!firstChunkProcessed && completionData.session_id) {
            if (!initialSessionId) {
              savedSessionId = completionData.session_id;
              console.log(
                `Received new RAGflow session ID: ${savedSessionId}, saving...`,
              );
              db.update(chats)
                .set({ ragflowSessionId: savedSessionId })
                .where(eq(chats.id, appChatId))
                .execute()
                .catch((dbError) =>
                  console.error('DB update error saving session ID:', dbError),
                );
            }
            firstChunkProcessed = true;
          }
          // Emit response/references
          if (completionData.answer) {
            const messageChunkString =
              JSON.stringify({
                type: 'message',
                data: completionData.answer,
                messageId, // Include messageId here
              }) + '\n';
            controller.enqueue(messageChunkString);
          }
          // --- Store Last Reference (DON'T EMIT YET) ---
          if (completionData.reference) {
            // Check if reference object exists
            if (completionData.reference.chunks?.length > 0) {
              // Valid reference with chunks found
              // console.log('Storing last reference data:', completionData.reference);
              lastReferenceData = completionData.reference; // Assign the valid object
            } else {
              // Explicitly set to null if the reference object itself is null
              // or if it exists but has no chunks (shouldn't happen based on RAGflow, but safe)
              lastReferenceData = null;
            }
          } else {
            // Explicitly set to null if the reference object itself is null
            // or if it exists but has no chunks (shouldn't happen based on RAGflow, but safe)
            lastReferenceData = null;
          }
        }
        // --- End processing valid chunk ---

        // Remove the successfully processed message from the buffer
        buffer = buffer.substring(processedLength);
      } catch (e) {
        // JSON parsing failed - likely an incomplete message
        // console.error('Incomplete JSON chunk, waiting for more data. Buffer:', buffer); // Debug log
        // console.error('Failed segment:', jsonStr); // Debug log
        // Break the inner loop and wait for the next 'data' event to append more data
        break;
      }
    }
  });

  ragflowResponseStream.on('end', () => {
    console.log('[RAGflow Stream] Original stream ended.');
    // Emit the last valid reference data collected, if any
    if (lastReferenceData) {
      const referenceEventString =
        JSON.stringify({
          type: 'references',
          data: lastReferenceData,
        }) + '\n';
      console.log(
        '[RAGflow Stream] Attempting to enqueue final references:',
        referenceEventString,
      );
      try {
        controller.enqueue(referenceEventString);
        console.log('[RAGflow Stream] Successfully enqueued final references.');
      } catch (e) {
        console.error('[RAGflow Stream] Error enqueuing final references:', e);
      }
    }
    // Always emit messageEnd after potentially sending references
    const messageEndEventString =
      JSON.stringify({ type: 'messageEnd', messageId }) + '\n';
    console.log(
      '[RAGflow Stream] Attempting to enqueue messageEnd:',
      messageEndEventString,
    );
    try {
      controller.enqueue(messageEndEventString);
      console.log('[RAGflow Stream] Successfully enqueued messageEnd.');
    } catch (e) {
      console.error('[RAGflow Stream] Error enqueuing messageEnd:', e);
    }

    // Close the new stream
    console.log('[RAGflow Stream] Closing the controller.');
    controller.close();
  });

  ragflowResponseStream.on('error', (streamError: Error) => {
    console.error('RAGflow stream error for frontend:', streamError);
    controller.error(streamError);
  });
};

// Main function called by the API route
export const getRagflowChatCompletion = (
  appChatId: string,
  query: string,
): ReadableStream => {
  const apiUrl = getRagflowApiUrl();
  const apiKey = getRagflowApiKey();
  const ragflowChatAssistantId = getRagflowChatId();

  // Generate a message ID for the assistant's response *once*
  const messageId = randomUUID();

  let controller: ReadableStreamDefaultController<any>;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      // Start the async operation *after* the stream is created and controller is assigned
      startRagflowProcessing(appChatId, query, controller, messageId).catch(
        (err) => {
          console.error('[RAGflow Start] Error starting processing:', err);
          try {
            // Try to signal the error through the stream
            controller.enqueue(
              JSON.stringify({
                type: 'error',
                data: `Stream initialization failed: ${(err as Error).message}`,
              }) + '\n',
            );
            controller.close();
          } catch (e) {
            console.error('Failed to enqueue initialization error:', e);
          }
        },
      );
    },
    cancel(reason) {
      console.log('[RAGflow Stream] Stream cancelled by consumer:', reason);
      // Here you might want to add logic to abort ongoing axios requests if possible
    },
  });

  return stream;
};

// New async function to contain the main logic, allowing stream creation first
async function startRagflowProcessing(
  appChatId: string,
  query: string,
  controller: ReadableStreamDefaultController<any>,
  messageId: string, // Receive messageId
) {
  const apiUrl = getRagflowApiUrl();
  const apiKey = getRagflowApiKey();
  const ragflowChatAssistantId = getRagflowChatId();

  if (!apiUrl || !apiKey || !ragflowChatAssistantId) {
    throw new Error('Missing RAGflow configuration.');
  }

  const endpoint = `${apiUrl}/api/v1/chats/${ragflowChatAssistantId}/completions`;
  let knownRagflowSessionId: string | null = null;

  try {
    // 1. Check DB for existing session ID
    const chatRecord = await db.query.chats.findFirst({
      where: eq(chats.id, appChatId),
      columns: { ragflowSessionId: true },
    });
    knownRagflowSessionId = chatRecord?.ragflowSessionId || null;

    if (knownRagflowSessionId) {
      // --- EXISTING SESSION ---
      console.log(
        `Using existing RAGflow session ID: ${knownRagflowSessionId}`,
      );
      const response = await axios.post(
        endpoint,
        {
          question: query,
          stream: true,
          session_id: knownRagflowSessionId,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          responseType: 'stream',
          timeout: 180000,
        },
      );
      // Process this stream directly for the frontend
      processRagflowStream(
        response.data as Readable,
        controller, // Pass controller
        messageId, // Pass messageId
        appChatId,
        knownRagflowSessionId,
      );
    } else {
      // --- NEW SESSION ---
      console.log(
        `No RAGflow session ID for ${appChatId}. Creating new session first...`,
      );

      // Make the first call ONLY to create the session and get the ID
      const firstCallPromise = new Promise<string>(async (resolve, reject) => {
        try {
          const firstResponse = await axios.post(
            endpoint,
            { question: query, stream: true }, // No session_id
            {
              headers: { Authorization: `Bearer ${apiKey}` },
              responseType: 'stream',
              timeout: 30000, // Shorter timeout for session creation
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
              if (nextDataPrefixIndex !== -1) {
                messageEndIndex = nextDataPrefixIndex;
              } else {
                messageEndIndex = buffer.length;
              }
              const jsonStr = buffer
                .substring(startIndex, messageEndIndex)
                .trim();
              const processedLength =
                buffer.startsWith('data:') && nextMessageIndex === -1
                  ? buffer.length
                  : messageEndIndex;

              if (!jsonStr) {
                buffer = buffer.substring(processedLength);
                continue;
              }

              try {
                const parsed: RagflowStreamChunk = JSON.parse(jsonStr);
                if (typeof parsed.data === 'object' && parsed.data.session_id) {
                  sessionIdFound = parsed.data.session_id;
                  resolved = true;
                  firstStream.destroy();
                  resolve(sessionIdFound);
                  return;
                }
              } catch (e) {
                /* Ignore parse errors */
              }
              buffer = buffer.substring(processedLength);
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

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              firstStream.destroy();
              reject(new Error('Timeout waiting for RAGflow session ID'));
            }
          }, 30000);
        } catch (firstCallError) {
          reject(firstCallError);
        }
      });

      // Await the session ID extraction and saving
      const newSessionId = await firstCallPromise;
      console.log(`Obtained and saved new RAGflow session ID: ${newSessionId}`);

      // Now make the SECOND call with the new session ID
      console.log(`Making second call with session ID: ${newSessionId}`);
      const secondResponse = await axios.post(
        endpoint,
        {
          question: query,
          stream: true,
          session_id: newSessionId,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          responseType: 'stream',
          timeout: 180000,
        },
      );
      // Process *this* stream for the frontend
      processRagflowStream(
        secondResponse.data as Readable,
        controller, // Pass controller
        messageId, // Pass messageId
        appChatId,
        newSessionId,
      );
    }
  } catch (error) {
    console.error(`Error in getRagflowChatCompletion orchestration:`, error);
    let errorMessage = `Failed to get completion: ${(error as Error).message}`;
    if (axios.isAxiosError(error) && !error.response) {
      errorMessage = `Network error contacting RAGflow: ${error.message}`;
    } else if (axios.isAxiosError(error) && error.response) {
      console.error('RAGflow API Error Response:', error.response?.data);
      errorMessage = `RAGflow API error: ${error.response?.statusText}`;
    }
    // Use controller to signal the error
    try {
      controller.enqueue(
        JSON.stringify({ type: 'error', data: errorMessage }) + '\n',
      );
      controller.close();
    } catch (e) {
      console.error('Failed to enqueue orchestration error:', e);
    }
  }
}

// Remove getRagflowAgentCompletion if it exists
/*
export const getRagflowAgentCompletion = async (
  // ... old implementation ...
) => {};
*/
