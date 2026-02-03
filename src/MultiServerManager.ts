import { EventEmitter } from 'events';
import { DiscordFivemApi } from './DiscordFivemApi';
import { Player } from './structures/index';
import type { DiscordFivemApiOptions, DiscordFivemApiServerEntry, RawPlayerIdentifiers, ServerStatus } from './types';

/** Typed event map for MultiServerManager */
export interface MultiServerManagerEventMap {
  ready: [serverId: string];
  playerJoin: [payload: { serverId: string; player: Player | RawPlayerIdentifiers }];
  playerLeave: [payload: { serverId: string; player: Player | RawPlayerIdentifiers }];
  resourceAdd: [payload: { serverId: string; resource: string }];
  resourceRemove: [payload: { serverId: string; resource: string }];
}

/**
 * Manages multiple FiveM servers (multiple DiscordFivemApi instances) under a single interface.
 * Use addServer/removeServer to manage servers; getServer(id) to access a single API;
 * getAllStatus() to get status of all servers. Events are re-emitted with serverId.
 */
export class MultiServerManager extends EventEmitter {
  private readonly servers = new Map<string, DiscordFivemApi>();

  /**
   * Add a server. If init is true, starts polling for that server immediately.
   */
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

  /**
   * Stop polling for a specific server without removing it.
   */
  stopServer(id: string): boolean {
    const api = this.servers.get(id);
    if (api) {
      api.stop();
      return true;
    }
    return false;
  }

  /**
   * Start polling for a specific server that was previously stopped.
   */
  startServer(id: string): boolean {
    const api = this.servers.get(id);
    if (api) {
      api.start();
      return true;
    }
    return false;
  }

  /**
   * Remove a server by id. Stops polling and destroys the instance before removing.
   */
  removeServer(id: string): boolean {
    const api = this.servers.get(id);
    if (api) {
      api.destroy();
    }
    return this.servers.delete(id);
  }

  /**
   * Get a DiscordFivemApi instance by id.
   */
  getServer(id: string): DiscordFivemApi | undefined {
    return this.servers.get(id);
  }

  /**
   * Get all server ids.
   */
  getServerIds(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * Returns the number of managed servers.
   */
  get size(): number {
    return this.servers.size;
  }

  /**
   * Get status of all servers in parallel. Returns a map id -> 'online' | 'offline'.
   */
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

  /**
   * Stop polling for all servers.
   */
  stopAll(): void {
    for (const api of this.servers.values()) {
      api.stop();
    }
  }

  /**
   * Start polling for all servers.
   */
  startAll(): void {
    for (const api of this.servers.values()) {
      api.start();
    }
  }

  /**
   * Destroy all server instances and clear the manager.
   * After calling this, the manager is empty and should not be used anymore.
   */
  destroyAll(): void {
    for (const api of this.servers.values()) {
      api.destroy();
    }
    this.servers.clear();
    this.removeAllListeners();
  }

  /**
   * Create manager and add servers from an array of entries (id + options + optional init).
   */
  static fromEntries(entries: DiscordFivemApiServerEntry[]): MultiServerManager {
    const manager = new MultiServerManager();
    for (const { id, options, init } of entries) {
      manager.addServer(id, options, init ?? false);
    }
    return manager;
  }
}
