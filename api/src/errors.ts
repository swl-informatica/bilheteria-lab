export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_IN_USE'
  | 'CPF_IN_USE'
  | 'UNDERAGE_REGISTRATION'
  | 'LOGIN_LOCKED'
  | 'SALES_NOT_OPEN'
  | 'AGE_RESTRICTED'
  | 'ORDER_QUANTITY_LIMIT'
  | 'BUYER_LIMIT'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'COUPON_EXHAUSTED'
  | 'COUPON_MIN_AMOUNT'
  | 'COUPON_NOT_APPLICABLE'
  | 'HALF_PRICE_QUOTA'
  | 'SOLD_OUT'
  | 'CARD_INVALID'
  | 'INSTALLMENTS_NOT_ALLOWED'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_UNAVAILABLE'
  | 'PAYMENT_EXPIRED'
  | 'INVALID_ORDER_STATE'
  | 'CANCELLATION_WINDOW'
  | 'TICKET_USED_CANCELLATION'
  | 'EVENT_CANCEL_NOT_ALLOWED'
  | 'CHECKIN_WINDOW'
  | 'TICKET_ALREADY_USED'
  | 'TICKET_CANCELED'
  | 'INTERNAL_ERROR';

const catalog: Record<ErrorCode, { status: number; message: string }> = {
  VALIDATION_ERROR: { status: 400, message: 'Dados inválidos.' },
  UNAUTHORIZED: { status: 401, message: 'Sessão inválida ou expirada.' },
  INVALID_CREDENTIALS: { status: 401, message: 'E-mail ou senha inválidos.' },
  FORBIDDEN: { status: 403, message: 'Acesso não permitido.' },
  NOT_FOUND: { status: 404, message: 'Recurso não encontrado.' },
  EMAIL_IN_USE: { status: 409, message: 'E-mail já cadastrado.' },
  CPF_IN_USE: { status: 409, message: 'CPF já cadastrado.' },
  UNDERAGE_REGISTRATION: {
    status: 422,
    message: 'É preciso ter pelo menos 16 anos para se cadastrar.',
  },
  LOGIN_LOCKED: {
    status: 423,
    message: 'Acesso bloqueado após 5 tentativas sem sucesso. Procure o suporte.',
  },
  SALES_NOT_OPEN: { status: 422, message: 'As vendas deste evento não estão abertas.' },
  AGE_RESTRICTED: { status: 422, message: 'Evento não recomendado para menores de {idade} anos.' },
  ORDER_QUANTITY_LIMIT: { status: 422, message: 'Um pedido deve ter de 1 a 6 ingressos.' },
  BUYER_LIMIT: { status: 422, message: 'Limite de 6 ingressos por comprador neste evento.' },
  COUPON_INVALID: { status: 422, message: 'Cupom inválido.' },
  COUPON_EXPIRED: { status: 422, message: 'Cupom fora do período de validade.' },
  COUPON_EXHAUSTED: { status: 422, message: 'Cupom esgotado.' },
  COUPON_MIN_AMOUNT: { status: 422, message: 'Valor mínimo para este cupom: {valor}.' },
  COUPON_NOT_APPLICABLE: {
    status: 422,
    message: 'Cupom válido apenas para ingressos de inteira.',
  },
  HALF_PRICE_QUOTA: { status: 409, message: 'Meia-entrada esgotada no setor {setor}.' },
  SOLD_OUT: { status: 409, message: 'Quantidade indisponível no setor {setor}.' },
  CARD_INVALID: { status: 422, message: 'Dados do cartão inválidos.' },
  INSTALLMENTS_NOT_ALLOWED: {
    status: 422,
    message: 'Parcelamento disponível a partir de R$ 150,00.',
  },
  PAYMENT_DECLINED: { status: 402, message: 'Pagamento recusado. Tentativas restantes: {n}.' },
  PAYMENT_UNAVAILABLE: {
    status: 502,
    message: 'Não foi possível processar o pagamento. Tente novamente.',
  },
  PAYMENT_EXPIRED: { status: 409, message: 'O prazo para pagamento terminou.' },
  INVALID_ORDER_STATE: {
    status: 409,
    message: 'Operação não permitida para o pedido na situação atual.',
  },
  CANCELLATION_WINDOW: {
    status: 422,
    message: 'Cancelamento permitido até 2 dias antes da data do evento.',
  },
  TICKET_USED_CANCELLATION: {
    status: 422,
    message: 'Pedido com ingresso utilizado não pode ser cancelado.',
  },
  EVENT_CANCEL_NOT_ALLOWED: { status: 409, message: 'Este evento não pode mais ser cancelado.' },
  CHECKIN_WINDOW: { status: 422, message: 'Entrada permitida somente na data do evento.' },
  TICKET_ALREADY_USED: { status: 409, message: 'Ingresso já utilizado.' },
  TICKET_CANCELED: { status: 409, message: 'Ingresso cancelado.' },
  INTERNAL_ERROR: { status: 500, message: 'Erro inesperado. Tente novamente.' },
};

export type FieldErrors = Record<string, string>;

export interface ErrorBody {
  error: { code: ErrorCode; message: string; fields?: FieldErrors };
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: FieldErrors;

  constructor(
    code: ErrorCode,
    params: Record<string, string | number> = {},
    fields?: FieldErrors,
  ) {
    const entry = catalog[code];
    const message = entry.message.replace(/\{(\w+)\}/g, (match, key: string) =>
      key in params ? String(params[key]) : match,
    );
    super(message);
    this.code = code;
    this.status = entry.status;
    this.fields = fields;
  }

  toBody(): ErrorBody {
    const body: ErrorBody = { error: { code: this.code, message: this.message } };
    if (this.code === 'VALIDATION_ERROR') {
      body.error.fields = this.fields ?? {};
    }
    return body;
  }
}

export function validationError(fields: FieldErrors): AppError {
  return new AppError('VALIDATION_ERROR', {}, fields);
}

export function notFound(): AppError {
  return new AppError('NOT_FOUND');
}
