# Convenções de teste

## Ferramentas

- Automação: Playwright com TypeScript, tanto para E2E do front quanto para testes de API
  (`request` do Playwright).
- Ainda não há Playwright instalado nem configuração no repositório; a versão e o
  `playwright.config.ts` serão definidos quando a pasta `tests/` for criada.
- Navegadores cobertos: **a definir**.

## Gestão de casos de teste

- Os casos de teste ficam versionados no próprio repositório; não há ferramenta externa
  (Jira/Xray, TestRail etc.).
- A rastreabilidade com o backlog é feita pelo prefixo `USxx` no nome do cenário
  (ver `padroes-teste.md`).

## Ambientes

| Ambiente | Como sobe | Endereços |
|---|---|---|
| Local | `docker compose up -d --build` | Front `http://localhost:3000`, API `http://localhost:3001`, gateway simulado `http://localhost:8080` |
| CI | GitHub Actions (`.github/workflows/ci.yml`), mesma stack via `docker compose` | os mesmos do local, dentro do runner |

- Não há ambiente de homologação.
- Antes de rodar a suíte, conferir `http://localhost:3001/health` e `http://localhost:3000/`.
- As URLs devem vir de variáveis de ambiente (`API_URL`, `WEB_PORT`, etc., ver `.env.example`),
  nunca fixas no código do teste.

## Massa de dados

- Dados iniciais: `docker compose exec api npm run seed` (apaga e recria o banco).
- As datas do seed são relativas ao dia em que o comando roda; rodar o seed no mesmo dia da
  execução dos testes.
- Usuários, cupons e cartões disponíveis: ver seção "Dados de teste" do `README.md`.

## Execução no CI

- O workflow atual só compila e verifica o health dos serviços; ainda não roda testes.
- Etapa de testes no CI e publicação de relatório: **a definir**.
