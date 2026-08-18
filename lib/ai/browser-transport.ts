import { browserAI } from "@browser-ai/core";
import {
  type ChatRequestOptions,
  type ChatTransport,
  convertToModelMessages,
  streamText,
  toUIMessageStream,
  type UIMessageChunk,
} from "ai";
import type { ChatMessage } from "@/lib/types";
import { regularPrompt } from "./prompts";

type SendMessagesOptions = Parameters<
  ChatTransport<ChatMessage>["sendMessages"]
>[0];

/**
 * Runs the chat against the browser's built-in model instead of `/api/chat`.
 * Inference never leaves the tab, so there is no server stream to reconnect to
 * and no server-side tool loop; persistence is handled by the caller once the
 * stream finishes.
 */
export class BrowserAIChatTransport implements ChatTransport<ChatMessage> {
  async sendMessages(
    options: SendMessagesOptions
  ): Promise<ReadableStream<UIMessageChunk>> {
    const result = streamText({
      abortSignal: options.abortSignal,
      messages: await convertToModelMessages(options.messages),
      model: browserAI(),
      system: regularPrompt,
    });

    return toUIMessageStream({ stream: result.stream });
  }

  reconnectToStream(
    _options: { chatId: string } & ChatRequestOptions
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    return Promise.resolve(null);
  }
}

function textPartsOf(message: ChatMessage) {
  return message.parts
    .filter((part) => part.type === "text" && part.text.length > 0)
    .map((part) => ({ text: (part as { text: string }).text, type: "text" }));
}

/**
 * Stores an on-device exchange server-side. The browser transport bypasses
 * `/api/chat`, so nothing has been written to the database by the time the
 * stream ends.
 */
export async function persistBrowserExchange({
  chatId,
  messages,
  assistantMessage,
  visibility,
}: {
  chatId: string;
  messages: ChatMessage[];
  assistantMessage: ChatMessage;
  visibility: "public" | "private";
}) {
  const userMessage = messages.findLast((item) => item.role === "user");

  if (!userMessage) {
    return;
  }

  const parts = textPartsOf(userMessage);
  const assistantParts = textPartsOf(assistantMessage);

  if (parts.length === 0 || assistantParts.length === 0) {
    return;
  }

  await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat/local`, {
    body: JSON.stringify({
      assistantMessage: {
        id: assistantMessage.id,
        parts: assistantParts,
        role: "assistant",
      },
      id: chatId,
      message: { id: userMessage.id, parts, role: "user" },
      selectedVisibilityType: visibility,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

/**
 * Picks a transport per request. `useChat` reads its transport once, so the
 * model switch has to happen inside the transport rather than by swapping the
 * instance.
 */
export class ModelAwareChatTransport implements ChatTransport<ChatMessage> {
  private readonly isBrowserModelSelected: () => boolean;
  private readonly browser: ChatTransport<ChatMessage>;
  private readonly server: ChatTransport<ChatMessage>;

  constructor(options: {
    isBrowserModelSelected: () => boolean;
    browser: ChatTransport<ChatMessage>;
    server: ChatTransport<ChatMessage>;
  }) {
    this.isBrowserModelSelected = options.isBrowserModelSelected;
    this.browser = options.browser;
    this.server = options.server;
  }

  private current() {
    return this.isBrowserModelSelected() ? this.browser : this.server;
  }

  sendMessages(options: SendMessagesOptions) {
    return this.current().sendMessages(options);
  }

  reconnectToStream(options: { chatId: string } & ChatRequestOptions) {
    return this.current().reconnectToStream(options);
  }
}
