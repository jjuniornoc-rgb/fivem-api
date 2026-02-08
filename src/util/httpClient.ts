interface RequestOptions {
    timeout?: number;
    headers?: Record<string, string>;
}

export async function httpGet<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 5000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: options.headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return (await response.json()) as T;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function httpGetWithRetry<T>(
    url: string,
    options: RequestOptions = {},
    retryOptions: { maxAttempts?: number; initialDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
    const maxAttempts = retryOptions.maxAttempts ?? 3;
    const initialDelayMs = retryOptions.initialDelayMs ?? 1000;
    const maxDelayMs = retryOptions.maxDelayMs ?? 10000;

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await httpGet<T>(url, options);
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts - 1) {
                const delayMs = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError;
}
