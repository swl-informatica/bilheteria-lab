# Backlog

Histórias da primeira versão da bilheteria, refinadas com o PO. Datas e prazos são datas de
calendário no horário de Brasília. Valores em reais; centavos arredondados com meio para cima.

## US01 Cadastro de comprador
Como visitante, quero criar minha conta para poder comprar ingressos.

Critérios de aceite:
- Nome obrigatório, de 3 a 100 caracteres, sem contar espaços no começo e no fim.
- E-mail obrigatório, em formato válido, com até 254 caracteres. Não pode repetir, sem diferenciar
  maiúsculas de minúsculas.
- CPF obrigatório, com ou sem pontuação, com dígitos verificadores válidos. CPF com todos os
  dígitos iguais é inválido. Não pode repetir.
- Senha de 8 a 64 caracteres, com pelo menos uma letra e um número.
- É preciso ter pelo menos 16 anos completos na data do cadastro; quem faz 16 anos no dia já pode.
  Data de nascimento no futuro é inválida.
- Cada erro mostra a mensagem do campo correspondente.

## US02 Login
Como comprador, quero entrar na minha conta para acompanhar minhas compras.

Critérios de aceite:
- O login é feito com e-mail e senha. Credencial errada mostra sempre "E-mail ou senha inválidos.",
  sem dizer se o e-mail existe.
- A 5ª tentativa errada seguida do mesmo e-mail bloqueia o acesso desse e-mail. Bloqueado, nem a
  senha certa entra.
- O bloqueio só termina quando o administrador desbloqueia o e-mail. Login com sucesso ou
  desbloqueio zeram a contagem.
- A sessão dura 8 horas.

## US03 Vitrine de eventos
Como visitante, quero ver os eventos disponíveis para escolher o que assistir.

Critérios de aceite:
- A lista mostra todos os eventos, em ordem de data, com nome, data, local, classificação, menor
  preço de inteira e situação.
- Situações, nesta ordem de prioridade: Cancelado; Realizado (data já passou); Vendas encerradas
  (o evento é hoje); Em breve (vendas ainda não abriram); Esgotado; À venda.
- O detalhe mostra cada setor com preço de inteira, preço de meia, ingressos disponíveis e meias
  disponíveis.

## US04 Compra de ingressos
Como comprador, quero reservar ingressos de um evento para garantir meu lugar.

Critérios de aceite:
- Um pedido é de um único evento e pode ter ingressos de vários setores.
- Um pedido tem de 1 a 6 ingressos.
- Um comprador pode ter no máximo 6 ingressos no mesmo evento, somando pedidos pagos e pedidos
  aguardando pagamento dentro do prazo.
- O comprador precisa ter, na data do evento, a idade da classificação; quem faz aniversário no dia
  do evento já conta.
- As vendas abrem na data de abertura e vão até a véspera do evento.
- Não se vende mais que a capacidade do setor, nem com compras simultâneas. Pedidos pagos e
  aguardando pagamento dentro do prazo ocupam lugar.
- Se várias regras falharem, aparece um único erro, nesta ordem: dados do pedido, vendas abertas,
  classificação, ingressos por pedido, limite por comprador, cupom, cota de meia, disponibilidade.

## US05 Meia-entrada
Como estudante, idoso, pessoa com deficiência ou jovem de baixa renda, quero comprar meia-entrada
para pagar o valor previsto em lei.

Critérios de aceite:
- O comprador escolhe a categoria em cada ingresso de meia: estudante, idoso, pessoa com
  deficiência ou jovem de baixa renda.
- A meia custa metade da inteira do setor.
- Em cada setor, as meias vendidas não passam de 40% da capacidade, arredondado para baixo.
- O documento é apresentado na entrada do evento; o sistema não pede comprovação.

## US06 Cupom de desconto
Como comprador, quero usar um cupom para pagar menos.

