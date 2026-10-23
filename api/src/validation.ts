export const REQUIRED = 'Campo obrigatório.';
export const INVALID = 'Valor inválido.';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function asObject(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

/** Length in characters (code points), not UTF-16 units. */
export function charLength(value: string): number {
  return [...value].length;
}
