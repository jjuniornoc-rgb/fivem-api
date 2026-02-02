import axios from 'axios';

const CFX_JOIN_REGEX = /cfx\.re\/join\/([a-zA-Z0-9]+)/i;
const CFX_API_BASE = 'https://servers-frontend.fivem.net/api/servers/single';
const RESOLVE_TIMEOUT = 10000;

/** Result of resolving a cfx.re/join link to a direct endpoint */
export interface CfxResolvedEndpoint {
  address: string;
  port: number;
}

/**
 * Checks if the given string is a cfx.re join link (e.g. https://cfx.re/join/p7zxb5 or cfx.re/join/p7zxb5).
 */
export function isCfxJoinLink(input: string): boolean {
  return CFX_JOIN_REGEX.test(input.trim());
}

/**
 * Extracts the join code from a cfx.re link (e.g. "https://cfx.re/join/p7zxb5" -> "p7zxb5").
 * Returns null if the input is not a valid cfx.re join link.
 */
export function extractCfxCode(input: string): string | null {
  const match = input.trim().match(CFX_JOIN_REGEX);
  return match ? match[1] : null;
}

/**
 * Response shape from FiveM servers-frontend API (single server).
 * The API may return ConnectEndPoints or connectEndPoints with array of "ip:port" strings.
 */
interface CfxApiServerResponse {
  Data?: {
    connectEndPoints?: string[];
    ConnectEndPoints?: string[];
  };
  connectEndPoints?: string[];
  ConnectEndPoints?: string[];
  [key: string]: unknown;
}

/**
 * Resolves a cfx.re join code to the server's IP and port using the official FiveM API.
 * @see https://servers-frontend.fivem.net/api/servers/single/{code}
 */
export async function resolveCfxJoinCode(code: string): Promise<CfxResolvedEndpoint> {
  const url = `${CFX_API_BASE}/${encodeURIComponent(code)}`;
  const res = await axios.get<CfxApiServerResponse>(url, { timeout: RESOLVE_TIMEOUT });
  const data = res.data;

  const endpoints: string[] | undefined =
    data.Data?.connectEndPoints ??
    data.Data?.ConnectEndPoints ??
    data.connectEndPoints ??
    data.ConnectEndPoints;

  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    throw new Error(`Cfx.re API did not return connect endpoints for code: ${code}`);
  }

  const first = endpoints[0];
  if (typeof first !== 'string') {
    throw new Error(`Invalid connect endpoint for code: ${code}`);
  }

  const parts = first.split(':');
  const address = parts[0]?.trim() ?? '';
  const port = parseInt(parts[1] ?? '30120', 10);

  if (!address || Number.isNaN(port)) {
    throw new Error(`Could not parse endpoint "${first}" for code: ${code}`);
  }

  return { address, port };
}

/**
 * Resolves a cfx.re join link (URL or code) to address and port.
 * If the input is not a cfx.re link, returns null (caller should use address/port as-is).
 */
export async function resolveCfxJoinLink(input: string): Promise<CfxResolvedEndpoint | null> {
  const code = extractCfxCode(input);
  if (!code) return null;
  return resolveCfxJoinCode(code);
}

/** In-memory cache for resolved cfx.re codes (code -> { address, port }) to avoid repeated API calls */
const resolvedCache = new Map<string, CfxResolvedEndpoint>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cacheExpiry = new Map<string, number>();

/**
 * Resolves a cfx.re join code with a short-lived cache to reduce API calls.
 */
export async function resolveCfxJoinCodeCached(code: string): Promise<CfxResolvedEndpoint> {
  const now = Date.now();
  const cached = resolvedCache.get(code);
  if (cached && (cacheExpiry.get(code) ?? 0) > now) {
    return cached;
  }
  const result = await resolveCfxJoinCode(code);
  resolvedCache.set(code, result);
  cacheExpiry.set(code, now + CACHE_TTL_MS);
  return result;
}
