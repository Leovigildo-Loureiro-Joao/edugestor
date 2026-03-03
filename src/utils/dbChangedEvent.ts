type DbChangedDetail = {
  table?: string;
  action?: string;
};

const SYNC_ACTIONS_TO_IGNORE = new Set(['download']);

export const shouldHandleDbChangedEvent = (event: Event, watchedTables: string[]): boolean => {
  const detail = (event as CustomEvent<DbChangedDetail>).detail;
  if (!detail?.table) {
    return false;
  }

  if (detail.action && SYNC_ACTIONS_TO_IGNORE.has(detail.action)) {
    return false;
  }

  return watchedTables.includes(detail.table);
};

export const createThrottledCallback = (callback: () => void, cooldownMs = 2000) => {
  type ThrottledCallback = (() => void) & { cancel: () => void };
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastExecution = 0;

  const throttled: ThrottledCallback = () => {
    const now = Date.now();
    const remaining = cooldownMs - (now - lastExecution);

    if (remaining <= 0) {
      lastExecution = now;
      callback();
      return;
    }

    if (timeoutId) {
      return;
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      lastExecution = Date.now();
      callback();
    }, remaining);
  };

  throttled.cancel = () => {
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return throttled;
};