Critérios de aceite:
- Um cupom por pedido; o código não diferencia maiúsculas de minúsculas.
- O desconto é uma porcentagem sobre os ingressos de inteira; meias não têm desconto. Pedido só de
  meias não aceita cupom.
- O cupom vale da data inicial à data final, as duas inclusive.
- Cada cupom tem um limite de pedidos. Contam pedidos pagos, reembolsados e aguardando pagamento
  dentro do prazo; pedido expirado, recusado ou cancelado devolve o uso.
- Alguns cupons exigem valor mínimo, comparado com o valor dos ingressos antes do desconto.

## US07 Taxa de serviço
Como empresa, queremos cobrar uma taxa de serviço em cada compra.

Critérios de aceite:
- A taxa é 10% do valor dos ingressos depois do desconto, com mínimo de R$ 3,00 por pedido.
- Total do pedido: ingressos menos desconto mais taxa.

## US08 Pagamento
Como comprador, quero pagar meu pedido com cartão de crédito.

Critérios de aceite:
- O pedido fica reservado por 15 minutos para pagamento. Depois disso expira e os ingressos voltam
  a ficar disponíveis.
- Cartão com 16 dígitos válidos, validade não vencida (o mês atual ainda vale), CVV de 3 dígitos e
  nome do titular de 3 a 50 caracteres.
- Parcelamento em 1, 2 ou 3 vezes sem juros; 2 ou 3 vezes só com total de R$ 150,00 ou mais. Os
  centavos que sobrarem da divisão vão na primeira parcela.
- Pagamento recusado pode ser tentado de novo; a 3ª recusa encerra o pedido como recusado.
- Se a operadora não responder ou falhar, a tentativa não conta.
- O comprador pode cancelar o pedido enquanto ele aguarda pagamento. Pedido pago segue a US09.
  Pedido expirado, recusado, cancelado ou reembolsado não pode ser pago nem cancelado.

## US09 Cancelamento pelo comprador
Como comprador, quero cancelar meu pedido pago e receber o reembolso.

Critérios de aceite:
- O cancelamento é do pedido inteiro.
- Pedido com ingresso já utilizado não pode ser cancelado.
- Faltando menos de 2 dias para a data do evento, não é possível cancelar.
- Faltando 2 dias ou mais, o reembolso depende dos dias desde o pagamento:

  | Dias até o evento | Dias desde o pagamento | Reembolso |
  |---|---|---|
  | 2 ou mais | até 7 | 100% do total, com a taxa |
  | 7 ou mais | mais de 7 | 80% dos ingressos depois do desconto, sem a taxa |
  | de 2 a 6 | mais de 7 | 50% dos ingressos depois do desconto, sem a taxa |

- Antes de confirmar, o comprador vê o valor que vai receber ou o motivo da recusa.

## US10 Cancelamento do evento
Como administrador, quero cancelar um evento e devolver o dinheiro de todos os compradores.

Critérios de aceite:
- O evento pode ser cancelado até a própria data, inclusive; evento realizado não.
- Pedidos pagos são reembolsados em 100% do total, com a taxa, mesmo que algum ingresso já tenha
  sido utilizado. Ingressos válidos são cancelados; ingressos já utilizados continuam utilizados.
- Pedidos aguardando pagamento são cancelados.

## US11 Entrada no evento
Como administrador, quero validar os ingressos na entrada do evento.

Critérios de aceite:
- O ingresso é validado pelo código, somente na data do evento.
- Só entra ingresso válido de pedido pago, de evento não cancelado.
- Ingresso utilizado ou cancelado é recusado, com a mensagem do motivo.

## US12 Meus pedidos
Como comprador, quero ver meus pedidos e ingressos.

Critérios de aceite:
- A lista mostra só os pedidos do próprio comprador, dos mais recentes para os mais antigos, com
  evento, data, situação e total.
- O pedido de outra pessoa não aparece nem pelo endereço direto.
- Os códigos dos ingressos aparecem depois do pagamento.
