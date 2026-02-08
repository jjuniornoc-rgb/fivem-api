import { EventEmitter } from 'events';
import { Player, Server } from './structures/index';
import { httpGet, httpGetWithRetry } from './util/httpClient';
import { DfaError, DfaTypeError } from './util/Error';
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
  private _resolvedEndpoint: { address: string; port: number } | null = null;
  private _pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  private _initialized = false;

  constructor(options: DiscordFivemApiOptions, init = false) {
    super();

    const isCfx = typeof options.address === 'string' && isCfxJoinLink(options.address);
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
    if (this.options.useStructure !== undefined && typeof this.options.useStructure !== 'boolean') {
      throw new DfaTypeError('INVALID_USE_STRUCTURE', 'The useStructure option must be a boolean.');
    }

    this.useStructure = this.options.useStructure;
    this.address = this.options.address;
    this.port = this.options.port;

    this.circuitBreaker = this.options.circuitBreaker
      ? new CircuitBreaker(this.options.circuitBreaker)
      : null;
    this.cacheInfo = this.options.cacheTtlMs > 0
      ? new TtlCache<string, RawServerInfo>(this.options.cacheTtlMs)
      : null;
    this.cachePlayers = this.options.cacheTtlMs > 0
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
        return httpGetWithRetry<T>(url, { timeout: REQUEST_TIMEOUT }, this.options.retry);
      }
      return httpGet<T>(url, { timeout: REQUEST_TIMEOUT });
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
        return Promise.resolve(this.useStructure ? new Server(cached) : cached);
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
        const result = this.useStructure ? cached.map((p) => new Player(p)) : cached;
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

  filterPlayers(
    players: (Player | RawPlayerIdentifiers)[],
    predicate: PlayerFilter<Player | RawPlayerIdentifiers>
  ): (Player | RawPlayerIdentifiers)[] {
    return players.filter(predicate);
  }

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

  get isRunning(): boolean {
    return this._pollingIntervalId !== null;
  }

  start(): void {
    if (this._pollingIntervalId !== null) return;
    this._startPolling();
  }

  stop(): void {
    if (this._pollingIntervalId !== null) {
      clearInterval(this._pollingIntervalId);
      this._pollingIntervalId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.cacheInfo?.destroy();
    this.cachePlayers?.destroy();
    this.removeAllListeners();
    this._players = [];
    this.resources = [];
    this._initialized = false;
  }

  private _startPolling(): void {
    const intervalMs = this.options.interval ?? DEFAULT_INTERVAL;
    this._pollingIntervalId = setInterval(async () => {
      await this._pollOnce();
    }, intervalMs);
  }

  private async _pollOnce(): Promise<void> {
    const [playersResult, serverDataResult] = await Promise.all([
      this.getServerPlayers().catch(() => []),
      this.getServerData().catch(() => ({} as RawServerInfo)),
    ]);

    const newPlayersList = Array.isArray(playersResult) ? playersResult : [];
    const oldPlayerIds = new Set(this._players.map((p) => (p as { id?: number }).id));
    const newPlayerIds = new Set(newPlayersList.map((p) => (p as { id?: number }).id));

    for (const player of newPlayersList) {
      const id = (player as { id?: number }).id;
      if (!oldPlayerIds.has(id)) {
        this.emit('playerJoin', player);
      }
    }

    for (const player of this._players) {
      const id = (player as { id?: number }).id;
      if (!newPlayerIds.has(id)) {
        this.emit('playerLeave', player);
      }
    }

    this._players = newPlayersList;

    const rawData = (serverDataResult as RawServerInfo) ?? {};
    const newResources = Array.isArray(rawData.resources) ? rawData.resources : [];
    const oldResourcesSet = new Set(this.resources);
    const newResourcesSet = new Set(newResources);

    for (const resource of newResources) {
      if (!oldResourcesSet.has(resource)) {
        this.emit('resourceAdd', resource);
      }
    }

    for (const resource of this.resources) {
      if (!newResourcesSet.has(resource)) {
        this.emit('resourceRemove', resource);
      }
    }

    this.resources = newResources;
  }

  async _init(): Promise<void> {
    if (this._initialized) return;
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
