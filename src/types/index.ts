/**
 * Types and interfaces for the FiveM API responses, events, errors, and options.
 */

/** Error codes thrown by the API */
export enum ErrorCode {
  NO_ADDRESS = 'NO_ADDRESS',
  NO_PORT = 'NO_PORT',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_PORT = 'INVALID_PORT',
  INVALID_INTERVAL = 'INVALID_INTERVAL',
  INVALID_INIT = 'INVALID_INIT',
  INVALID_USE_STRUCTURE = 'INVALID_USE_STRUCTURE',
  INVALID_CFX_LINK = 'INVALID_CFX_LINK',
}

/** Raw player item from FiveM players.json (array of identifiers) */
export interface RawPlayerIdentifiers {
  name?: string;
  id?: number;
  identifiers?: string[];
  [key: string]: unknown;
}

/** Parsed player identifiers (key-value from "type:value" strings) */
export interface PlayerIdentifiers {
  [idType: string]: string;
}

/** Raw server info from FiveM info.json */
export interface RawServerInfo {
  vars?: {
    sv_maxClients?: number;
    [key: string]: unknown;
  };
  resources?: string[];
  [key: string]: unknown;
}

/** Options for retry with exponential backoff */
export interface RetryOptions {
  /** Max number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelayMs?: number;
  /** Max delay cap in ms (default: 10000) */
  maxDelayMs?: number;
}

/** Options for circuit breaker */
export interface CircuitBreakerOptions {
  /** Consecutive failures before opening (default: 5) */
  failureThreshold?: number;
  /** Cooldown in ms before half-open (default: 30000) */
  cooldownMs?: number;
}

/** Entry for multi-server manager: id + API options */
export interface DiscordFivemApiServerEntry {
  id: string;
  options: DiscordFivemApiOptions;
  init?: boolean;
}

/** Options for DiscordFivemApi constructor */
export interface DiscordFivemApiOptions {
  /** IP address or hostname of the FiveM server */
  address: string;
  /** Server port (default: 30120) */
  port?: number;
  /** Whether to return Player/Server class instances instead of raw objects (default: false) */
  useStructure?: boolean;
  /** Polling interval in ms for player/resource events (default: 2500) */
  interval?: number;
  /** Cache TTL in ms for getServerData/getServerPlayers (0 = disabled, default: 0) */
  cacheTtlMs?: number;
  /** Retry with exponential backoff; set to enable (default: disabled) */
  retry?: RetryOptions | boolean;
  /** Circuit breaker; set to enable (default: disabled) */
  circuitBreaker?: CircuitBreakerOptions | boolean;
}

/** Rejected response shape from getServerData */
export interface RejectedServerData {
  error: { message: string; stack?: string };
  data: Record<string, never>;
}

/** Rejected response shape from getServerPlayers / getPlayersOnline */
export interface RejectedPlayers {
  error: { message: string; stack?: string };
  players: unknown[];
}

/** Rejected response shape from getPlayersOnline */
export interface RejectedPlayersOnline {
  error: { message: string; stack?: string };
  playersOnline: number;
}

/** Rejected response shape from getMaxPlayers */
export interface RejectedMaxPlayers {
  error: { message: string; stack?: string };
  maxPlayers: number;
}

/** Server status string */
export type ServerStatus = 'online' | 'offline';

/** Predicate for filtering players (Player or raw object) */
export type PlayerFilter<T = RawPlayerIdentifiers> = (player: T) => boolean;

/** Sort key for players (e.g. "name", "id"); supports dot path for nested */
export type PlayerSortKey = keyof RawPlayerIdentifiers | string;

/** Event payloads for DiscordFivemApi events */
export interface DiscordFivemApiEvents {
  ready: [];
  readyPlayers: [players: unknown[]];
  readyResources: [resources: string[]];
  playerJoin: [player: unknown];
  playerLeave: [player: unknown];
  resourceAdd: [resource: string];
  resourceRemove: [resource: string];
}
