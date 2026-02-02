# Migração: JavaScript → TypeScript

O pacote foi migrado para TypeScript. O código compilado em `dist/` mantém compatibilidade com uso em JavaScript (CommonJS).

---

## Índice

- [O que mudou](#o-que-mudou)
- [Uso em JavaScript](#uso-em-javascript)
- [Novas opções e métodos](#novas-opções-e-métodos)
- [Uso em TypeScript](#uso-em-typescript)
- [Build e documentação](#build-e-documentação)

---

## O que mudou

### Entrada do pacote

| Antes | Agora |
|-------|--------|
| `main` → `./src/index.js` | `main` → `./dist/index.js` e `types` → `./dist/index.d.ts` |

Se você só usa `require('varlet-fivem-api')` ou `import ... from 'varlet-fivem-api'`, **não precisa alterar nada**: o pacote continua funcionando. Em projetos TypeScript, você passa a ter tipos e autocomplete.

---

## Uso em JavaScript

O uso em JS permanece o mesmo:

```javascript
const { DiscordFivemApi, Player, Server } = require('varlet-fivem-api');

const api = new DiscordFivemApi({ address: '127.0.0.1', port: 30120 }, true);
api.getStatus().then(console.log);
```

---

## Novas opções e métodos

### Opções (opcionais)

| Opção | Descrição | Exemplo |
|-------|-----------|---------|
| `cacheTtlMs` | Cache em memória para `getServerData` e `getServerPlayers` (ms) | `5000` |
| `retry` | Retentativas com backoff exponencial | `true` ou `{ maxAttempts: 3, initialDelayMs: 1000 }` |
| `circuitBreaker` | Circuit breaker após N falhas | `true` ou `{ failureThreshold: 5, cooldownMs: 30000 }` |

Exemplo:

```javascript
const api = new DiscordFivemApi({
  address: '127.0.0.1',
  port: 30120,
  cacheTtlMs: 5000,
  retry: true,
}, true);
```

### Novos métodos

| Método | Descrição |
|--------|-----------|
| `filterPlayers(players, predicate)` | Filtra a lista de jogadores por uma função |
| `sortPlayers(players, key, 'asc' \| 'desc')` | Ordena jogadores por propriedade (ex.: `'name'`, `'id'`) |

### Correção de comportamento

- **Defaults das opções:** Antes, `port`, `useStructure` e `interval` podiam não ser aplicados quando se passava um objeto `options`. Agora os defaults são aplicados corretamente (ex.: `port ?? 30120`).

---

## Uso em TypeScript

```typescript
import { DiscordFivemApi, Player, Server } from 'varlet-fivem-api';

const api = new DiscordFivemApi({
  address: '127.0.0.1',
  port: 30120,
  useStructure: true,
}, true);

const status: 'online' | 'offline' = await api.getStatus();
const players = await api.getServerPlayers(); // (Player | RawPlayerIdentifiers)[]
const filtered = api.filterPlayers(players, p => (p as { name?: string }).name === 'Alice');
```

**Tipos exportados:** `DiscordFivemApiOptions`, `RawServerInfo`, `RawPlayerIdentifiers`, `RetryOptions`, `CircuitBreakerOptions`, `PlayerFilter`, `PlayerSortKey`.

---

## Build e documentação

Para desenvolver ou gerar `dist/` localmente:

```bash
npm install
npm run build
```

Para gerar a documentação da API (TypeDoc):

```bash
npm run docs
```

A referência da API fica em **`docs/api/`**.
