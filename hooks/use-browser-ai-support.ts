"use client";

import { doesBrowserSupportBrowserAI } from "@browser-ai/core";
import { useEffect, useState } from "react";

/**
 * Reports whether the current browser exposes the built-in AI APIs. The check
 * runs after mount because the server render has no `LanguageModel` global and
 * would otherwise disagree with the client.
 */
export function useBrowserAISupport() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(doesBrowserSupportBrowserAI());
  }, []);

  return isSupported;
}
