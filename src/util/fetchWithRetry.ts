import axios, { AxiosRequestConfig } from 'axios';
import type { RetryOptions } from '../types';

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay for attempt index (0-based).
 */
function backoffMs(attempt: number, opts: Required<RetryOptions>): number {
  const delayMs = opts.initialDelayMs * Math.pow(2, attempt);
  return Math.min(delayMs, opts.maxDelayMs);
}

/**
 * Executes a GET request with optional retry and exponential backoff.
 */
export async function fetchWithRetry<T>(
  url: string,
  config: AxiosRequestConfig = {},
  retryOptions: RetryOptions | boolean = false
): Promise<T> {
  const opts: Required<RetryOptions> =
    retryOptions === true
      ? DEFAULT_RETRY
      : { ...DEFAULT_RETRY, ...(typeof retryOptions === 'object' ? retryOptions : {}) };

  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      const res = await axios.get<T>(url, { ...config, timeout: config.timeout ?? 5000 });
      return res.data;
    } catch (err) {
      lastError = err;
      if (attempt === opts.maxAttempts - 1) throw err;
      await delay(backoffMs(attempt, opts));
    }
  }
  throw lastError;
}
