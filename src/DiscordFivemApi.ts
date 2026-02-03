import { EventEmitter } from 'events';
import axios from 'axios';
import { Player, Server } from './structures/index';
import { DfaError, DfaTypeError } from './util/Error';
import { fetchWithRetry } from './util/fetchWithRetry';
import { CircuitBreaker } from './util/circuitBreaker';
import { TtlCache } from './util/cache';
import { extractCfxCode, isCfxJoinLink, resolveCfxJoinCodeCached } from './util/cfxResolver';
import type {
  DiscordFivemApiOptions,
  RawServerInfo,
  RawPlayerIdentifiers,
  ServerStatus,
  RejectedServerData,
  RejectedPlayers,
  RejectedPlayersOnline,
  RejectedMaxPlayers,
  RetryOptions,
  CircuitBreakerOptions,
  PlayerFilter,
  PlayerSortKey,
} from './types';

const DEFAULT_PORT = 30120;
const DEFAULT_INTERVAL = 2500;
const REQUEST_TIMEOUT = 5000;

const CACHE_KEY_INFO = 'info';
const CACHE_KEY_PLAYERS = 'players';

export interface ResolvedDiscordFivemApiOptions extends Required<Omit<DiscordFivemApiOptions, 'retry' | 'circuitBreaker'>> {
  retry: RetryOptions | false;
  circuitBreaker: CircuitBreakerOptions | false;
}

/** Typed event map for DiscordFivemApi */
export interface DiscordFivemApiEventMap {
  ready: [];
  readyPlayers: [players: (Player | RawPlayerIdentifiers)[]];
  readyResources: [resources: string[]];
  playerJoin: [player: Player | RawPlayerIdentifiers];
  playerLeave: [player: Player | RawPlayerIdentifiers];
  resourceAdd: [resource: string];
  resourceRemove: [resource: string];
}

export class DiscordFivemApi extends EventEmitter {
  readonly options: ResolvedDiscordFivemApiOptions;
  readonly address: string;
  readonly port: number;
  readonly useStructure: boolean;
  private _players: (Player | RawPlayerIdentifiers)[] = [];
  resources: string[] = [];
  private readonly circuitBreaker: CircuitBreaker | null;
  private readonly cacheInfo: TtlCache<string, RawServerInfo> | null;
  private readonly cachePlayers: TtlCache<string, RawPlayerIdentifiers[]> | null;
  /** Resolved IP:port when address is a cfx.re/join link; set on first use */
  private _resolvedEndpoint: { address: string; port: number } | null = null;
  /** Interval ID for polling - stored to allow cleanup */
  private _pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  /** Flag indicating if polling has been initialized */
  private _initialized = false;

  constructor(options: DiscordFivemApiOptions, init = false) {
    super();

    const isCfx =
      typeof options.address === 'string' && isCfxJoinLink(options.address);
    this.options = {
      address: options.address,
      port: isCfx ? (options.port ?? 0) : (options.port ?? DEFAULT_PORT),
      useStructure: options.useStructure ?? false,
      interval: options.interval ?? DEFAULT_INTERVAL,
      cacheTtlMs: options.cacheTtlMs ?? 0,
      retry: options.retry === true ? {} : (options.retry ?? false),
      circuitBreaker: options.circuitBreaker === true ? {} : (options.circuitBreaker ?? false),
    };

    if (!this.options.address) {
      throw new DfaError('NO_ADDRESS', 'No address was provided.');
    }
    if (typeof this.options.address !== 'string') {
      throw new DfaTypeError('INVALID_ADDRESS', 'The address option must be a string.');
    }
    if (typeof this.options.port !== 'number') {
      throw new DfaTypeError('INVALID_PORT', 'The port option must be a number.');
    }
    if (!isCfx && this.options.port <= 0) {
      throw new DfaTypeError('INVALID_PORT', 'The port option must be a positive number when using IP/hostname.');
    }
    if (typeof this.options.interval !== 'number') {
      throw new DfaTypeError('INVALID_INTERVAL', 'The interval option must be a number.');
    }
    if (typeof init !== 'boolean') {
      throw new DfaTypeError('INVALID_INIT', 'The init option must be a boolean.');
    }
    if (
      this.options.useStructure !== undefined &&
      typeof this.options.useStructure !== 'boolean'
    ) {
      throw new DfaTypeError(
        'INVALID_USE_STRUCTURE',
        'The useStructure option must be a boolean.'
      );
    }

    this.useStructure = this.options.useStructure;
    this.address = this.options.address;
    this.port = this.options.port;

    this.circuitBreaker = this.options.circuitBreaker
      ? new CircuitBreaker(this.options.circuitBreaker)
      : null;
    this.cacheInfo =
      this.options.cacheTtlMs > 0
        ? new TtlCache<string, RawServerInfo>(this.options.cacheTtlMs)
        : null;
    this.cachePlayers =
      this.options.cacheTtlMs > 0
        ? new TtlCache<string, RawPlayerIdentifiers[]>(this.options.cacheTtlMs)
        : null;

    if (init) this._init();
  }

