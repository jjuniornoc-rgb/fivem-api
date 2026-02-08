import { httpGet } from './httpClient';

const CFX_JOIN_REGEX = /cfx\.re\/join\/([a-zA-Z0-9]+)/i;
const CFX_API_BASE = 'https://servers-frontend.fivem.net/api/servers/single';
const RESOLVE_TIMEOUT = 10000;

export interface CfxResolvedEndpoint {
  address: string;
  port: number;
}

export function isCfxJoinLink(input: string): boolean {
  return CFX_JOIN_REGEX.test(input.trim());
}

export function extractCfxCode(input: string): string | null {
  const match = input.trim().match(CFX_JOIN_REGEX);
  return match ? match[1] : null;
}

interface CfxApiServerResponse {
  Data?: {
    connectEndPoints?: string[];
    ConnectEndPoints?: string[];
  };
  connectEndPoints?: string[];
  ConnectEndPoints?: string[];
  [key: string]: unknown;
}

export async function resolveCfxJoinCode(code: string): Promise<CfxResolvedEndpoint> {
  const url = `${CFX_API_BASE}/${encodeURIComponent(code)}`;
  const data = await httpGet<CfxApiServerResponse>(url, { timeout: RESOLVE_TIMEOUT });

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

export async function resolveCfxJoinLink(input: string): Promise<CfxResolvedEndpoint | null> {
  const code = extractCfxCode(input);
  if (!code) return null;
  return resolveCfxJoinCode(code);
}

const resolvedCache = new Map<string, CfxResolvedEndpoint>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const cacheExpiry = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [code, expiry] of cacheExpiry) {
    if (expiry <= now) {
      resolvedCache.delete(code);
      cacheExpiry.delete(code);
    }
  }
}, CACHE_TTL_MS);

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
