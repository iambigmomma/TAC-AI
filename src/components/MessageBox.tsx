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

const ThinkTagProcessor = ({ children }: { children: React.ReactNode }) => {
  return <ThinkBox content={children as string} />;
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
  const [parsedMessage, setParsedMessage] = useState(message.content);
  const [speechMessage, setSpeechMessage] = useState(message.content);

  useEffect(() => {
    const citationRegex = /\[([^\]]+)\]/g;
    const regex = /\[(\d+)\]/g;
    let processedMessage = message.content;

    if (message.role === 'assistant' && message.content.includes('<think>')) {
      const openThinkTag = processedMessage.match(/<think>/g)?.length || 0;
      const closeThinkTag = processedMessage.match(/<\/think>/g)?.length || 0;

      if (openThinkTag > closeThinkTag) {
        processedMessage += '</think> <a> </a>'; // The extra <a> </a> is to prevent the the think component from looking bad
      }
    }

    if (
      message.role === 'assistant' &&
      message?.sources &&
      message.sources.length > 0
    ) {
      setParsedMessage(
        processedMessage.replace(
          citationRegex,
          (_, capturedContent: string) => {
            const numbers = capturedContent
              .split(',')
              .map((numStr) => numStr.trim());

            const linksHtml = numbers
              .map((numStr) => {
                const number = parseInt(numStr);

                if (isNaN(number) || number <= 0) {
                  return `[${numStr}]`;
                }

                const source = message.sources?.[number - 1];
                const url = source?.metadata?.url;

                if (url) {
                  return `<a href="${url}" target="_blank" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative">${numStr}</a>`;
                } else {
                  return `[${numStr}]`;
                }
              })
              .join('');

            return linksHtml;
          },
        ),
      );
      setSpeechMessage(message.content.replace(regex, ''));
      return;
    }

    setSpeechMessage(message.content.replace(regex, ''));
    setParsedMessage(processedMessage);
  }, [message.content, message.sources, message.role]);

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
  const markdownOverrides: MarkdownToJSX.Options = {
    overrides: {
      think: {
        component: ThinkTagProcessor,
      },
      // Add override for our custom placeholder tag
      'citation-placeholder': {
        component: CitationRenderer,
        // props are automatically passed, including 'marker' if set as attribute
      },
    },
  };

  // Prepare content string with placeholders if references exist
  const contentWithPlaceholders = useMemo(() => {
    if (!message.references) {
      return message.content;
    }
    // Replace ##N$$ with <citation-placeholder marker="##N$$"></citation-placeholder>
    return message.content.replace(/(##\d+\$\$)/g, (match) => {
      // Ensure the marker attribute value is properly quoted
      return `<citation-placeholder marker="${match}"></citation-placeholder>`;
    });
  }, [message.content, message.references]);

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

      {message.role === 'assistant' && (
        <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
          <div
            ref={dividerRef}
            className="flex flex-col space-y-6 w-full lg:w-9/12"
          >
            {message.sources && message.sources.length > 0 && (
              <div className="flex flex-col space-y-2">
                <div className="flex flex-row items-center space-x-2">
                  <BookCopy className="text-black dark:text-white" size={20} />
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
                {/* Render the potentially modified content using a single Markdown component */}
                {/* Use contentWithPlaceholders which includes citation tags if references exist */}
                <Markdown options={markdownOverrides}>
                  {contentWithPlaceholders}
                </Markdown>

                {/* Referenced Documents list rendered *within* the prose div */}
                {hasReferences && (
                  <div className="mt-6 border-t pt-4 border-gray-200 dark:border-gray-700 not-prose">
                    {' '}
                    {/* Add not-prose to list container */}
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
              {loading && isLast ? null : (
                <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-4 -mx-2">
                  <div className="flex flex-row items-center space-x-1">
                    <Rewrite rewrite={rewrite} messageId={message.messageId} />
                  </div>
                  <div className="flex flex-row items-center space-x-1">
                    <Copy initialMessage={message.content} message={message} />
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
                !loading && (
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
      )}
    </div>
  );
};

export default MessageBox;
