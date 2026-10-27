# Padrões de teste

Regras de nomenclatura, estrutura e asserts para os testes do Bilheteria.

## Nomenclatura de cenários

- Todo cenário começa com o ID da história do backlog (`docs/backlog.md`), seguido de uma
  descrição curta do comportamento esperado, em português:
  - `US04 - não permite comprar acima do limite de ingressos por pessoa`
  - `US08 - pedido fica recusado quando o gateway recusa o cartão`
- A descrição diz o comportamento, não a implementação (evite nomes de função, rota ou seletor).
- Cenário que não se liga a nenhuma história usa `SEM-US` como prefixo e deve ser apontado no PR
  para virar história ou ser removido.
- Um `test.describe` por história (`US04 Compra de ingressos`), com os cenários dentro.

## Estrutura de pastas

- Os testes ficam na pasta `tests/` na raiz do repositório, fora de `api/`, `web/` e
  `mock-gateway/`.
- Subpastas dentro de `tests/` (por exemplo, separação entre testes de API e de front): **a definir**.
- Organização de fixtures, helpers e page objects dentro de `tests/`: **a definir**.

## Asserts

- Convenções de assert do time: **a definir**.
- Enquanto não houver definição, valem apenas as regras abaixo, que decorrem do contrato e da
  ferramenta:
  - Testes de API verificam o status HTTP e o corpo de acordo com `api/openapi.yaml`; o contrato é
    a fonte da verdade, não o comportamento observado.
  - Testes de front usam as asserções do Playwright que aguardam o estado (`expect(locator)...`),
    sem esperas fixas.
