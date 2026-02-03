# fivem-api

> Biblioteca Node.js para interagir com servidores FiveM: status, jogadores e recursos. Suporta **IP:porta** e **links cfx.re/join**. Ideal para bots Discord e apps Node.

[![GitHub](https://img.shields.io/badge/install-from%20GitHub-24292e?logo=github)](https://github.com/jjuniornoc-rgb/varlet-fivem-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Índice

- [Instalação](#instalação)
- [Uso rápido](#uso-rápido)
- [Opções](#opções)
- [API](#api)
- [Múltiplos servidores](#múltiplos-servidores)
- [Documentação](#documentação)
- [Licença](#licença)

---

## Instalação

Instale direto do **GitHub** (o npm compila o TypeScript automaticamente ao instalar):

```bash
npm install github:jjuniornoc-rgb/fivem-api
```

Ou com a URL completa:

```bash
npm install git+https://github.com/jjuniornoc-rgb/fivem-api.git
```

No código use: `require('fivem-api')` ou `import ... from 'fivem-api'`.

*Quando publicado no npm, também será possível: `npm install fivem-api`*

---

## Uso rápido

Use **IP e porta** ou um **link cfx.re/join**. Com link (ex.: `https://cfx.re/join/p7zxb5`), o pacote resolve para o IP real na primeira chamada.

**JavaScript (CommonJS)**

```javascript
const { DiscordFivemApi } = require('fivem-api');

const api = new DiscordFivemApi({
  address: '93.123.22.56',
  port: 30120,
  useStructure: true,
}, true);

api.on('ready', () => console.log('Conectado'));
api.getStatus().then(status => console.log('Status:', status));
```

**Com link cfx.re**

```javascript
const apiByLink = new DiscordFivemApi({
  address: 'https://cfx.re/join/p7zxb5',
  useStructure: true,
}, true);
```

**TypeScript**

```typescript
import { DiscordFivemApi, Player, Server } from 'fivem-api';

const api = new DiscordFivemApi({
  address: 'https://cfx.re/join/p7zxb5',
  useStructure: true,
  cacheTtlMs: 5000,
}, true);

api.on('readyPlayers', (players) => {
  const sorted = api.sortPlayers(players, 'name', 'asc');
  console.log(sorted);
});
```

O segundo argumento do construtor (**`init`**) indica se os dados devem ser carregados e o polling iniciado imediatamente (`true`).

---

## Opções

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `address` | `string` | *obrigatório* | IP/host do servidor ou **link cfx.re/join** |
| `port` | `number` | `30120` | Porta (ignorada quando `address` é link cfx.re) |
| `useStructure` | `boolean` | `false` | Retornar instâncias `Player` e `Server` em vez de objetos simples |
| `interval` | `number` | `2500` | Intervalo de polling (ms) para eventos de jogadores/recursos |
| `cacheTtlMs` | `number` | `0` | TTL do cache em ms (`0` = sem cache) |
| `retry` | `object` \| `true` | `false` | Retentativas com backoff exponencial |
| `circuitBreaker` | `object` \| `true` | `false` | Circuit breaker após falhas repetidas |

---

## API

### Métodos

| Método | Retorno |
|--------|---------|
| `getStatus()` | `Promise<'online' \| 'offline'>` |
| `getServerData()` | `Promise<Server \| object>` |
| `getServerPlayers()` | `Promise<Player[] \| object[]>` |
| `getPlayersOnline()` | `Promise<number>` |
| `getMaxPlayers()` | `Promise<number>` |
| `filterPlayers(players, predicate)` | Array filtrado |
| `sortPlayers(players, key, 'asc' \| 'desc')` | Array ordenado |

### Controle de Lifecycle

| Método/Propriedade | Descrição |
|--------------------|-----------|
| `start()` | Inicia o polling de jogadores/recursos |
| `stop()` | Para o polling (pode ser reiniciado com `start()`) |
| `destroy()` | Para polling, limpa cache e remove todos os listeners |
| `isRunning` | `boolean` - Indica se o polling está ativo |

### Eventos

| Evento | Payload |
|--------|---------|
| `ready` | — |
| `readyPlayers` | `players` |
| `readyResources` | `resources` |
| `playerJoin` | `player` |
| `playerLeave` | `player` |
| `resourceAdd` | `resource` (string) |
| `resourceRemove` | `resource` (string) |

---

## Múltiplos servidores

Use **MultiServerManager** para gerenciar vários servidores; os eventos incluem `serverId`.

```javascript
const { MultiServerManager } = require('fivem-api');

const manager = new MultiServerManager();
manager.addServer('main', { address: '127.0.0.1', port: 30120 }, true);
manager.addServer('backup', { address: 'https://cfx.re/join/abc123' }, true);

manager.on('playerJoin', ({ serverId, player }) => {
  console.log(`[${serverId}]`, player.name, 'entrou');
});

const statuses = await manager.getAllStatus();
// { main: 'online', backup: 'offline' }
```

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [Documentação completa](docs/README.md) | Índice da documentação (dev, migração, API) |
| [Guia para desenvolvedores](docs/DEV.md) | Arquitetura, testes, build, CI e publicação |
| [Migração JS → TS](MIGRATION.md) | Guia de migração para TypeScript |
| [Contribuição](CONTRIBUTING.md) | Como contribuir com o projeto |
| [Changelog](CHANGELOG.md) | Histórico de alterações |

Referência da API (TypeDoc): após `npm run docs`, abra `docs/api/`.

---

## Licença

MIT © [xliel](https://discord.com/users/417398665670295572)
