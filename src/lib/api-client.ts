const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

type ApiErrorPayload = { error?: unknown; message?: unknown };

export class ApiRequestError extends Error {
  public constructor(
    message: string,
    public readonly status: number | null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiRequestError";
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as ApiErrorPayload;
  if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error;
  if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message;
  return fallback;
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Runs a same-origin JSON request with a deadline and consistent errors.
 * Client components should still use try/catch/finally so their pending state
 * is released even if the local server or renderer is recovering.
 */
export async function requestJson<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<T> {
  const timeoutController = new AbortController();
  const timeout = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    let response: Response;
    try {
      response = await fetch(input, { ...init, signal });
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw new ApiRequestError(
          "GameHall took too long to respond. Please try again.",
          null,
          { cause: error },
        );
      }
      if (signal.aborted) {
        throw new ApiRequestError("The request was cancelled.", null, { cause: error });
      }
      throw new ApiRequestError(
        "GameHall could not reach its local service. Please try again.",
        null,
        { cause: error },
      );
    }

    const payload = await readPayload(response);
    if (!response.ok) {
      throw new ApiRequestError(
        errorMessage(payload, `The request failed (${response.status}).`),
        response.status,
      );
    }
    return payload as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function messageFromRequestError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
