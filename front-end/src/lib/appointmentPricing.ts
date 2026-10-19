export const DEFAULT_VAT_RATE = 0.12;

export function roundMoney(amount: number) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

type VatStatus = {
  vatExempt?: boolean | null;
  pwdDiscount?: boolean | null;
};

/** Matches the VAT-exemption rule used by the sales receipt. */
export function isVatExempt(
  sale?: VatStatus | null,
  payment?: VatStatus | null
) {
  return Boolean(
    sale?.vatExempt ||
      payment?.vatExempt ||
      sale?.pwdDiscount ||
      payment?.pwdDiscount
  );
}

/** Breaks a VAT-inclusive total into the same values shown on a sales receipt. */
export function getAppointmentVatBreakdown(
  totalAmount: number,
  vatRate = DEFAULT_VAT_RATE,
  vatExempt = false
) {
  const finalTotal = roundMoney(Math.max(Number(totalAmount) || 0, 0));
  const safeVatRate = Math.max(Number(vatRate) || 0, 0);
  const vatableSales = vatExempt
    ? 0
    : roundMoney(finalTotal / (1 + safeVatRate));

  return {
    finalTotal,
    vatableSales,
    vatExemptSales: vatExempt ? finalTotal : 0,
    vatAmount: vatExempt ? 0 : roundMoney(finalTotal - vatableSales),
  };
}

/** Service prices are VAT-inclusive. */
export function getAppointmentPricing(totalPayment: number, vatRate = DEFAULT_VAT_RATE) {
  const pricing = getAppointmentVatBreakdown(totalPayment, vatRate);

  return {
    subtotal: pricing.vatableSales,
    vatAmount: pricing.vatAmount,
    totalPayment: pricing.finalTotal,
  };
}