  get players(): (Player | RawPlayerIdentifiers)[] {
    return this._players;
  }

  set players(players: (Player | RawPlayerIdentifiers)[]) {
    this._players = players;
  }

  /**
   * Resolves address:port. When address is a cfx.re/join link, calls FiveM API once and caches the result.
   */
  private async _getResolvedEndpoint(): Promise<{ address: string; port: number }> {
    if (this._resolvedEndpoint) return this._resolvedEndpoint;
    if (!isCfxJoinLink(this.address)) {
      return { address: this.address, port: this.port };
    }
    const code = extractCfxCode(this.address);
    if (!code) throw new DfaError('INVALID_CFX_LINK', 'Could not extract join code from cfx.re link.');
    const resolved = await resolveCfxJoinCodeCached(code);
    this._resolvedEndpoint = resolved;
    return resolved;
  }

  private async _getBaseUrl(): Promise<string> {
    const { address, port } = await this._getResolvedEndpoint();
    return `http://${address}:${port}`;
  }

  private async _fetch<T>(url: string): Promise<T> {
    const doFetch = async (): Promise<T> => {
      if (this.options.retry) {
        return fetchWithRetry<T>(url, { timeout: REQUEST_TIMEOUT }, this.options.retry);
      }
      const res = await axios.get<T>(url, { timeout: REQUEST_TIMEOUT });
      return res.data;
    };
    if (this.circuitBreaker) {
      return this.circuitBreaker.execute(doFetch);
    }
    return doFetch();
  }

  getStatus(): Promise<ServerStatus> {
    return this._getBaseUrl()
      .then((baseUrl) => this._fetch(`${baseUrl}/info.json`))
      .then(() => 'online' as ServerStatus)
      .catch(() => 'offline' as ServerStatus);
  }

  getServerData(): Promise<RawServerInfo | Server | RejectedServerData> {
    if (this.cacheInfo) {
      const cached = this.cacheInfo.get(CACHE_KEY_INFO);
      if (cached !== undefined) {
        return Promise.resolve(
          this.useStructure ? new Server(cached) : cached
        );
      }
    }
    return this._getBaseUrl().then((baseUrl) =>
      this._fetch<RawServerInfo>(`${baseUrl}/info.json`)
        .then((data) => {
          if (this.cacheInfo) this.cacheInfo.set(CACHE_KEY_INFO, data);
          if (this.useStructure) return new Server(data);
          return data;
        })
        .catch((err: { message: string; stack?: string }) =>
          Promise.reject({
            error: { message: err.message, stack: err.stack },
            data: {},
          } as RejectedServerData)
        )
    );
  }

  getServerPlayers(): Promise<(Player | RawPlayerIdentifiers)[] | RejectedPlayers> {
    if (this.cachePlayers) {
      const cached = this.cachePlayers.get(CACHE_KEY_PLAYERS);
      if (cached !== undefined) {
        const result = this.useStructure
          ? cached.map((p) => new Player(p))
          : cached;
        return Promise.resolve(result);
      }
    }
    return this._getBaseUrl().then((baseUrl) =>
      this._fetch<RawPlayerIdentifiers[]>(`${baseUrl}/players.json`)
        .then((data) => {
          if (this.cachePlayers) this.cachePlayers.set(CACHE_KEY_PLAYERS, data);
          if (this.useStructure) {
            const players = data.map((p) => new Player(p));
            this._players = players;
            return players;
          }
          return data;
        })
        .catch((err: { message: string; stack?: string }) =>
          Promise.reject({
            error: { message: err.message, stack: err.stack },
            players: [],
          } as RejectedPlayers)
        )
    );
  }

  getPlayersOnline(): Promise<number | RejectedPlayersOnline> {
    if (this.cachePlayers) {
      const cached = this.cachePlayers.get(CACHE_KEY_PLAYERS);
      if (cached !== undefined) return Promise.resolve(cached.length);
    }
    return this._getBaseUrl().then((baseUrl) =>
      this._fetch<RawPlayerIdentifiers[]>(`${baseUrl}/players.json`)
        .then((data) => data.length)
        .catch((err: { message: string; stack?: string }) =>
          Promise.reject({
            error: { message: err.message, stack: err.stack },
            playersOnline: 0,
          } as RejectedPlayersOnline)
        )
    );
  }

  getMaxPlayers(): Promise<number | RejectedMaxPlayers> {
    if (this.cacheInfo) {
      const cached = this.cacheInfo.get(CACHE_KEY_INFO);
      if (cached !== undefined) {
        const n = cached.vars?.sv_maxClients ?? 0;
        return Promise.resolve(n);
      }
    }
    return this._getBaseUrl().then((baseUrl) =>
      this._fetch<RawServerInfo>(`${baseUrl}/info.json`)
        .then((data) => data.vars?.sv_maxClients ?? 0)
        .catch((err: { message: string; stack?: string }) =>
          Promise.reject({
            error: { message: err.message, stack: err.stack },
            maxPlayers: 0,
          } as RejectedMaxPlayers)
        )
    );
  }

