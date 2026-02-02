# Contribuindo

Obrigado por considerar contribuir com o **varlet-fivem-api**.

---

## Índice

- [Como contribuir](#como-contribuir)
- [Padrões de código](#padrões-de-código)
- [Política de suporte](#política-de-suporte)
- [Dúvidas](#dúvidas)

---

## Como contribuir

1. **Fork** o repositório e clone localmente.
2. Crie uma **branch** para sua alteração:
   - `git checkout -b feature/nome-da-feature` ou `fix/descricao-do-fix`.
3. Faça suas alterações. Mantenha o código em **TypeScript**, com tipos explícitos onde fizer sentido.
4. Rode **testes** e **lint**:
   ```bash
   npm install
   npm run build
   npm test
   npm run lint
   npm run format:check
   ```
5. **Commit** com mensagens claras (ex.: `feat: add X`, `fix: correct Y`). Preferir [Conventional Commits](https://www.conventionalcommits.org/).
6. Envie um **Pull Request** para `main` ou `master`. Descreva o que mudou e por quê.
7. O CI (GitHub Actions) deve passar (lint, format, build, test).

---

## Padrões de código

| Aspecto | Regra |
|---------|--------|
| **Linguagem** | TypeScript em modo strict |
| **Lint/format** | ESLint e Prettier configurados; use `npm run lint:fix` e `npm run format` antes de commitar |
| **Testes** | Novas funcionalidades devem ter testes (unitários ou de integração em `__tests__/`) |
| **Documentação** | Documente APIs públicas (JSDoc/TypeDoc) ao adicionar ou alterar métodos/opções |

---

## Política de suporte

- **MAJOR** (x.0.0): suporte à última versão major; breaking changes documentados no CHANGELOG.
- **MINOR** e **PATCH**: compatibilidade retroativa dentro da mesma major; bugs e segurança priorizados.
- Issues e PRs são revisados conforme disponibilidade; Dependabot cuida de atualizações de dependências.

---

## Dúvidas

Abra uma [issue](https://github.com/jjuniornoc-rgb/varlet-fivem-api/issues) para perguntas, bugs ou sugestões de features.

**Documentação técnica completa (arquitetura, código, testes, CI):** [docs/DEV.md](docs/DEV.md)
