type WindowCounter = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, WindowCounter>();

function nowMs(): number {
  return Date.now();
}

function normalizeKey(parts: Array<string | number | undefined | null>): string {
  return parts
    .map((part) => String(part ?? ""))
    .join(":")
    .toLowerCase();
}

export function getClientIp(identifierHeader: string | null): string {
  if (!identifierHeader) return "unknown";
  const first = identifierHeader.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "unknown";
}

export function limitByKey(input: {
  namespace: string;
  keyParts: Array<string | number | undefined | null>;
  max: number;
  windowMs: number;
}): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const key = normalizeKey([input.namespace, ...input.keyParts]);
  const current = memoryStore.get(key);
  const now = nowMs();

  if (!current || current.resetAt <= now) {
    const next: WindowCounter = {
      count: 1,
      resetAt: now + input.windowMs,
    };
    memoryStore.set(key, next);
    return {
      allowed: true,
      remaining: Math.max(0, input.max - 1),
      retryAfterMs: input.windowMs,
    };
  }

  if (current.count >= input.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  memoryStore.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, input.max - current.count),
    retryAfterMs: Math.max(0, current.resetAt - now),
  };
}

