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
import MessageSources from './MessageSources';
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

const CitationRenderer = ({
  marker,
  message,
}: {
  marker?: string;
  message: Message;
}) => {
  if (!marker) return null; // Handle case where marker might be missing

  const citationIndex = parseInt(marker.replace(/##|\$\$/g, ''), 10);
  // Use optional chaining here for safety
  const referenceChunk = message.references?.chunks?.[citationIndex];

  if (!referenceChunk) {
    // Render a non-interactive error indicator if chunk not found
    return (
      <span className="text-red-500 font-semibold">[?{citationIndex + 1}]</span>
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

// Component to render Web search citations as Popovers
const WebCitationRenderer = ({
  number,
  message,
}: {
  number?: string;
  message: Message;
}) => {
  if (!number) return null;
  const citationIndex = parseInt(number, 10) - 1; // Adjust for 0-based index

  if (isNaN(citationIndex) || citationIndex < 0) {
    return <span className="text-red-500 font-semibold">?[{number}]?</span>;
  }

  const source = message.sources?.[citationIndex];

  if (!source?.url || !source?.title) {
    // Check if source and necessary fields exist
    console.warn(
      `[WebCitationRenderer] Source or required fields (url, title) not found for index ${citationIndex} (number ${number})`,
    );
    return <span className="text-red-500 font-semibold">?[{number}]?</span>;
  }

  const { url, title } = source;
  const favIconUrl = `https://s2.googleusercontent.com/s2/favicons?domain_url=${url}`;

  return (
    <Popover as="span" className="relative inline-block align-baseline">
      {/* Use a different color scheme for web popovers? Green maybe? */}
      <PopoverButton className="inline-flex items-center justify-center align-middle bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full w-4 h-4 text-[10px] font-semibold mx-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 hover:bg-green-200 dark:hover:bg-green-800 -translate-y-0.5">
        {number} {/* Display original number */}
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
        <PopoverPanel
          as="span"
          className="absolute block z-10 w-screen min-w-[300px] max-w-xs px-4 mt-1 left-0 sm:px-0"
        >
          <span className="block overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white dark:bg-gray-800 p-3">
            {title && (
              <span
                className="flex items-center text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate"
                title={title}
              >
                {url !== '#' &&
                  url !== 'File' && ( // Don't show favicon for placeholder URLs
                    <img
                      src={favIconUrl}
                      alt=""
                      className="inline h-4 w-4 mr-1.5 align-middle rounded-sm flex-shrink-0"
                      // Add error handling for favicon if needed
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                <span className="truncate">{title}</span>
              </span>
            )}
            {url &&
              url !== '#' &&
              url !== 'File' && ( // Don't show link for placeholder URLs
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                  title={url}
                >
                  {url}
                </a>
              )}
          </span>
        </PopoverPanel>
      </Transition>
    </Popover>
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
  const [speechMessage, setSpeechMessage] = useState(
    () =>
      message.content
        .replace(/(##\d+\$\$)/g, '') // Remove RAGFlow markers for speech
        .replace(/\[\d+\]/g, ''), // Remove web markers for speech
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
    setSpeechMessage(
      message.content.replace(/(##\d+\$\$)/g, '').replace(/\[\d+\]/g, ''),
    );
  }, [message.content]);

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  // Update Markdown overrides to include both citation renderers
  const markdownOverrides: MarkdownToJSX.Options = {
    overrides: {
      think: {
        component: ThinkTagProcessor,
      },
      // Docs Popover
      'citation-placeholder': {
        component: (props: { marker?: string }) => (
          <CitationRenderer {...props} message={message} />
        ),
      },
      // Web Popover (New)
      'web-citation-placeholder': {
        // Pass message prop explicitly to WebCitationRenderer
        component: (props: { number?: string }) => (
          <WebCitationRenderer {...props} message={message} />
        ),
      },
    },
  };

  // Prepare content string with placeholders for BOTH citation types
  const contentWithPlaceholders = useMemo(() => {
    let processed = message.content || '';

    if (message.references) {
      // DOCS mode: Replace ##N$$ with <citation-placeholder...>
      processed = processed.replace(/(##\d+\$\$)/g, (match) => {
        const citationIndex = parseInt(match.replace(/##|\$\$/g, ''), 10);
        if (message.references?.chunks?.[citationIndex]) {
          return `<citation-placeholder marker="${match}"></citation-placeholder>`;
        } else {
          console.warn(
            `[contentWithPlaceholders Docs] Chunk not found for marker ${match}, keeping plain text.`,
          );
          return match;
        }
      });
      // Q: Should we also handle [N] here if backend sends both formats?
      // For now, assuming only ##N$$ for docs.
    } else if (message.sources) {
      // WEB mode: Replace [N] with <web-citation-placeholder...>
      processed = processed.replace(/\[(\d+)\]/g, (match, number) => {
        const citationIndex = parseInt(number, 10) - 1;
        if (message.sources?.[citationIndex]) {
          // Check only for source existence, renderer checks details
          return `<web-citation-placeholder number="${number}"></web-citation-placeholder>`;
        } else {
          console.warn(
            `[contentWithPlaceholders Web] Source not found for number ${number}, keeping plain text.`,
          );
          return match;
        }
      });
    }
    // Note: This simple replace doesn't handle complex cases like [1, 2] or [[1]]

    // Handle <think> tags (ensure they remain)
    if (processed.includes('<think>')) {
      const openThinkTag = processed.match(/<think>/g)?.length || 0;
      const closeThinkTag = processed.match(/<\/think>/g)?.length || 0;
      if (openThinkTag > closeThinkTag) {
        processed += '</think> <a> </a>';
      }
    }

    // --- Add final cleanup step ---
    processed = processed
      .replace(/\n[ ]*(So?urce:|Sourcee:|Reference:)[^/n]+/g, (match) => {
        if (
          match.includes('[') ||
          match.includes(']') ||
          match.includes('http')
        ) {
          return '';
        }
        return match;
      })
      .trim();
    // --- End cleanup step ---
    return processed;
  }, [message.content, message.references, message.sources]); // Added message.sources

  // --- Typewriter Logic ---
  // Only apply typewriter effect to the last assistant message when not loading
  const isTyping = !loading && isLast && message.role === 'assistant';
  // Pass the FINAL prepared content to the typewriter
  const typedContent = useTypewriter(
    isTyping ? contentWithPlaceholders : '',
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
              {message.sources && message.sources.length > 0 && (
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-row items-center space-x-2">
                    <BookCopy
                      className="text-black dark:text-white"
                      size={20}
                    />
                    <h3 className="text-black dark:text-white font-medium text-xl">
                      Sources
                    </h3>
                  </div>
                  <MessageSources sources={message.sources} />
                </div>
              )}
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
                    {isTyping ? typedContent : contentWithPlaceholders}
                  </Markdown>

                  {hasReferences &&
                    (!isTyping ||
                      typedContent.length ===
                        contentWithPlaceholders.length) && (
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
                                title={agg.doc_name}
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
                        contentWithPlaceholders.length) && (
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
                    typedContent.length === contentWithPlaceholders.length) && (
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
              />
              <SearchVideos
                chatHistory={history.slice(0, messageIndex - 1)}
                query={history[messageIndex - 1].content}
                messageId={message.messageId}
              />
            </div>
          </div>
        ))}
    </div>
  );
};

export default MessageBox;
