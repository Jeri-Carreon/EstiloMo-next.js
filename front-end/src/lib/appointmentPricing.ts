export const DEFAULT_VAT_RATE = 0.12;

export function roundMoney(amount: number) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

/** Service prices are VAT-inclusive. */
export function getAppointmentPricing(totalPayment: number, vatRate = DEFAULT_VAT_RATE) {
  const safeTotal = Math.max(Number(totalPayment) || 0, 0);
  const safeVatRate = Math.max(Number(vatRate) || 0, 0);
  const subtotal = roundMoney(safeTotal / (1 + safeVatRate));

  return {
    subtotal,
    vatAmount: roundMoney(safeTotal - subtotal),
    totalPayment: roundMoney(safeTotal),
  };
}
