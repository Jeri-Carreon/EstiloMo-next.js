import { getAppointmentPricing, roundMoney } from "@/lib/appointmentPricing";

export const SPECIAL_DISCOUNT_RATE = 0.2;

/** Break a VAT-inclusive price into its VAT-exclusive base and VAT amount. */
export function getVatInclusivePricing(total: number, vatRate?: number) {
  const pricing = getAppointmentPricing(total, vatRate);
  return { grossSubtotal: pricing.totalPayment, subtotal: pricing.subtotal, vatAmount: pricing.vatAmount };
}

/** Apply a 20% PWD/Senior discount after deducting VAT. */
export function getSpecialDiscountPricing(total: number, vatRate?: number) {
  const pricing = getVatInclusivePricing(total, vatRate);
  const pwdDiscountAmount = roundMoney(pricing.subtotal * SPECIAL_DISCOUNT_RATE);
  const totalAmount = Math.max(roundMoney(pricing.subtotal - pwdDiscountAmount), 0);
  return { ...pricing, vatExemptBase: pricing.subtotal, pwdDiscountAmount, discountAmount: roundMoney(pricing.grossSubtotal - totalAmount), totalAmount };
}
