import { EventEmitter } from 'events';
import { DiscordFivemApi } from './DiscordFivemApi';
import { Player } from './structures/index';
import type { DiscordFivemApiOptions, DiscordFivemApiServerEntry, RawPlayerIdentifiers, ServerStatus } from './types';

export interface MultiServerManagerEventMap {
  ready: [serverId: string];
  playerJoin: [payload: { serverId: string; player: Player | RawPlayerIdentifiers }];
  playerLeave: [payload: { serverId: string; player: Player | RawPlayerIdentifiers }];
  resourceAdd: [payload: { serverId: string; resource: string }];
  resourceRemove: [payload: { serverId: string; resource: string }];
}

export class MultiServerManager extends EventEmitter {
  private readonly servers = new Map<string, DiscordFivemApi>();

  addServer(id: string, options: DiscordFivemApiOptions, init = false): DiscordFivemApi {
    if (this.servers.has(id)) {
      return this.servers.get(id)!;
    }
    const api = new DiscordFivemApi(options, init);
    this.servers.set(id, api);

    api.on('ready', () => this.emit('ready', id));
    api.on('playerJoin', (player) => this.emit('playerJoin', { serverId: id, player }));
    api.on('playerLeave', (player) => this.emit('playerLeave', { serverId: id, player }));
    api.on('resourceAdd', (resource) => this.emit('resourceAdd', { serverId: id, resource }));
    api.on('resourceRemove', (resource) => this.emit('resourceRemove', { serverId: id, resource }));

    return api;
  }

  stopServer(id: string): boolean {
    const api = this.servers.get(id);
    if (api) {
      api.stop();
      return true;
    }
    return false;
  }

  startServer(id: string): boolean {
    const api = this.servers.get(id);
    if (api) {
      api.start();
      return true;
    }
    return false;
  }

  removeServer(id: string): boolean {
    const api = this.servers.get(id);
    if (api) {
      api.destroy();
    }
    return this.servers.delete(id);
  }

  getServer(id: string): DiscordFivemApi | undefined {
    return this.servers.get(id);
  }

  getServerIds(): string[] {
    return Array.from(this.servers.keys());
  }

  get size(): number {
    return this.servers.size;
  }

  async getAllStatus(): Promise<Record<string, ServerStatus>> {
    const entries = Array.from(this.servers.entries());
    const results = await Promise.all(
      entries.map(async ([id, api]) => {
        const status = await api.getStatus().catch(() => 'offline' as ServerStatus);
        return [id, status] as const;
      })
    );
    return Object.fromEntries(results);
  }

  stopAll(): void {
    for (const api of this.servers.values()) {
      api.stop();
    }
  }

  startAll(): void {
    for (const api of this.servers.values()) {
      api.start();
    }
  }

  destroyAll(): void {
    for (const api of this.servers.values()) {
      api.destroy();
    }
    this.servers.clear();
    this.removeAllListeners();
  }

  static fromEntries(entries: DiscordFivemApiServerEntry[]): MultiServerManager {
    const manager = new MultiServerManager();
    for (const { id, options, init } of entries) {
      manager.addServer(id, options, init ?? false);
    }
    return manager;
  }
}
