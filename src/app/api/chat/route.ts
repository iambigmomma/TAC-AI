import prompts from '@/lib/prompts';
import MetaSearchAgent, {
  type MetaSearchAgentType,
} from '@/lib/search/metaSearchAgent';
import crypto from 'crypto';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { EventEmitter } from 'stream';
import {
  chatModelProviders,
  embeddingModelProviders,
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '@/lib/providers';
import db from '@/lib/db';
import { chats, messages as messagesSchema } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { getFileDetails } from '@/lib/utils/files';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import {
  getCustomOpenaiApiKey,
  getCustomOpenaiApiUrl,
  getCustomOpenaiModelName,
} from '@/lib/config';
import { SearchMode } from '@/components/ChatWindow';
import { getRagflowChatCompletionNonStream } from '@/lib/ragflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Message = {
  messageId: string;
  chatId: string;
  content: string;
};

type ChatModel = {
  provider: string;
  name: string;
};

type EmbeddingModel = {
  provider: string;
  name: string;
};

type Body = {
  message: Message;
  optimizationMode: 'speed' | 'balanced' | 'quality';
  focusMode: string;
  searchMode?: SearchMode;
  history: Array<[string, string]>;
  files: Array<string>;
  chatModel: ChatModel;
  embeddingModel: EmbeddingModel;
  systemInstructions: string;
};

const handleHistorySave = async (
  message: Message,
  humanMessageId: string,
  focusMode: string,
  files: string[],
) => {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, message.chatId),
  });

  if (!chat) {
    await db
      .insert(chats)
      .values({
        id: message.chatId,
        title: message.content,
        createdAt: new Date().toString(),
        focusMode: focusMode,
        files: files.map(getFileDetails),
      })
      .execute();
  }

  const messageExists = await db.query.messages.findFirst({
    where: eq(messagesSchema.messageId, humanMessageId),
  });

  if (!messageExists) {
    await db
      .insert(messagesSchema)
      .values({
        content: message.content,
        chatId: message.chatId,
        messageId: humanMessageId,
        role: 'user',
        metadata: JSON.stringify({
          createdAt: new Date(),
        }),
      })
      .execute();
  } else {
    await db
      .delete(messagesSchema)
      .where(
        and(
          gt(messagesSchema.id, messageExists.id),
          eq(messagesSchema.chatId, message.chatId),
        ),
      )
      .execute();
  }
};

