export type TabSaveHandler = () => Promise<void>;

const handlers = new Map<string, TabSaveHandler>();

export function registerTabSaveHandler(
  tabId: string,
  handler: TabSaveHandler
): () => void {
  handlers.set(tabId, handler);
  return () => {
    if (handlers.get(tabId) === handler) {
      handlers.delete(tabId);
    }
  };
}

export function getTabSaveHandler(tabId: string): TabSaveHandler | undefined {
  return handlers.get(tabId);
}

export async function waitForTabSaveHandler(
  tabId: string,
  timeoutMs = 1000
): Promise<TabSaveHandler | undefined> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const handler = handlers.get(tabId);
    if (handler) {
      return handler;
    }
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return handlers.get(tabId);
}

/** Test helper — clears all handlers between specs. */
export function clearTabSaveHandlers() {
  handlers.clear();
}
