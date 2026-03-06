const SENSITIVE_FIELD_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /authorization/i,
  /api[-_]?key/i,
  /access[-_]?key/i,
  /client[-_]?secret/i,
  /private[-_]?key/i,
  /cookie/i,
];

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function redactString(value: string): string {
  if (value.length <= 4) {
    return "[REDACTED]";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function redactSensitiveData<T = unknown>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item)) as T;
  }

  if (typeof input === "object") {
    const record = input as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (shouldRedactKey(key)) {
        if (typeof value === "string") {
          next[key] = redactString(value);
        } else {
          next[key] = "[REDACTED]";
        }
      } else {
        next[key] = redactSensitiveData(value);
      }
    }

    return next as T;
  }

  return input;
}