const getPromptsForFocus = (focusMode: string) => {
  switch (focusMode) {
    case 'academicSearch':
      return {
        queryGeneratorPrompt: prompts.academicSearchRetrieverPrompt,
        responsePrompt: prompts.academicSearchResponsePrompt,
      };
    case 'redditSearch':
      return {
        queryGeneratorPrompt: prompts.redditSearchRetrieverPrompt,
        responsePrompt: prompts.redditSearchResponsePrompt,
      };
    case 'youtubeSearch':
      return {
        queryGeneratorPrompt: prompts.youtubeSearchRetrieverPrompt,
        responsePrompt: prompts.youtubeSearchResponsePrompt,
      };
    case 'wolframAlphaSearch':
      return {
        queryGeneratorPrompt: prompts.wolframAlphaSearchRetrieverPrompt,
        responsePrompt: prompts.wolframAlphaSearchResponsePrompt,
      };
    case 'writingAssistant':
      return {
        queryGeneratorPrompt: prompts.writingAssistantPrompt,
        responsePrompt: prompts.writingAssistantPrompt,
      };
    case 'webSearch':
    default:
      return {
        queryGeneratorPrompt: prompts.webSearchRetrieverPrompt,
        responsePrompt: prompts.webSearchResponsePrompt,
      };
  }
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as Body;
    const { message, searchMode = 'web', focusMode } = body;
    const { chatId } = message;

    if (message.content === '') {
      return Response.json(
        {
          message: 'Please provide a message to process',
        },
        { status: 400 },
      );
    }

    const [chatModelProvidersList, embeddingModelProvidersList] =
      await Promise.all([
        getAvailableChatModelProviders(),
        getAvailableEmbeddingModelProviders(),
      ]);

    const chatModelProvider =
      chatModelProvidersList[
        body.chatModel?.provider || Object.keys(chatModelProvidersList)[0]
      ];
    const chatModel =
      chatModelProvider[
        body.chatModel?.name || Object.keys(chatModelProvider)[0]
      ];

    const embeddingProvider =
      embeddingModelProvidersList[
        body.embeddingModel?.provider ||
          Object.keys(embeddingModelProvidersList)[0]
      ];
    const embeddingModel =
      embeddingProvider[
        body.embeddingModel?.name || Object.keys(embeddingProvider)[0]
      ];

    let llm: BaseChatModel | undefined;
    let embedding = embeddingModel.model;

    if (body.chatModel?.provider === 'custom_openai') {
      llm = new ChatOpenAI({
        openAIApiKey: getCustomOpenaiApiKey(),
        modelName: getCustomOpenaiModelName(),
        temperature: 0.7,
        configuration: {
          baseURL: getCustomOpenaiApiUrl(),
        },
      }) as unknown as BaseChatModel;
    } else if (chatModelProvider && chatModel) {
      llm = chatModel.model;
    }

    if (!llm) {
      return Response.json({ error: 'Invalid chat model' }, { status: 400 });
    }

    if (!embedding) {
      return Response.json(
        { error: 'Invalid embedding model' },
        { status: 400 },
      );
    }

    const humanMessageId =
      message.messageId ?? crypto.randomBytes(7).toString('hex');
    const aiMessageId = crypto.randomBytes(7).toString('hex');

    await handleHistorySave(message, humanMessageId, focusMode, body.files);

    if (searchMode === 'docs') {
      console.log(
        `Executing RAGflow Chat search (non-streaming) for appChatId: ${chatId}...`,
      );
      const result = await getRagflowChatCompletionNonStream(
        chatId,
        message.content,
      );

      await db
        .insert(messagesSchema)
        .values({
          content: result.content,
          chatId: chatId,
          messageId: aiMessageId,
          role: 'assistant',
          metadata: JSON.stringify({
            createdAt: new Date(),
            ...(result.references && { references: result.references }),
          }),
        })
        .execute();

      return Response.json({
        type: 'finalResponse',
        data: {
          content: result.content,
          references: result.references,
        },
        messageId: aiMessageId,
      });
    } else {
      const responseStream = new TransformStream();
      const writer = responseStream.writable.getWriter();
      const encoder = new TextEncoder();
      const searchEmitter = new EventEmitter();

      const handleNonRagflowStream = async (
        emitter: EventEmitter,
        streamWriter: WritableStreamDefaultWriter,
        textEncoder: TextEncoder,
        msgId: string,
        cId: string,
      ) => {
        let recievedMessage = '';
        let sources: any[] = [];
        emitter.on('data', (data) => {
          const parsedData = JSON.parse(data);
          if (parsedData.type === 'response') {
            streamWriter.write(
              textEncoder.encode(
                JSON.stringify({
                  type: 'message',
                  data: parsedData.data,
                  messageId: msgId,
                }) + '\n',
              ),
            );
            recievedMessage += parsedData.data;
          } else if (parsedData.type === 'sources') {
            streamWriter.write(
              textEncoder.encode(
                JSON.stringify({
                  type: 'sources',
                  data: parsedData.data,
                  messageId: msgId,
                }) + '\n',
              ),
            );
            sources = parsedData.data;
          }
        });
        emitter.on('end', () => {
          streamWriter.write(
            textEncoder.encode(
              JSON.stringify({
                type: 'messageEnd',
                messageId: msgId,
              }) + '\n',
            ),
          );
          streamWriter.close();

          db.insert(messagesSchema)
            .values({
              content: recievedMessage,
              chatId: cId,
              messageId: msgId,
              role: 'assistant',
              metadata: JSON.stringify({
                createdAt: new Date(),
                ...(sources && sources.length > 0 && { sources }),
              }),
            })
            .execute();
        });
        emitter.on('error', (data) => {
          const parsedData = JSON.parse(data);
          streamWriter.write(
            textEncoder.encode(
              JSON.stringify({
                type: 'error',
                data: parsedData.data,
                messageId: msgId,
              }) + '\n',
            ),
          );
          streamWriter.close();
        });
      };

      handleNonRagflowStream(
        searchEmitter,
        writer,
        encoder,
        aiMessageId,
        chatId,
      );

      console.log(
        `Executing Web/Both search (mode: ${searchMode}, focus: ${focusMode})...`,
      );
      const selectedPrompts = getPromptsForFocus(focusMode);
      const agentConfig = {
        searchWeb: true,
        rerank: true,
        summarizer: true,
        rerankThreshold: 0.7,
        queryGeneratorPrompt: selectedPrompts.queryGeneratorPrompt,
        responsePrompt: selectedPrompts.responsePrompt,
        activeEngines: ['google'],
      };
      const agent = new MetaSearchAgent(agentConfig);
      const historyMessages: BaseMessage[] = body.history.map((msg) => {
        if (msg[0] === 'human') return new HumanMessage(msg[1]);
        else return new AIMessage(msg[1]);
      });
      const systemInstructions =
        body.systemInstructions || selectedPrompts.responsePrompt;
      const agentEmitter = await agent.searchAndAnswer(
        message.content,
        historyMessages,
        llm!,
        embedding!,
        body.optimizationMode,
        body.files,
        systemInstructions,
      );
      agentEmitter.on('data', (data) => searchEmitter.emit('data', data));
      agentEmitter.on('end', () => searchEmitter.emit('end'));
      agentEmitter.on('error', (error) => searchEmitter.emit('error', error));

      return new Response(responseStream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }
  } catch (e) {
    console.error('API Route Error:', e);
    return Response.json(
      { error: `Server error: ${(e as Error).message}` },
      { status: 500 },
    );
  }
};
