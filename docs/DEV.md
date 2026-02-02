# Guia do desenvolvedor — varlet-fivem-api

Documentação técnica do projeto: arquitetura, código, testes, build, CI e publicação.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Arquitetura e fluxo](#2-arquitetura-e-fluxo)
3. [Estrutura do projeto](#3-estrutura-do-projeto)
4. [Stack e dependências](#4-stack-e-dependências)
5. [Resumo do roadmap](#5-resumo-do-roadmap)
6. [Módulos e APIs](#6-módulos-e-apis)
7. [Testes](#7-testes)
8. [Build, lint e scripts](#8-build-lint-e-scripts)
9. [CI/CD e GitHub](#9-cicd-e-github)
10. [Documentação e versionamento](#10-documentação-e-versionamento)
11. [Checklist antes de publicar](#11-checklist-antes-de-publicar)
12. [Referências rápidas](#12-referências-rápidas)

---

## 1. Visão geral

| Aspecto | Descrição |
|---------|-----------|
| **Objetivo** | Biblioteca Node.js em TypeScript para interagir com servidores FiveM (dados, jogadores, recursos) via HTTP (`info.json`, `players.json`). |
| **Entrada** | IP:porta ou **link cfx.re/join** (resolvido pela API FiveM na primeira chamada). |
| **Saída** | Status, dados do servidor, lista de jogadores e eventos (playerJoin, playerLeave, resourceAdd, resourceRemove) via polling. |
| **Uso típico** | Bots Discord, dashboards, ferramentas standalone. |

---

## 2. Arquitetura e fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│  Usuário: address = IP ou cfx.re/join/xxx                        │
│  → DiscordFivemApi / MultiServerManager                           │
└─────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │ cfx.re?                   │ IP/host                   │
        ▼                           ▼                           │
   cfxResolver.ts  ──► FiveM API   │  address + port           │
   (resolve code)      servers-    │                           │
                     frontend      │                           │
        │                           │                           │
        └───────────────┬───────────┘                           │
                        ▼                                        │
              _getResolvedEndpoint() → { address, port }          │
                        │                                        │
                        ▼                                        │
              _getBaseUrl() → http://address:port                 │
                        │                                        │
                        ▼                                        │
   ┌─────────────────────────────────────────────────────────────┐
   │  _fetch() → (retry?) → (circuitBreaker?) → axios.get()       │
   │  cache? (TtlCache) para info/players                         │
   └─────────────────────────────────────────────────────────────┘
                        │
                        ▼
   GET /info.json, GET /players.json  →  Server / Player (ou raw)
```

- **DiscordFivemApi:** Uma instância = um servidor FiveM (IP ou cfx.re).
- **MultiServerManager:** Várias instâncias indexadas por `id`; reemite eventos com `serverId`.
- **cfx.re:** Resolução lazy na primeira chamada; resultado em cache (5 min) por código.

---

## 3. Estrutura do projeto

```
discord-fivem-api/
├── .github/
│   ├── dependabot.yml          # Atualizações npm + GitHub Actions (semanal)
│   └── workflows/
│       ├── ci.yml              # Lint, format, build, test (push/PR)
│       └── codeql.yml          # CodeQL (segurança, semanal)
├── __tests__/
│   ├── __fixtures__/           # info.json, players.json (mock FiveM)
│   ├── integration/            # DiscordFivemApi, MultiServerManager
│   ├── structures/             # Player, Server
│   └── util/                   # cache, circuitBreaker, cfxResolver, etc.
├── docs/
│   ├── README.md               # Índice da documentação
│   ├── DEV.md                  # Este arquivo
│   └── api/                    # Saída do TypeDoc (npm run docs)
├── examples/
│   └── test-server.js          # Teste contra servidor real
├── src/
│   ├── index.ts                # Entry: exports e tipos
│   ├── DiscordFivemApi.ts      # Classe principal (EventEmitter)
│   ├── MultiServerManager.ts   # Múltiplos servidores
│   ├── types/index.ts          # Interfaces, enums (ErrorCode, RawServerInfo, etc.)
│   ├── structures/             # Player, Server
│   └── util/                   # Error, Util, cache, circuitBreaker, fetchWithRetry, cfxResolver
├── CHANGELOG.md
├── CONTRIBUTING.md
├── MIGRATION.md
├── package.json
├── README.md
├── tsconfig.json
├── typedoc.json                # TypeDoc → docs/api
└── jest.config.js
```

- **Fonte:** `src/**/*.ts` (TypeScript).
- **Build:** saída em `dist/` (JS + `.d.ts` + `.map`). O `package.json` aponta `main` e `types` para `dist/`.

---

## 4. Stack e dependências

| Tipo | Pacote | Uso |
|------|--------|-----|
| runtime | `axios` | HTTP (info.json, players.json, API cfx.re) |
| build | `typescript` | Compilação TS → dist/ |
| testes | `jest`, `ts-jest` | Testes unitários e de integração |
| tipos | `@types/node`, `@types/jest` | Tipos Node e Jest |
| lint/format | `eslint`, `@typescript-eslint/*`, `prettier` | Lint e formatação |
| docs | `typedoc` | Referência da API em docs/api/ |

- **Node:** ES2020; CI usa Node 20.
- **TypeScript:** `strict: true`, `module: CommonJS`, `declaration` + `declarationMap` + `sourceMap`.

---

## 5. Resumo do roadmap

| Fase | Conteúdo |
|------|----------|
| **1** | tsconfig, package.json (main/types/exports), ESLint, Prettier, devDependencies |
| **2** | Tipos (types/index.ts), util (Error, Util), structures (Player, Server), DiscordFivemApi em TS, defaults corrigidos |
| **3** | Cache (TtlCache), retry (fetchWithRetry + backoff), circuit breaker, filterPlayers, sortPlayers |
| **4** | Jest + ts-jest, fixtures FiveM, testes unitários e de integração |
| **5** | TypeDoc, README, MIGRATION.md, CI (GitHub Actions), scripts |
| **6** | MultiServerManager, exports + sideEffects, source maps |
| **7** | CHANGELOG (SemVer), Dependabot, CodeQL, CONTRIBUTING |
| **Extra** | cfx.re/join: cfxResolver (isCfxJoinLink, extractCfxCode, resolveCfxJoinCode[Cached]), integração lazy em DiscordFivemApi |

---

## 6. Módulos e APIs

### 6.1 Entry (`src/index.ts`)

- **Exporta:** `version`, `DiscordFivemApi`, `MultiServerManager`, `Player`, `Server`, funções cfx (`isCfxJoinLink`, `extractCfxCode`, `resolveCfxJoinCode`, `resolveCfxJoinLink`, `resolveCfxJoinCodeCached`).
- **Tipos:** `CfxResolvedEndpoint`, `DiscordFivemApiOptions`, `DiscordFivemApiServerEntry`, `RawServerInfo`, `RawPlayerIdentifiers`, `RetryOptions`, `CircuitBreakerOptions`, `PlayerFilter`, `PlayerSortKey`.

### 6.2 DiscordFivemApi (`src/DiscordFivemApi.ts`)

- **Estende:** `EventEmitter`.
- **Opções:** `address`, `port`, `useStructure`, `interval`, `cacheTtlMs`, `retry`, `circuitBreaker`. Segundo parâmetro: `init` (boolean).
- **Lógica:** Se `address` for cfx.re, na primeira chamada usa `_getResolvedEndpoint()` → `resolveCfxJoinCodeCached(code)` e guarda em `_resolvedEndpoint`. Requisições passam por `_fetch()` (retry e circuit breaker opcionais); cache para info/players quando `cacheTtlMs > 0`.
- **Métodos:** `getStatus()`, `getServerData()`, `getServerPlayers()`, `getPlayersOnline()`, `getMaxPlayers()`, `filterPlayers()`, `sortPlayers()`.
- **Eventos:** `ready`, `readyPlayers`, `readyResources`, `playerJoin`, `playerLeave`, `resourceAdd`, `resourceRemove`.
- **Erros:** `DfaError` / `DfaTypeError` com códigos em `ErrorCode` (incl. `INVALID_CFX_LINK`).

### 6.3 MultiServerManager (`src/MultiServerManager.ts`)

- **Métodos:** `addServer(id, options, init?)`, `removeServer(id)`, `getServer(id)`, `getServerIds()`, `getAllStatus()`.
- **Estático:** `MultiServerManager.fromEntries(entries)`.
- **Eventos:** Reemite eventos de cada servidor com payload `{ serverId, ... }` (ex.: `playerJoin` → `{ serverId, player }`).

### 6.4 Tipos (`src/types/index.ts`)

- **Enums:** `ErrorCode`.
- **Interfaces/tipos:** `RawPlayerIdentifiers`, `PlayerIdentifiers`, `RawServerInfo`, `DiscordFivemApiOptions`, `RetryOptions`, `CircuitBreakerOptions`, `DiscordFivemApiServerEntry`, tipos de rejeição e eventos.

### 6.5 Utilitários (`src/util/`)

| Arquivo | Conteúdo | Descrição |
|---------|----------|-----------|
| Error.ts | `createErrorMessage`, `DfaError`, `DfaTypeError` | Erros com `.code` (symbol) |
| Util.ts | `flatten`, `timeoutPromise` | Flatten de objetos; Promise com timeout |
| cache.ts | `TtlCache<K, V>` | Cache em memória com TTL |
| circuitBreaker.ts | `CircuitBreaker` | Guard, recordSuccess/Failure, execute(fn) |
| fetchWithRetry.ts | `fetchWithRetry` | GET com retry e backoff exponencial |
| cfxResolver.ts | `isCfxJoinLink`, `extractCfxCode`, `resolveCfxJoinCode`, `resolveCfxJoinLink`, `resolveCfxJoinCodeCached` | Detecção e resolução de links cfx.re; cache 5 min |

### 6.6 Estruturas (`src/structures/`)

- **Player:** Dados de jogador; parse de `identifiers` (array → objeto); `toString()`, `toJSON(...props)`.
- **Server:** Encapsula dados de `info.json`; propriedades read-only a partir do raw.

---

## 7. Testes

- **Ambiente:** Jest + ts-jest, `testEnvironment: 'node'`, `roots: ['src', '__tests__']`.
- **Padrão:** `**/__tests__/**/*.test.ts` e `**/*.spec.ts`.
- **Fixtures:** `__tests__/__fixtures__/info.json`, `players.json` (mock da API FiveM).
- **Mocks:** `axios` mockado nos testes de integração e em `cfxResolver.test.ts`.
- **Cobertura:** `collectCoverageFrom: ['src/**/*.ts']`, saída em `coverage/`.

**Scripts:**

| Script | Comando | Descrição |
|--------|---------|-----------|
| test | `npm test` | Roda todos os testes |
| test:coverage | `npm run test:coverage` | Testes + relatório de cobertura |
| test:server | `npm run test:server` | Teste contra servidor real (FIVEM_ADDRESS, FIVEM_PORT) |

**Resumo:** Testes unitários (Error, Util, cache, circuitBreaker, fetchWithRetry, cfxResolver, Player, Server); integração (DiscordFivemApi, MultiServerManager).

---

## 8. Build, lint e scripts

| Script | Comando | Descrição |
|--------|---------|-----------|
| build | `npm run build` | Compila `src/**/*.ts` → `dist/` (JS, .d.ts, .map) |
| test | `npm test` | Roda todos os testes |
| test:coverage | `npm run test:coverage` | Testes + cobertura |
| test:server | `npm run test:server` | Teste contra servidor real |
| lint | `npm run lint` | ESLint em TypeScript |
| lint:fix | `npm run lint:fix` | ESLint com correção automática |
| format | `npm run format` | Prettier em src |
| format:check | `npm run format:check` | Verifica formatação |
| docs | `npm run docs` | Gera API reference em `docs/api/` |

- **tsconfig.json:** `rootDir: "./src"`, `outDir: "./dist"`, `strict: true`, `declaration` + `declarationMap` + `sourceMap`.
- **package.json:** `main`, `types` e `exports` apontam para `dist/`; `sideEffects: false`.

---

## 9. CI/CD e GitHub

| Recurso | Descrição |
|---------|-----------|
| **ci.yml** | Em push/PR em main/master: Node 20, `npm ci`, lint, format:check, build, test |
| **codeql.yml** | CodeQL (JavaScript) em push/PR e agendamento semanal |
| **dependabot.yml** | Atualizações semanais para npm e github-actions |

---

## 10. Documentação e versionamento

| Documento | Uso |
|-----------|-----|
| **README.md** | Usuários e npm: instalação, uso (IP e cfx.re), opções, API, múltiplos servidores |
| **docs/README.md** | Índice da documentação (usuários, devs, API) |
| **docs/DEV.md** | Este guia: arquitetura, código, testes, build, CI, publicação |
| **MIGRATION.md** | Migração de JavaScript para TypeScript |
| **CHANGELOG.md** | Keep a Changelog + Semantic Versioning |
| **CONTRIBUTING.md** | Como contribuir, padrões, política de suporte |
| **TypeDoc** | `npm run docs` → documentação da API em `docs/api/` |

---

## 11. Checklist antes de publicar

1. **Build:** `npm run build` → sem erros; `dist/` gerado.
2. **Testes:** `npm test` → todos passando.
3. **Lint/format:** `npm run lint`, `npm run format:check` → sem falhas.
4. **Versão:** Atualizar `version` em `package.json` (e, se quiser, em CHANGELOG).
5. **CHANGELOG:** Mover itens de `[Unreleased]` para a nova versão.
6. **Tag:** `git tag vX.Y.Z` (ex.: `v3.0.0`).
7. **Publicar:** `npm publish` (conta npm e acesso ao pacote).

---

## 12. Referências rápidas

- **API FiveM (servidor):** `http://<address>:<port>/info.json`, `http://<address>:<port>/players.json`.
- **API FiveM (cfx.re):** `https://servers-frontend.fivem.net/api/servers/single/<code>` → `connectEndPoints` ou `ConnectEndPoints` (array de `"ip:port"`).
- **Códigos de erro:** `src/types/index.ts` → `ErrorCode`.
- **Exports públicos:** `src/index.ts` (valores e tipos).

Para detalhes de tipos e assinaturas, use `npm run docs` e abra a referência da API em `docs/api/`.
