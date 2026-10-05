# Testes de API - Platzi Fake Store API

Testes de integração da [Platzi Fake Store API](https://fakeapi.platzi.com/) usando Jest e PactumJS.

Projeto feito a partir do repositório base [ugioni/integration-tests-jest](https://github.com/ugioni/integration-tests-jest).

## GitHub Actions

[![Node.js CI](https://github.com/SEU_USUARIO/fakestore-api-tests/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/SEU_USUARIO/fakestore-api-tests/actions/workflows/node.js.yml)

## SonarCloud

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=SEU_USUARIO_fakestore-api-tests&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=SEU_USUARIO_fakestore-api-tests)

## Sobre a API

A Platzi Fake Store API simula uma loja virtual com produtos, categorias e usuários. Ela é pública, não precisa de chave de acesso e aceita `GET`, `POST`, `PUT` e `DELETE`. Os dados são gravados de verdade, então o que um teste cria pode ser consultado nos testes seguintes.

URL base: `https://api.escuelajs.co/api/v1

## Tecnologias

- [Jest](https://jestjs.io/) como test runner
- [PactumJS](https://pactumjs.github.io/) para as requisições e validações
- [pactum-matchers](https://pactumjs.github.io/api/matching/) para validar o formato das respostas
- [Faker](https://fakerjs.dev/) para gerar massa de dados
- [jest-html-reporters](https://github.com/Hazyzh/jest-html-reporters) para o relatório HTML

## Como rodar

Pré-requisito: Node.js `v22`

```bash
npm install
npm test
```

Para rodar o fluxo completo (limpeza, prettier, eslint e testes), igual ao pipeline:

```bash
npm run ci
```

O relatório fica em `./output/report.html`.

## Estratégia

Como a base de dados é compartilhada com qualquer pessoa que use a API, os testes não dependem de registros que já existem lá. No `beforeAll` é criada uma categoria própria, e os produtos e usuários também são criados durante a execução. Os ids retornados são guardados com `stores()` e reaproveitados nas próximas requisições com `$S{}`, como mostra a [documentação do Pactum](https://pactumjs.github.io/guides/data-management.html). No `afterAll` a categoria é removida para não deixar lixo na API.

## Cenários de teste

Todos os testes estão em [test/fake_store.spec.ts](test/fake_store.spec.ts).

### Categorias

| Cenário | Requisição | O que é validado |
| --- | --- | --- |
| Lista as categorias cadastradas | `GET /categories` | Status 200, header JSON, JSON Schema da lista e tipos dos campos com `eachLike` |
| Busca a categoria criada pelo id | `GET /categories/{id}` | Status 200, schema e nome da categoria criada no `beforeAll` |
| Altera o nome da categoria | `PUT /categories/{id}` | Status 200, novo nome e slug gerado a partir dele |
| Não cadastra categoria sem nome e imagem | `POST /categories` | Status 400 e mensagens de validação |

### Produtos

| Cenário | Requisição | O que é validado |
| --- | --- | --- |
| Cadastra um produto na categoria criada | `POST /products` | Status 201, schema, dados enviados e vínculo com a categoria |
| Busca o produto criado pelo id | `GET /products/{id}` | Status 200, schema e título do produto |
| Pagina a listagem de produtos | `GET /products?offset=0&limit=5` | Retorna exatamente 5 produtos no formato esperado |
| Filtra os produtos pela categoria | `GET /products/?categoryId={id}` | Retorna só o produto cadastrado na categoria |
| Remove o produto e ele deixa de existir | `DELETE /products/{id}` + `GET /products/{id}` | Exclusão retorna `true` e a busca seguinte retorna 400 `EntityNotFoundError` |

### Usuários

| Cenário | Requisição | O que é validado |
| --- | --- | --- |
| Cadastra um novo usuário | `POST /users/` | Status 201, dados enviados e perfil `customer` |
| Informa que o e-mail cadastrado não está mais disponível | `POST /users/is-available` | Retorna `isAvailable: false` para o e-mail recém cadastrado |
| Não cadastra usuário com dados inválidos | `POST /users/` | Status 400 com as mensagens de e-mail, senha e avatar inválidos |
| Atualiza o nome do usuário | `PUT /users/{id}` | Status 200 e nome alterado, mantendo o e-mail |
| Remove o usuário e ele deixa de existir | `DELETE /users/{id}` + `GET /users/{id}` | Exclusão retorna `true` e a busca seguinte retorna 400 `EntityNotFoundError` |

> O `PUT /products/{id}` está retornando erro 500 na API, com qualquer payload, por isso a atualização foi testada em categorias e usuários.

## Pipeline

O workflow em [.github/workflows/node.js.yml](.github/workflows/node.js.yml) roda em todo push e pull request na `main` e tem dois jobs:

- **Run Integration Tests**: instala as dependências, roda `npm run ci` e publica a pasta `output` como artefato
- **Run SonarCloud**: análise estática do código com o SonarCloud

Para o SonarCloud funcionar é preciso criar o secret `SONAR_TOKEN` no repositório (Settings > Secrets and variables > Actions) e ajustar `sonar.projectKey` e `sonar.organization` em [sonar-project.properties](sonar-project.properties).
