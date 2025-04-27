'use client';

import { useEffect, useRef, useState } from 'react';
import { Document } from '@langchain/core/documents';
import Navbar from './Navbar';
import Chat from './Chat';
import EmptyChat from './EmptyChat';
import crypto from 'crypto';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { getSuggestions } from '@/lib/actions';
import { Settings, Loader2, Send, Share2, Sparkles, Menu } from 'lucide-react';
import Link from 'next/link';
import NextError from 'next/error';
import { type RagflowReference, type RagflowReferenceChunk } from '@/lib/types';
import { type SourceMetadata } from './MessageSources';
// import { MessageSuggestions } from './MessageSuggestions'; // Temporarily commented out
import { v4 as uuidv4 } from 'uuid';

export type Message = {
  messageId: string;
  chatId: string;
  createdAt: Date;
  content: string;
  role: 'user' | 'assistant';
  suggestions?: string[];
  sources?: SourceMetadata[];
  references?: RagflowReference;
};

export type SearchMode = 'web' | 'docs' | 'both';

export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
}

interface ChatModelProvider {
  name: string;
  provider: string;
}

interface EmbeddingModelProvider {
  name: string;
  provider: string;
}

const checkConfig = async (
  setChatModelProvider: (provider: ChatModelProvider) => void,
  setEmbeddingModelProvider: (provider: EmbeddingModelProvider) => void,
  setIsConfigReady: (ready: boolean) => void,
  setHasError: (hasError: boolean) => void,
) => {
  try {
    let chatModel = localStorage.getItem('chatModel');
    let chatModelProvider = localStorage.getItem('chatModelProvider');
    let embeddingModel = localStorage.getItem('embeddingModel');
    let embeddingModelProvider = localStorage.getItem('embeddingModelProvider');

    const autoImageSearch = localStorage.getItem('autoImageSearch');
    const autoVideoSearch = localStorage.getItem('autoVideoSearch');

    if (!autoImageSearch) {
      localStorage.setItem('autoImageSearch', 'true');
    }

    if (!autoVideoSearch) {
      localStorage.setItem('autoVideoSearch', 'false');
    }

    const providers = await fetch(`/api/models`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (res) => {
      if (!res.ok)
        throw new Error(
          `Failed to fetch models: ${res.status} ${res.statusText}`,
        );
      return res.json();
    });

    if (
      !chatModel ||
      !chatModelProvider ||
      !embeddingModel ||
      !embeddingModelProvider
    ) {
      if (!chatModel || !chatModelProvider) {
        const chatModelProviders = providers.chatModelProviders;

        chatModelProvider =
          chatModelProvider || Object.keys(chatModelProviders)[0];

        chatModel = Object.keys(chatModelProviders[chatModelProvider])[0];

        if (!chatModelProviders || Object.keys(chatModelProviders).length === 0)
          return toast.error('No chat models available');
      }

      if (!embeddingModel || !embeddingModelProvider) {
        const embeddingModelProviders = providers.embeddingModelProviders;

        if (
          !embeddingModelProviders ||
          Object.keys(embeddingModelProviders).length === 0
        )
          return toast.error('No embedding models available');

        embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
        embeddingModel = Object.keys(
          embeddingModelProviders[embeddingModelProvider],
        )[0];
      }

      localStorage.setItem('chatModel', chatModel!);
      localStorage.setItem('chatModelProvider', chatModelProvider);
      localStorage.setItem('embeddingModel', embeddingModel!);
      localStorage.setItem('embeddingModelProvider', embeddingModelProvider);
    } else {
      const chatModelProviders = providers.chatModelProviders;
      const embeddingModelProviders = providers.embeddingModelProviders;

      if (
        Object.keys(chatModelProviders).length > 0 &&
        !chatModelProviders[chatModelProvider]
      ) {
        const chatModelProvidersKeys = Object.keys(chatModelProviders);
        chatModelProvider =
          chatModelProvidersKeys.find(
            (key) => Object.keys(chatModelProviders[key]).length > 0,
          ) || chatModelProvidersKeys[0];

        localStorage.setItem('chatModelProvider', chatModelProvider);
      }

      if (
        chatModelProvider &&
        !chatModelProviders[chatModelProvider][chatModel]
      ) {
        chatModel = Object.keys(
          chatModelProviders[
            Object.keys(chatModelProviders[chatModelProvider]).length > 0
              ? chatModelProvider
              : Object.keys(chatModelProviders)[0]
          ],
        )[0];
        localStorage.setItem('chatModel', chatModel);
      }

      if (
        Object.keys(embeddingModelProviders).length > 0 &&
        !embeddingModelProviders[embeddingModelProvider]
      ) {
        embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
        localStorage.setItem('embeddingModelProvider', embeddingModelProvider);
      }

      if (
        embeddingModelProvider &&
        !embeddingModelProviders[embeddingModelProvider][embeddingModel]
      ) {
        embeddingModel = Object.keys(
          embeddingModelProviders[embeddingModelProvider],
        )[0];
        localStorage.setItem('embeddingModel', embeddingModel);
      }
    }

    setChatModelProvider({
      name: chatModel!,
      provider: chatModelProvider,
    });

    setEmbeddingModelProvider({
      name: embeddingModel!,
      provider: embeddingModelProvider,
    });

    setIsConfigReady(true);
  } catch (err) {
    console.error('An error occurred while checking the configuration:', err);
    setIsConfigReady(false);
    setHasError(true);
  }
};

