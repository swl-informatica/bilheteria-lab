/** Integer division rounded half up, for non-negative values. */
export function roundDiv(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

export function percentOf(amount: number, percent: number): number {
  return roundDiv(amount * percent, 100);
}

export function formatBrl(cents: number): string {
  const reais = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  const grouped = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${grouped},${rest}`;
}
