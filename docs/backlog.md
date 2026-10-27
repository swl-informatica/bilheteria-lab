# Backlog

Histórias da primeira versão da bilheteria.

## US01 Cadastro de comprador
Como visitante, quero criar minha conta para poder comprar ingressos.

Critérios de aceite:
- O cadastro pede nome, e-mail, CPF, data de nascimento e senha.
- A senha deve ser forte.
- Não pode haver cadastro duplicado.
- Menores de idade não podem se cadastrar.

## US02 Login
Como comprador, quero entrar na minha conta para acompanhar minhas compras.

Critérios de aceite:
- O login é feito com e-mail e senha.
- Depois de várias tentativas erradas, o acesso fica bloqueado.

## US03 Vitrine de eventos
Como visitante, quero ver os eventos disponíveis para escolher o que assistir.

Critérios de aceite:
- A lista mostra nome, data, local e preço dos eventos.
- O detalhe mostra os setores, os preços e se ainda há ingressos.
- Eventos esgotados ou encerrados aparecem identificados.

## US04 Compra de ingressos
Como comprador, quero reservar ingressos de um evento para garantir meu lugar.

Critérios de aceite:
- O comprador escolhe o setor e a quantidade.
- Existe um limite de ingressos por pessoa.
- A classificação indicativa do evento deve ser respeitada.
- As vendas fecham pouco antes do evento.
- Não pode vender mais ingressos do que a capacidade do setor.

## US05 Meia-entrada
Como estudante, idoso ou pessoa com deficiência, quero comprar meia-entrada para pagar o
valor previsto em lei.

Critérios de aceite:
- A meia-entrada custa metade do preço.
- A quantidade de meias é limitada, conforme a lei.
- O documento é apresentado na entrada do evento.

## US06 Cupom de desconto
Como comprador, quero usar um cupom para pagar menos.

Critérios de aceite:
- O cupom dá um desconto em porcentagem.
- Cada cupom tem validade e quantidade limitada.
- Alguns cupons exigem um valor mínimo de compra.

## US07 Taxa de serviço
Como empresa, queremos cobrar uma taxa de serviço em cada compra.

Critérios de aceite:
- A taxa é de 10% da compra.
- Existe um valor mínimo de taxa.

## US08 Pagamento
Como comprador, quero pagar meu pedido com cartão de crédito.

Critérios de aceite:
- O pagamento pode ser parcelado em até 3 vezes para compras maiores.
- O pedido precisa ser pago dentro de um prazo, senão os ingressos voltam a ficar disponíveis.
- Se o pagamento for recusado, o comprador pode tentar novamente.

## US09 Cancelamento pelo comprador
Como comprador, quero cancelar meu pedido e receber o reembolso.

Critérios de aceite:
- O reembolso segue a política de cancelamento.
- Quem desiste logo depois da compra recebe o valor integral, conforme o Código de Defesa do
  Consumidor.
- Perto da data do evento não é mais possível cancelar.

## US10 Cancelamento do evento
Como administrador, quero cancelar um evento e devolver o dinheiro de todos os compradores.

Critérios de aceite:
- Todos os pedidos do evento são reembolsados.

## US11 Entrada no evento
Como administrador, quero validar os ingressos na entrada do evento.

Critérios de aceite:
- O ingresso é validado pelo código.
- O mesmo ingresso não pode entrar duas vezes.
- A entrada só é liberada perto do evento.

## US12 Meus pedidos
Como comprador, quero ver meus pedidos e ingressos.

Critérios de aceite:
- A lista mostra os pedidos com a situação de cada um.
- Os códigos dos ingressos aparecem depois do pagamento.
