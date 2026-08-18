import type { ChatModel } from "./models";

export const BROWSER_CHAT_MODEL_ID = "browser-ai/built-in";

export const browserChatModel: ChatModel = {
  description: "Runs on-device in Chrome and Edge. Nothing leaves the browser.",
  id: BROWSER_CHAT_MODEL_ID,
  name: "Built-in AI",
  provider: "browser-ai",
};

export function isBrowserChatModel(modelId: string) {
  return modelId === BROWSER_CHAT_MODEL_ID;
}
