[![en](https://img.shields.io/badge/lang-en-red.svg)](README.md) [![pt-br](https://img.shields.io/badge/lang-pt--br-green.svg)](README_PT.md)

# 🎮 Discord FiveM API

> The ultimate Node.js library for monitoring FiveM servers. Fast, robust, and fully typed.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)

This library allows you to easily interact with FiveM servers to retrieve status, online player lists, active resources, and more. Perfect for Discord bots, dashboards, and administration panels.

---

## ✨ Features

- 🚀 **Full TypeScript**: Strong typing for all methods and events.
- 🔗 **Resolve cfx.re Links**: Accepts `cfx.re/join/xxxx` and resolves to the real IP automatically.
- ⚡ **Performance**: Built-in cache (TTL) to reduce server API calls.
- 🛡️ **Robustness**: Automatic **Retry** system and **Circuit Breaker** to handle network failures.
- 🔄 **Auto-Updates**: Event system (Polling) to detect when players join/leave.
- 🌐 **Multi-Server**: Manage dozens of servers with a single `MultiServerManager` instance.
- ⚙️ **Lifecycle Control**: `start()`, `stop()`, and `destroy()` methods for efficient memory management.

---

## 📦 Installation

Install via npm (directly from GitHub while not published):

```bash
npm install github:jjuniornoc-rgb/fivem-api
```

Or if you prefer `git+https`:
```bash
npm install git+https://github.com/jjuniornoc-rgb/fivem-api.git
```

---

## 🚀 Basic Usage

### Connecting to a server

You can connect using IP and port, or a direct cfx.re link.

```typescript
import { DiscordFivemApi } from 'fivem-api';

const api = new DiscordFivemApi({
  address: 'cfx.re/join/p7zxb5', // Or IP '127.0.0.1'
  port: 30120, // Optional if using cfx.re link
  interval: 5000, // Update every 5 seconds
});

// Start monitoring
api.start();

api.on('ready', () => {
    console.log('✅ Connected to FiveM server!');
});

api.on('playerJoin', (player) => {
    console.log(`👋 ${player.name} joined the server (ID: ${player.id})`);
});

api.on('playerLeave', (player) => {
    console.log(`🚪 ${player.name} left the server.`);
});
```

### Fetching data on demand

```typescript
// Check if online
const status = await api.getStatus(); // 'online' | 'offline'

// Get player count
const onlineCount = await api.getPlayersOnline();
const maxPlayers = await api.getMaxPlayers();

console.log(`Players: ${onlineCount}/${maxPlayers}`);

// Get list and sort
const players = await api.getServerPlayers();
const sortedPlayers = api.sortPlayers(players, 'name', 'asc');
```

---

## 🛠️ Advanced Configuration

The `DiscordFivemApi` class accepts several options to customize behavior:

```typescript
const api = new DiscordFivemApi({
  address: '192.168.1.100',
  port: 30120,
  
  // Returns Player/Server class instances with helper methods instead of raw JSON
  useStructure: true,
  
  // Cache requests for 2 seconds (avoids API spam)
  cacheTtlMs: 2000,
  
  // Check interval for join/leave events (ms)
  interval: 2500,

  // Try to reconnect up to 3 times on http failure
  retry: {
      maxAttempts: 3,
      initialDelayMs: 1000
  },

  // Circuit Breaker: stop trying if it fails 5 times in a row for 30s
  circuitBreaker: {
      failureThreshold: 5,
      cooldownMs: 30000
  }
});
```

---

## 🌐 Managing Multiple Servers

If you have a bot monitoring multiple servers, use `MultiServerManager`. It centralizes events and prevents memory leaks.

```typescript
import { MultiServerManager } from 'fivem-api';

const manager = new MultiServerManager();

// Add servers
manager.addServer('roleplay', { address: 'cfx.re/join/abc1234' });
manager.addServer('pvp', { address: '127.0.0.1', port: 30121 });

// Start all
manager.startAll();

// Listen to events from ALL servers
manager.on('playerJoin', ({ serverId, player }) => {
    console.log(`[${serverId}] ${player.name} joined.`);
});

// Get status of all at once
const statusMap = await manager.getAllStatus();
// { roleplay: 'online', pvp: 'offline' }

// Stop a specific server
manager.stopServer('pvp');
```

---

## ♻️ Lifecycle - Important!

To prevent **Memory Leaks**, always stop monitoring when it's no longer needed.

```typescript
// Start polling
api.start();

// Check if running
if (api.isRunning) {
    console.log("Monitoring active");
}

// Stop polling (keeps config, can restart with start())
api.stop();

// DESTROY (Clears everything, removes listeners and cache. Use when shutting down the bot/component)
api.destroy();
```

---

## 📚 API Reference

### Main Methods (`DiscordFivemApi`)

| Method | Return | Description |
|--------|---------|-----------|
| `start()` | `void` | Starts monitoring. |
| `stop()` | `void` | Pauses monitoring. |
| `destroy()` | `void` | Clears everything and removes listeners. |
| `getStatus()` | `Promise<'online'\|'offline'>` | Checks connectivity with the server. |
| `getPlayersOnline()` | `Promise<number>` | Returns current player count. |
| `getMaxPlayers()` | `Promise<number>` | Returns max capacity (sv_maxClients). |
| `getServerPlayers()` | `Promise<Player[]>` | Returns full player list. |
| `getServerData()` | `Promise<Server>` | Returns server data (vars, resources, etc). |

### Events

| Event | Payload | When does it occur? |
|--------|---------|----------------|
| `playerJoin` | `player` | Player joined the server. |
| `playerLeave` | `player` | Player left the server. |
| `resourceAdd` | `resourceName` | A resource was started. |
| `resourceRemove` | `resourceName` | A resource was stopped. |
| `ready` | `void` | Initial connection established successfully. |

---

## 📝 License

Copyright © 2026 **[Junior Noc](https://discord.com/users/884180120850563112)**.
Distributed under the [MIT](LICENSE.md) license.

---

Made with ❤️ by **Junior Noc**.
