# Restrições para a IA ao trabalhar com testes

## Dados

- Nunca usar dados reais de pessoas (nome, e-mail, CPF, cartão). Usar apenas a massa fictícia do
  README ou dados gerados para o teste.
- Cartões: usar somente os números do gateway simulado listados no README
  (`4111111111111111` aprovado, `4111111100000002` recusado, `4111111100090003` não responde,
  `4111111100080004` erro). Nunca usar número de cartão real.
- Não versionar `.env` nem credenciais além das já documentadas como dados de desenvolvimento.
- Não usar os usuários do seed (`ana`, `bruno`, `carla`, `davi`, `admin`) em cenários que
  bloqueiam a conta por tentativas erradas de login (US02); isso quebra os demais testes.
- Política de isolamento de dados entre testes (criar dados próprios por teste, reset via
  `npm run seed`, etc.): **a definir**.

## Processo

- Não pular etapas do `swl-skill-qa-safe-test-commit` ao commitar testes gerados por IA.
- Não declarar que um teste passa sem ter executado a suíte.
- Não inventar regras de negócio que não estejam em `docs/backlog.md` ou `api/openapi.yaml`.
  Critério de aceite ambíguo (por exemplo, "senha forte", "várias tentativas", "limite por pessoa")
  vira pergunta para o time, não valor suposto no teste.
- Não ajustar o assert para o comportamento atual quando ele contradiz o contrato ou o backlog;
  registrar como possível bug.
- Não usar esperas fixas (`waitForTimeout`) nem depender da ordem de execução dos testes.
- Não chamar o gateway de pagamento real; os testes usam sempre o `mock-gateway`.