  /**
   * Filter players by predicate. Works on current .players or a given array.
   */
  filterPlayers(
    players: (Player | RawPlayerIdentifiers)[],
    predicate: PlayerFilter<Player | RawPlayerIdentifiers>
  ): (Player | RawPlayerIdentifiers)[] {
    return players.filter(predicate);
  }

  /**
   * Sort players by key (e.g. 'name', 'id'). Supports ascending (default) or descending.
   */
  sortPlayers(
    players: (Player | RawPlayerIdentifiers)[],
    key: PlayerSortKey,
    order: 'asc' | 'desc' = 'asc'
  ): (Player | RawPlayerIdentifiers)[] {
    const getVal = (p: Player | RawPlayerIdentifiers): unknown =>
      (p as Record<string, unknown>)[key];
    return [...players].sort((a, b) => {
      const va = getVal(a) as number | string;
      const vb = getVal(b) as number | string;
      const cmp = va === vb ? 0 : va < vb ? -1 : 1;
      return order === 'desc' ? -cmp : cmp;
    });
  }

  /**
   * Returns whether polling is currently active.
   */
  get isRunning(): boolean {
    return this._pollingIntervalId !== null;
  }

  /**
   * Starts or restarts polling for player and resource changes.
   * If already running, does nothing. Use stop() first if you need to restart.
   */
  start(): void {
    if (this._pollingIntervalId !== null) {
      return; // Already running
    }
    this._startPolling();
  }

  /**
   * Stops the polling interval. Can be restarted with start().
   */
  stop(): void {
    if (this._pollingIntervalId !== null) {
      clearInterval(this._pollingIntervalId);
      this._pollingIntervalId = null;
    }
  }

  /**
   * Completely destroys the instance: stops polling, clears cache, removes all listeners.
   * After calling destroy(), the instance should not be used anymore.
   */
  destroy(): void {
    this.stop();
    this.cacheInfo?.clear();
    this.cachePlayers?.clear();
    this.removeAllListeners();
    this._players = [];
    this.resources = [];
    this._initialized = false;
  }

  /**
   * Internal method to start the polling interval.
   */
  private _startPolling(): void {
    const intervalMs = this.options.interval ?? DEFAULT_INTERVAL;
    this._pollingIntervalId = setInterval(async () => {
      await this._pollOnce();
    }, intervalMs);
  }

  /**
   * Internal method that performs one polling cycle.
   */
  private async _pollOnce(): Promise<void> {
    const newPlayers = await this.getServerPlayers().catch(() => []);
    const newPlayersList = Array.isArray(newPlayers) ? newPlayers : [];

    // Detect player joins and leaves
    if (this._players.length !== newPlayersList.length) {
      if (this._players.length < newPlayersList.length) {
        for (const player of newPlayersList) {
          const exists = this._players.some(
            (p) => (p as { id?: number }).id === (player as { id?: number }).id
          );
          if (!exists) this.emit('playerJoin', player);
        }
      } else {
        for (const player of this._players) {
          const exists = newPlayersList.some(
            (p) => (p as { id?: number }).id === (player as { id?: number }).id
          );
          if (!exists) this.emit('playerLeave', player);
        }
      }
      this._players = newPlayersList;
    }

    // Detect resource changes
    const serverData2 = await this.getServerData().catch(() => ({} as RawServerInfo));
    const raw2 = (serverData2 as RawServerInfo) ?? {};
    const newResources = Array.isArray(raw2.resources) ? raw2.resources : [];

    if (this.resources.length !== newResources.length) {
      if (this.resources.length < newResources.length) {
        for (const resource of newResources) {
          if (this.resources.includes(resource)) continue;
          this.emit('resourceAdd', resource);
        }
      } else {
        for (const resource of this.resources) {
          if (newResources.includes(resource)) continue;
          this.emit('resourceRemove', resource);
        }
      }
      this.resources = newResources;
    }
  }

  /**
   * @deprecated Use start() instead. This method is kept for backward compatibility.
   * Initializes the API: fetches initial data and starts polling.
   */
  async _init(): Promise<void> {
    if (this._initialized) {
      return; // Prevent double initialization
    }
    this._initialized = true;
    this.emit('ready');

    const [serverData, players] = await Promise.all([
      this.getServerData().catch(() => ({} as RawServerInfo)),
      this.getServerPlayers().catch(() => []),
    ]);

    this._players = Array.isArray(players) ? players : [];
    const rawData = (serverData as RawServerInfo) ?? {};
    this.resources = Array.isArray(rawData.resources) ? rawData.resources : [];

    this.emit('readyPlayers', this._players);
    this.emit('readyResources', this.resources);

    this._startPolling();
  }
}