const loadMessages = async (
  chatId: string,
  setMessages: (messages: Message[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  setChatHistory: (history: [string, string][]) => void,
  setFocusMode: (mode: string) => void,
  setNotFound: (notFound: boolean) => void,
  setFiles: (files: File[]) => void,
  setFileIds: (fileIds: string[]) => void,
) => {
  const res = await fetch(`/api/chats/${chatId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    setNotFound(true);
    setIsMessagesLoaded(true);
    return;
  }

  const data = await res.json();

  const messages = data.messages.map((msg: any) => {
    // Parse the stored metadata
    const parsedMetadata = JSON.parse(msg.metadata || '{}');

    // Initialize sources and references for the final message object
    let finalSources: SourceMetadata[] | undefined = undefined;
    let finalReferences: RagflowReference | undefined =
      parsedMetadata.references;

    // Perform separation logic if references.chunks exists in the parsed metadata
    if (parsedMetadata.references?.chunks) {
      const allChunks = parsedMetadata.references.chunks || [];
      const webSources: SourceMetadata[] = [];

      allChunks.forEach((chunk: any) => {
        if (chunk.url && typeof chunk.url === 'string') {
          webSources.push({
            title: chunk.document_name || 'Untitled Source',
            url: chunk.url,
          });
        }
      });

      if (webSources.length > 0) {
        finalSources = webSources;
      }
      // Keep finalReferences as the original parsedMetadata.references
      // to preserve indices for doc citations (##N$$)
    }

    // Construct the final message object for the state
    return {
      // Base properties from the DB row (ensure role, content etc. are included)
      messageId: msg.messageId,
      chatId: msg.chatId,
      createdAt: new Date(msg.createdAt), // Ensure date is parsed correctly
      content: msg.content,
      role: msg.role,
      // Add suggestions if they exist in parsedMetadata
      suggestions: parsedMetadata.suggestions,
      // Assign the processed sources and references
      sources: finalSources,
      references: finalReferences,
    };
  }) as Message[];

  setMessages(messages);

  const history = messages.map((msg) => {
    return [msg.role, msg.content];
  }) as [string, string][];

  document.title = messages[0].content;

  const files = data.chat.files.map((file: any) => {
    return {
      fileName: file.name,
      fileExtension: file.name.split('.').pop(),
      fileId: file.fileId,
    };
  });

  setFiles(files);
  setFileIds(files.map((file: File) => file.fileId));

  setChatHistory(history);
  setFocusMode(data.chat.focusMode);
  setIsMessagesLoaded(true);
};

const ChatWindow = ({ id }: { id?: string }) => {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q');

  const [chatId, setChatId] = useState<string | undefined>(id);
  const [newChatCreated, setNewChatCreated] = useState(false);

  const [chatModelProvider, setChatModelProvider] = useState<ChatModelProvider>(
    {
      name: '',
      provider: '',
    },
  );

  const [embeddingModelProvider, setEmbeddingModelProvider] =
    useState<EmbeddingModelProvider>({
      name: '',
      provider: '',
    });

  const [isConfigReady, setIsConfigReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkConfig(
      setChatModelProvider,
      setEmbeddingModelProvider,
      setIsConfigReady,
      setHasError,
    );
  }, []);

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  const [focusMode, setFocusMode] = useState('webSearch');
  const [optimizationMode, setOptimizationMode] = useState('speed');
  const [searchMode, setSearchMode] = useState<SearchMode>('docs');

  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      loadMessages(
        chatId,
        setMessages,
        setIsMessagesLoaded,
        setChatHistory,
        setFocusMode,
        setNotFound,
        setFiles,
        setFileIds,
      );
    } else if (!chatId) {
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setChatId(crypto.randomBytes(20).toString('hex'));
    }
  }, []);

  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isMessagesLoaded && isConfigReady) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [isMessagesLoaded, isConfigReady]);

  const sendMessage = async (message: string, messageId?: string) => {
    console.log('--- ChatWindow sendMessage called ---', message);
    if (loading) return;
    if (!isConfigReady) {
      toast.error('Cannot send message before the configuration is ready');
      return;
    }

    const currentChatId = chatId;

    if (!currentChatId) {
      console.error(
        'Error: Chat ID is missing in component state during sendMessage.',
      );
      toast.error('Cannot send message: Chat session ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);

    if (searchParams.get('id') !== currentChatId) {
      window.history.replaceState(null, '', `/?id=${currentChatId}`);
    }

    const humanMessageId = uuidv4();
    const newUserMessage: Message = {
      role: 'user',
      content: message,
      messageId: humanMessageId,
      chatId: currentChatId,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    const assistantMessageId = uuidv4();
    const assistantPlaceholderMessage: Message = {
      role: 'assistant',
      content: '',
      messageId: assistantMessageId,
      chatId: currentChatId,
      createdAt: new Date(),
      references: undefined,
    };
    setMessages((prev) => [...prev, assistantPlaceholderMessage]);

    const formattedHistory = messages
      .filter((msg) => msg.messageId !== assistantPlaceholderMessage.messageId)
      .map((msg): [string, string] => [msg.role, msg.content]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            messageId: humanMessageId,
            chatId: currentChatId,
            content: message,
          },
          history: formattedHistory,
          focusMode: searchParams.get('fm') || 'webSearch',
          searchMode: 'docs',
          chatModel: {
            provider: chatModelProvider.provider,
            name: chatModelProvider.name,
          },
          embeddingModel: {
            provider: embeddingModelProvider.provider,
            name: embeddingModelProvider.name,
          },
          systemInstructions: localStorage.getItem('systemInstructions'),
          files: files,
          optimizationMode: optimizationMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const result = await response.json();

      // Log the raw result.data from the backend API response
      console.log(
        '[sendMessage] Raw API response data:',
        JSON.stringify(result.data, null, 2), // Use JSON.stringify for better readability
      );

      if (result.type === 'finalResponse') {
        // Process references: Extract web sources, keep original chunks for references
        const allChunks = result.data.references?.chunks || [];
        const webSources: SourceMetadata[] = [];
        // const docChunks: RagflowReferenceChunk[] = []; // Not needed anymore

        allChunks.forEach((chunk: any) => {
          if (chunk.url && typeof chunk.url === 'string') {
            // Assume it's a web source if URL is a non-empty string
            webSources.push({
              title: chunk.document_name || 'Untitled Source',
              url: chunk.url,
              // Note: We could potentially add chunk.content as a snippet here if needed
            });
          }
          // No need to explicitly collect docChunks here anymore
        });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === assistantMessageId
              ? {
                  ...msg,
                  content: result.data.content,
                  // Assign extracted web sources
                  sources: webSources.length > 0 ? webSources : undefined,
                  // Assign the original, unfiltered references object from the API
                  // This preserves original indices and includes both web/doc chunks
                  references: result.data.references,
                }
              : msg,
          ),
        );
      } else if (result.type === 'error') {
        throw new Error(result.data || 'Received error from API');
      } else {
        throw new Error('Unexpected response format from API');
      }
    } catch (error) {
      console.error('sendMessage error:', error);
      toast.error(`Error: ${(error as Error).message}`);
      setMessages((prev) =>
        prev.filter(
          (msg) => msg.messageId !== assistantPlaceholderMessage.messageId,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.messageId === messageId);

    if (index === -1) return;

    const message = messages[index - 1];

    setMessages((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });
    setChatHistory((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });

    sendMessage(message.content, message.messageId);
  };

  useEffect(() => {
    if (isReady && initialMessage && isConfigReady) {
      sendMessage(initialMessage);
    }
  }, [isConfigReady, isReady, initialMessage]);

  if (hasError) {
    return (
      <div className="relative">
        <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
          <Link href="/settings">
            <Settings className="cursor-pointer lg:hidden" />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="dark:text-white/70 text-black/70 text-sm">
            Failed to connect to the server. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return isReady ? (
    notFound ? (
      <NextError statusCode={404} />
    ) : (
      <div>
        {messages.length > 0 ? (
          <>
            <Navbar chatId={chatId!} messages={messages} />
            <Chat
              loading={loading}
              messages={messages}
              sendMessage={sendMessage}
              messageAppeared={messageAppeared}
              rewrite={rewrite}
              fileIds={fileIds}
              setFileIds={setFileIds}
              files={files}
              setFiles={setFiles}
              searchMode={searchMode}
            />
          </>
        ) : (
          <EmptyChat
            sendMessage={sendMessage}
            fileIds={fileIds}
            setFileIds={setFileIds}
            files={files}
            setFiles={setFiles}
            searchMode={searchMode}
          />
        )}
      </div>
    )
  ) : (
    <div className="flex flex-row items-center justify-center min-h-screen">
      <svg
        aria-hidden="true"
        className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
    </div>
  );
};

export default ChatWindow;
