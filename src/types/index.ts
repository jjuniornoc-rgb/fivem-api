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

export interface RawPlayerIdentifiers {
  name?: string;
  id?: number;
  identifiers?: string[];
  [key: string]: unknown;
}

export interface PlayerIdentifiers {
  [idType: string]: string;
}

export interface RawServerInfo {
  vars?: {
    sv_maxClients?: number;
    [key: string]: unknown;
  };
  resources?: string[];
  [key: string]: unknown;
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
}

export interface DiscordFivemApiServerEntry {
  id: string;
  options: DiscordFivemApiOptions;
  init?: boolean;
}

export interface DiscordFivemApiOptions {
  address: string;
  port?: number;
  useStructure?: boolean;
  interval?: number;
  cacheTtlMs?: number;
  retry?: RetryOptions | boolean;
  circuitBreaker?: CircuitBreakerOptions | boolean;
}

export interface RejectedServerData {
  error: { message: string; stack?: string };
  data: Record<string, never>;
}

export interface RejectedPlayers {
  error: { message: string; stack?: string };
  players: unknown[];
}

export interface RejectedPlayersOnline {
  error: { message: string; stack?: string };
  playersOnline: number;
}

export interface RejectedMaxPlayers {
  error: { message: string; stack?: string };
  maxPlayers: number;
}

export type ServerStatus = 'online' | 'offline';

export type PlayerFilter<T = RawPlayerIdentifiers> = (player: T) => boolean;

export type PlayerSortKey = keyof RawPlayerIdentifiers | string;

export interface DiscordFivemApiEvents {
  ready: [];
  readyPlayers: [players: unknown[]];
  readyResources: [resources: string[]];
  playerJoin: [player: unknown];
  playerLeave: [player: unknown];
  resourceAdd: [resource: string];
  resourceRemove: [resource: string];
}
