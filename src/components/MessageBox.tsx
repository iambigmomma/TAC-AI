'use client';

/* eslint-disable @next/next/no-img-element */
import React, {
  MutableRefObject,
  useEffect,
  useState,
  Fragment,
  useMemo,
} from 'react';
import { Message } from './ChatWindow';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Disc3,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
  Loader2,
} from 'lucide-react';
import Markdown, { MarkdownToJSX } from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources, { type SourceMetadata } from './MessageSources';
import SearchImages from './SearchImages';
import SearchVideos from './SearchVideos';
import { useSpeech } from 'react-text-to-speech';
import ThinkBox from './ThinkBox';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import {
  type RagflowReference,
  type RagflowReferenceChunk,
  type RagflowDocAgg,
} from '@/lib/types';
import { useTypewriter } from '@/hooks/useTypewriter';

const ThinkTagProcessor = ({ children }: { children: React.ReactNode }) => {
  return <ThinkBox content={children as string} />;
};

const ClickableCitation = ({ number }: { number: string }) => {
  const num = parseInt(number);
  if (isNaN(num) || num <= 0) {
    return <span>[{number}]</span>; // Render as text if invalid
  }
  const targetId = `source-item-${num - 1}`; // ID corresponds to MessageSources item

  // Function to handle smooth scroll
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Optional: Add a temporary highlight effect
      element.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500');
      }, 1500); // Remove highlight after 1.5 seconds
    } else {
      // Log if the element wasn't found
      console.warn(
        `[ClickableCitation] Element with ID "${targetId}" not found.`,
      );
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="inline-block align-baseline bg-light-secondary dark:bg-dark-secondary text-blue-600 dark:text-blue-400 rounded px-1 py-0 mx-0.5 text-xs font-medium no-underline hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500"
      title={`Scroll to source ${num}`}
    >
      {num}
    </a>
  );
};

