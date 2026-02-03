# 🎮 Discord FiveM API

> A biblioteca Node.js definitiva para monitorar servidores FiveM. Rápida, robusta e totalmente tipada.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)

Esta biblioteca permite que você interaja facilmente com servidores FiveM para obter status, lista de jogadores online, recursos ativos e muito mais. Perfeita para bots de Discord, dashboards e painéis de administração.

---

## ✨ Funcionalidades

- 🚀 **Full TypeScript**: Tipagem forte para todos os métodos e eventos.
- 🔗 **Resolve Links cfx.re**: Aceita `cfx.re/join/xxxx` e resolve para o IP real automaticamente.
- ⚡ **Performance**: Cache embutido (TTL) para reduzir chamadas à API do servidor.
- 🛡️ **Robustez**: Sistema de **Retry** automático e **Circuit Breaker** para lidar com falhas de rede.
- 🔄 **Auto-Updates**: Sistema de eventos (Polling) para detectar quando jogadores entram/saem.
- 🌐 **Multi-Server**: Gerencie dezenas de servidores com uma única instância do `MultiServerManager`.
- ⚙️ **Lifecycle Control**: Métodos `start()`, `stop()` e `destroy()` para gerenciamento eficiente de memória.

---

## 📦 Instalação

Instale via npm (direto do GitHub enquanto não publicado):

```bash
npm install github:jjuniornoc-rgb/fivem-api
```

Ou se preferir `git+https`:
```bash
npm install git+https://github.com/jjuniornoc-rgb/fivem-api.git
```

---

## 🚀 Uso Básico

### Conectando a um servidor

Você pode conectar usando IP e porta, ou um link direto do cfx.re.

```typescript
import { DiscordFivemApi } from 'fivem-api';

const api = new DiscordFivemApi({
  address: 'cfx.re/join/p7zxb5', // Ou IP '127.0.0.1'
  port: 30120, // Opcional se usar link cfx.re
  interval: 5000, // Atualizar a cada 5 segundos
});

// Iniciar monitoramento
api.start();

api.on('ready', () => {
    console.log('✅ Conectado ao servidor FiveM!');
});

api.on('playerJoin', (player) => {
    console.log(`👋 ${player.name} entrou no servidor (ID: ${player.id})`);
});

api.on('playerLeave', (player) => {
    console.log(`🚪 ${player.name} saiu do servidor.`);
});
```

### Obtendo dados sob demanda

```typescript
// Verificar se está online
const status = await api.getStatus(); // 'online' | 'offline'

// Pegar contagem de jogadores
const onlineCount = await api.getPlayersOnline();
const maxPlayers = await api.getMaxPlayers();

console.log(`Jogadores: ${onlineCount}/${maxPlayers}`);

// Pegar lista e ordenar
const players = await api.getServerPlayers();
const sortedPlayers = api.sortPlayers(players, 'name', 'asc');
```

---

## 🛠️ Configuração Avançada

A classe `DiscordFivemApi` aceita várias opções para ajustar o comportamento:

```typescript
const api = new DiscordFivemApi({
  address: '192.168.1.100',
  port: 30120,
  
  // Retorna instâncias de classe Player/Server com métodos auxiliares em vez de JSON puro
  useStructure: true,
  
  // Cache de requisições por 2 segundos (evita spam na API)
  cacheTtlMs: 2000,
  
  // Intervalo de verificação de eventos de entrada/saída (ms)
  interval: 2500,

  // Tentar reconectar até 3 vezes em caso de falha http
  retry: {
      maxAttempts: 3,
      initialDelayMs: 1000
  },

  // Circuit Breaker: para de tentar se falhar 5 vezes seguidas por 30s
  circuitBreaker: {
      failureThreshold: 5,
      cooldownMs: 30000
  }
});
```

---

## 🌐 Gerenciando Múltiplos Servidores

Se você tem um bot que monitora vários servidores, use o `MultiServerManager`. Ele centraliza os eventos e evita memory leaks.

```typescript
import { MultiServerManager } from 'fivem-api';

const manager = new MultiServerManager();

// Adicionar servidores
manager.addServer('roleplay', { address: 'cfx.re/join/abc1234' });
manager.addServer('pvp', { address: '127.0.0.1', port: 30121 });

// Iniciar todos
manager.startAll();

// Escutar eventos de TODOS os servidores
manager.on('playerJoin', ({ serverId, player }) => {
    console.log(`[${serverId}] ${player.name} entrou.`);
});

// Pegar status de todos de uma vez
const statusMap = await manager.getAllStatus();
// { roleplay: 'online', pvp: 'offline' }

// Parar um servidor específico
manager.stopServer('pvp');
```

---

## ♻️ Ciclo de Vida (Lifecycle) - Importante!

Para evitar **Memory Leaks** (vazamento de memória), sempre pare o monitoramento quando não precisar mais.

```typescript
// Iniciar polling
api.start();

// Verificar se está rodando
if (api.isRunning) {
    console.log("Monitoramento ativo");
}

// Parar polling (mantém configurações, pode reiniciar com start())
api.stop();

// DESTRUIR (Limpa tudo, remove listeners e cache. Use ao desligar o bot/componente)
api.destroy();
```

---

## 📚 Referência da API

### Métodos Principais (`DiscordFivemApi`)

| Método | Retorno | Descrição |
|--------|---------|-----------|
| `start()` | `void` | Inicia o monitoramento. |
| `stop()` | `void` | Pausa o monitoramento. |
| `destroy()` | `void` | Limpa tudo e remove listeners. |
| `getStatus()` | `Promise<'online'\|'offline'>` | Verifica conectividade com o servidor. |
| `getPlayersOnline()` | `Promise<number>` | Retorna quantidade atual de jogadores. |
| `getMaxPlayers()` | `Promise<number>` | Retorna capacidade máxima (sv_maxClients). |
| `getServerPlayers()` | `Promise<Player[]>` | Retorna lista completa de jogadores. |
| `getServerData()` | `Promise<Server>` | Retorna dados do servidor (vars, resources, etc). |

### Eventos

| Evento | Payload | Quando ocorre? |
|--------|---------|----------------|
| `playerJoin` | `player` | Jogador entrou no servidor. |
| `playerLeave` | `player` | Jogador saiu do servidor. |
| `resourceAdd` | `resourceName` | Um resource foi iniciado. |
| `resourceRemove` | `resourceName` | Um resource foi parado. |
| `ready` | `void` | Conexão inicial estabelecida com sucesso. |

---

## 📝 Licença

Copyright © 2026 **[Junior Noc](https://discord.com/users/884180120850563112)**.
Distribuído sob a licença [MIT](LICENSE.md).

---

Feito com ❤️ por **Junior Noc**.
