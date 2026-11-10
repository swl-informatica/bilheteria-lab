# Bilheteria

Bilheteria de eventos: o comprador se cadastra, escolhe um evento, monta o pedido de ingressos e
paga com cartão. O projeto tem três partes:

- uma API REST em Node.js com TypeScript e Postgres;
- um front web estático servido por nginx;
- um gateway de pagamento simulado, usado pela API no lugar de um gateway real.

## Pré-requisitos

- Docker com Docker Compose.

## Estrutura do repositório

| Caminho | Conteúdo |
|---|---|
| `api/` | API, migrações do banco e contrato OpenAPI (`api/openapi.yaml`) |
| `web/` | front web |
| `mock-gateway/` | gateway de pagamento simulado |
| `docs/backlog.md` | histórias do backlog |
| `tests/` | testes automatizados de API, de front e de desempenho |
| `docker-compose.yml` | banco, API, front e gateway simulado |
| `.env.example` | variáveis de ambiente com os valores de desenvolvimento |

## Configuração

Copie o arquivo de exemplo:

```sh
cp .env.example .env
```

Todas as variáveis têm valor padrão, então o `.env` só é necessário para mudar portas ou
credenciais locais.

## Como subir

```sh
docker compose up -d --build
```

Com os valores padrão:

| Serviço | Endereço |
|---|---|
| Front | http://localhost:3000 |
| API | http://localhost:3001 |
| Health da API | http://localhost:3001/health |
| Banco (Postgres) | `localhost:5432` |
| Gateway simulado | http://localhost:8080 |

O contrato da API está em `api/openapi.yaml`.

Na primeira subida, com o banco vazio, a API cria as tabelas e carrega os dados iniciais.

## Como recriar os dados iniciais

```sh
docker compose exec api npm run seed
```

O comando apaga os dados do banco e carrega de novo os dados iniciais. As datas desses dados são
relativas ao dia em que o comando roda, então convém rodá-lo no mesmo dia em que a aplicação for
usada.

## Testes automatizados

Os testes ficam em `tests/`: `tests/api` (API, com Playwright), `tests/e2e` (front, com
Playwright no Chromium) e `tests/perf` (desempenho, com k6). Precisam de Node.js 22 e da
aplicação no ar com os dados iniciais recriados.

```sh
npm ci
npx playwright install chromium
docker compose exec api npm run seed
npm test
```

`npm run test:api` e `npm run test:e2e` rodam só uma das partes; `npm run report` abre o
relatório da última execução.

Os testes de desempenho rodam com a imagem do k6, na rede do docker compose:

```sh
docker run --rm -i --network bilheteria-lab_default -e API_URL=http://api:3001 grafana/k6:1.3.0 run - < tests/perf/consulta.js
docker run --rm -i --network bilheteria-lab_default -e API_URL=http://api:3001 grafana/k6:1.3.0 run - < tests/perf/concorrencia.js
```

O de compras simultâneas esgota a Plateia de O Último Ato: recrie os dados iniciais antes de
usar a aplicação de novo.

No CI, o job "Testes automatizados" roda a mesma suíte e guarda o relatório do Playwright por
3 dias.

## Dados de teste

### Usuários

| E-mail | Senha | Papel |
|---|---|---|
| admin@bilheteria.local | `Admin123` | administrador |
| ana@bilheteria.local | `Senha123` | comprador |
| bruno@bilheteria.local | `Senha123` | comprador |
| carla@bilheteria.local | `Senha123` | comprador |
| davi@bilheteria.local | `Senha123` | comprador |

O administrador também compra como qualquer usuário. As operações de administração existem só
na API, nas rotas `/admin` descritas em `api/openapi.yaml`; o front não tem telas para elas.

### Cupons

`BEMVINDO10`, `FESTIVAL50`, `LANCAMENTO20`, `VERAO15`, `ULTIMODIA5`, `ESTREIA10`, `AMANHA25`.

### Cartões

O gateway simulado decide o resultado pelo número do cartão:

| Número | Resultado no gateway |
|---|---|
| `4111111111111111` | aprovado |
| `4111111100000002` | recusado |
| `4111111100090003` | não responde |
| `4111111100080004` | erro |

## Como parar

```sh
docker compose down
```

Para apagar também o volume do banco, use `docker compose down -v`.