const MessageBox = ({
  message,
  messageIndex,
  history,
  loading,
  dividerRef,
  isLast,
  rewrite,
  sendMessage,
}: {
  message: Message;
  messageIndex: number;
  history: Message[];
  loading: boolean;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
  rewrite: (messageId: string) => void;
  sendMessage: (message: string) => void;
}) => {
  const [speechMessage, setSpeechMessage] = useState(() =>
    message.content.replace(/\\[\\d+\\]/g, ''),
  );

  // --- State for Loading Animation Text ---
  const loadingMessages = [
    'Analyzing request...',
    'Searching relevant documents...',
    'Compiling information...',
    'Generating answer...',
    'Please wait a moment...',
  ];
  const [currentLoadingMessageIndex, setCurrentLoadingMessageIndex] =
    useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (loading && isLast && message.role === 'assistant') {
      // Start cycling through messages when loading starts for the last assistant message
      intervalId = setInterval(() => {
        setCurrentLoadingMessageIndex(
          (prevIndex) => (prevIndex + 1) % loadingMessages.length,
        );
      }, 2500); // Change message every 2.5 seconds
    } else {
      // Reset index when loading stops or it's not the target message
      setCurrentLoadingMessageIndex(0);
    }

    // Cleanup interval on component unmount or when loading/isLast changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // Add message.role to dependencies to reset if role changes unexpectedly
  }, [loading, isLast, message.role, loadingMessages.length]);

  // --- End Loading Animation Text State ---

  useEffect(() => {
    setSpeechMessage(message.content.replace(/\\[\\d+\\]/g, ''));
  }, [message.content]);

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  // New component specifically for rendering the citation popover via Markdown override
  const CitationRenderer = ({ marker }: { marker?: string }) => {
    if (!marker) return null; // Handle case where marker might be missing

    const citationIndex = parseInt(marker.replace(/##|\$\$/g, ''), 10);
    // Use optional chaining here for safety
    const referenceChunk = message.references?.chunks?.[citationIndex];

    if (!referenceChunk) {
      // Render a non-interactive error indicator if chunk not found
      return (
        <span className="text-red-500 font-semibold">
          [?{citationIndex + 1}]
        </span>
      );
    }

    const hasSimilarity = (chunk: any): chunk is { similarity: number } => {
      return typeof chunk.similarity === 'number';
    };

    // Return the Popover structure directly, rendered as an inline span
    return (
      <Popover as="span" className="relative inline-block align-baseline">
        <PopoverButton className="inline-flex items-center justify-center align-middle bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full w-4 h-4 text-[10px] font-semibold mx-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 hover:bg-blue-200 dark:hover:bg-blue-800 -translate-y-0.5">
          {citationIndex + 1}
        </PopoverButton>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          {/* Render PopoverPanel as span, apply styling classes directly */}
          <PopoverPanel
            as="span"
            className="absolute block z-10 w-screen min-w-[320px] max-w-md px-4 mt-1 left-0 sm:px-0 lg:max-w-lg"
          >
            {/* Remove wrapping divs, apply styles to the panel span directly? */}
            {/* NOTE: Applying all styles directly to span might be tricky. Let's try keeping one inner div but ensure panel is span */}
            {/* Reverting Panel to div, keep Popover as span might be better? Let's try simplest: Panel as span, minimal inner structure */}
            <span className="block overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white dark:bg-gray-800 p-4">
              {/* Content inside uses spans */}
              {referenceChunk.document_name && (
                <span
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate"
                  title={referenceChunk.document_name}
                >
                  Document: {referenceChunk.document_name}
                </span>
              )}
              <span className="block text-sm text-gray-800 dark:text-gray-200 max-h-60 overflow-y-auto">
                {referenceChunk.content}
              </span>
              {hasSimilarity(referenceChunk) && (
                /* Keep p here as it's inside the styled span, not directly in Markdown's p */
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Similarity: {(referenceChunk.similarity * 100).toFixed(1)}%
                </p>
              )}
            </span>
          </PopoverPanel>
        </Transition>
      </Popover>
    );
  };

  // Update Markdown overrides to use the new CitationRenderer
  const markdownOverrides: MarkdownToJSX.Options = useMemo(
    () => ({
      overrides: {
        think: {
          component: ThinkTagProcessor,
        },
        // Override for the custom <citation> tag we'll insert
        citation: {
          component: ClickableCitation,
        },
        // RAGFlow citation override (keep existing logic)
        'citation-placeholder': {
          component: CitationRenderer,
          props: {
            references: message.references,
          },
        },
      },
    }),
    [message.references],
  ); // Dependencies might be needed if CitationRenderer relies on props/state

  // Prepare content string with <citation> tags
  const contentWithCitationTags = useMemo(() => {
    // Start with original content as default
    let processed = message.content || ''; // Ensure processed is always a string

    try {
      const citationRegex = new RegExp('\\[(\\d+)\\]', 'g');
      processed = processed.replace(citationRegex, (match, number) => {
        const num = parseInt(number);
        if (isNaN(num) || num <= 0) {
          console.warn(`[MessageBox] Invalid citation number found: ${number}`);
          return match; // Return original if invalid
        }
        // Check against sources if they exist
        if (message.sources && num <= message.sources.length) {
          // Ensure the tag name is spelled correctly: "citation"
          return `<citation number="${number}"></citation>`;
        } else {
          // Optionally log if source index is out of bounds
          // console.warn(`[MessageBox] Citation [${num}] out of bounds for sources length ${message.sources?.length}`);
          return match; // Return original if source doesn't exist for the number
        }
      });
    } catch (e) {
      console.error(
        '[MessageBox] Error during standard citation replacement:',
        e,
      );
      // On error, processed keeps its current value (potentially original or partially processed)
    }

    // Handle RAGflow placeholders AFTER standard replacement
    if (message.references) {
      try {
        const ragflowRegex = new RegExp('(##\\d+\\$$)', 'g');
        processed = processed.replace(ragflowRegex, (match) => {
          return `<citation-placeholder marker="${match}"></citation-placeholder>`;
        });
      } catch (e) {
        console.error(
          '[MessageBox] Error during RAGflow citation replacement:',
          e,
        );
        // On error, processed keeps its current value
      }
    }

    // Handle <think> tags (ensure they remain)
    if (processed.includes('<think>')) {
      const openThinkTag = processed.match(/<think>/g)?.length || 0;
      const closeThinkTag = processed.match(/<\/think>/g)?.length || 0;
      if (openThinkTag > closeThinkTag) {
        processed += '</think> <a> </a>';
      }
    }
    // Ensure a string is always returned
    // --- Add final cleanup step ---
    // Remove lines starting with "Source:" or "Soorce:" etc., often appearing at the end
    processed = processed
      .replace(/\n[\s]*(So?urce:|Sourcee:|Reference:)[^\n]+/g, (match) => {
        // Only remove if it looks like a source list item (contains [digit] or http)
        if (
          match.includes('[') ||
          match.includes(']') ||
          match.includes('http')
        ) {
          return ''; // Remove the line
        }
        return match; // Keep the line if it doesn't look like a source item
      })
      .trim(); // Trim whitespace from the final result
    // --- End cleanup step ---
    return processed;
  }, [message.content, message.references, message.sources]);

  // --- Log the processed content to check tags ---
  useEffect(() => {
    console.log(
      '[MessageBox] Content with citation tags:',
      contentWithCitationTags,
    );
  }, [contentWithCitationTags]);

  // --- Typewriter Logic ---
  // Only apply typewriter effect to the last assistant message when not loading
  const isTyping = !loading && isLast && message.role === 'assistant';
  // Pass the FINAL prepared content to the typewriter
  const typedContent = useTypewriter(
    isTyping ? contentWithCitationTags || '' : '',
    1,
  );

  // --- End Typewriter Logic ---

  // Check if references and doc_aggs exist (consistent variable name)
  const hasReferences =
    message.references?.doc_aggs && message.references.doc_aggs.length > 0;

  return (
    <div>
      {message.role === 'user' && (
        <div
          className={cn(
            'w-full',
            messageIndex === 0 ? 'pt-16' : 'pt-8',
            'break-words',
          )}
        >
          <h2 className="text-black dark:text-white font-medium text-3xl lg:w-9/12">
            {message.content}
          </h2>
        </div>
      )}
      {message.role === 'assistant' &&
        (loading && isLast ? (
          <div className="flex flex-col space-y-2 items-start w-full lg:w-9/12 mt-4 mb-6">
            <div className="flex flex-row items-center space-x-2">
              <Loader2
                className="text-black dark:text-white animate-spin"
                size={20}
              />
              <h3 className="text-black dark:text-white font-medium text-xl">
                {/* Display dynamic loading message */}
                {loadingMessages[currentLoadingMessageIndex]}
              </h3>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
            <div
              ref={dividerRef}
              className="flex flex-col space-y-6 w-full lg:w-9/12"
            >
              <div className="flex flex-col space-y-2">
                <div className="flex flex-row items-center space-x-2">
                  <Disc3
                    className={cn(
                      'text-black dark:text-white',
                      isLast && loading ? 'animate-spin' : 'animate-none',
                    )}
                    size={20}
                  />
                  <h3 className="text-black dark:text-white font-medium text-xl">
                    Answer
                  </h3>
                </div>

                <div className="prose prose-sm prose-stone dark:prose-invert max-w-none text-black dark:text-white">
                  <Markdown options={markdownOverrides}>
                    {isTyping
                      ? typedContent || ''
                      : contentWithCitationTags || ''}
                  </Markdown>

                  {hasReferences &&
                    (!isTyping ||
                      typedContent.length ===
                        contentWithCitationTags.length) && (
                      <div className="mt-6 border-t pt-4 border-gray-200 dark:border-gray-700 not-prose">
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          Referenced Documents:
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                          {message.references?.doc_aggs?.map(
                            (agg: RagflowDocAgg, index: number) => (
                              <li
                                key={index}
                                className="truncate"
                                title={agg.doc_name || 'Unknown Document'}
                              >
                                {agg.doc_name || 'Unknown Document'}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </div>
                {loading && isLast
                  ? null
                  : (!isTyping ||
                      typedContent.length ===
                        contentWithCitationTags.length) && (
                      <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-4 -mx-2">
                        <div className="flex flex-row items-center space-x-1">
                          <Rewrite
                            rewrite={rewrite}
                            messageId={message.messageId}
                          />
                        </div>
                        <div className="flex flex-row items-center space-x-1">
                          <Copy
                            initialMessage={message.content}
                            message={message}
                          />
                          <button
                            onClick={() => {
                              if (speechStatus === 'started') {
                                stop();
                              } else {
                                start();
                              }
                            }}
                            className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
                          >
                            {speechStatus === 'started' ? (
                              <StopCircle size={18} />
                            ) : (
                              <Volume2 size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                {isLast &&
                  message.suggestions &&
                  message.suggestions.length > 0 &&
                  message.role === 'assistant' &&
                  !loading &&
                  (!isTyping ||
                    typedContent.length === contentWithCitationTags.length) && (
                    <>
                      <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                      <div className="flex flex-col space-y-3 text-black dark:text-white">
                        <div className="flex flex-row items-center space-x-2 mt-4">
                          <Layers3 />
                          <h3 className="text-xl font-medium">Related</h3>
                        </div>
                        <div className="flex flex-col space-y-3">
                          {message.suggestions.map((suggestion, i) => (
                            <div
                              className="flex flex-col space-y-3 text-sm"
                              key={i}
                            >
                              <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                              <div
                                onClick={() => {
                                  sendMessage(suggestion);
                                }}
                                className="cursor-pointer flex flex-row justify-between font-medium space-x-2 items-center"
                              >
                                <p className="transition duration-200 hover:text-[#24A0ED]">
                                  {suggestion}
                                </p>
                                <Plus
                                  size={20}
                                  className="text-[#24A0ED] flex-shrink-0"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
              </div>
            </div>
            <div className="lg:sticky lg:top-20 flex flex-col items-center space-y-3 w-full lg:w-3/12 z-30 h-full pb-4">
              <SearchImages
                query={history[messageIndex - 1].content}
                chatHistory={history.slice(0, messageIndex - 1)}
                messageId={message.messageId}
                loading={loading}
                isAssistantMessageLoaded={!loading && isLast}
              />
              <SearchVideos
                chatHistory={history.slice(0, messageIndex - 1)}
                query={history[messageIndex - 1].content}
                messageId={message.messageId}
                loading={loading}
                isAssistantMessageLoaded={!loading && isLast}
              />
            </div>
          </div>
        ))}
      {/* Sources section moved here - Use ternary operator for cleaner conditional rendering */}
      {message.role === 'assistant' &&
      !loading &&
      message.sources &&
      message.sources.length > 0 ? (
        <div className="flex flex-col space-y-2 mt-6 lg:w-9/12">
          <div className="flex flex-row items-center space-x-2">
            <BookCopy className="text-black dark:text-white" size={20} />
            <h3 className="text-black dark:text-white font-medium text-xl">
              Sources
            </h3>
          </div>
          <MessageSources sources={message.sources} />
        </div>
      ) : null}{' '}
      {/* Return null if condition is false */}
    </div>
  );
};

export default MessageBox;
