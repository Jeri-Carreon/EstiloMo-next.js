import assert from "node:assert/strict";
import test from "node:test";

import {
  getAppointmentPricing,
  getAppointmentVatBreakdown,
  isVatExempt,
  roundMoney,
} from "./appointmentPricing";

test("extracts VAT from a normal VAT-inclusive appointment total", () => {
  assert.deepEqual(getAppointmentVatBreakdown(1120, 0.12), {
    finalTotal: 1120,
    vatableSales: 1000,
    vatExemptSales: 0,
    vatAmount: 120,
  });
});

test("treats VAT-exempt and PWD appointments as VAT exempt", () => {
  assert.equal(isVatExempt({ vatExempt: true }, null), true);
  assert.equal(isVatExempt(null, { pwdDiscount: true }), true);
  assert.deepEqual(getAppointmentVatBreakdown(896, 0.12, true), {
    finalTotal: 896,
    vatableSales: 0,
    vatExemptSales: 896,
    vatAmount: 0,
  });
});

test("uses the discounted final total once and does not apply VAT twice", () => {
  const discountedTotal = 1000;
  const pricing = getAppointmentPricing(discountedTotal, 0.12);

  assert.equal(pricing.totalPayment, discountedTotal);
  assert.equal(pricing.subtotal, 892.86);
  assert.equal(pricing.vatAmount, 107.14);
  assert.equal(roundMoney(pricing.subtotal + pricing.vatAmount), discountedTotal);
});

test("downpayments leave the VAT base unchanged and only reduce the balance", () => {
  const vat = getAppointmentVatBreakdown(1120, 0.12);
  const remainingBalance = roundMoney(Math.max(vat.finalTotal - 150, 0));

  assert.equal(vat.vatableSales, 1000);
  assert.equal(vat.vatAmount, 120);
  assert.equal(remainingBalance, 970);
});

test("supports a zero VAT rate", () => {
  assert.deepEqual(getAppointmentVatBreakdown(500, 0), {
    finalTotal: 500,
    vatableSales: 500,
    vatExemptSales: 0,
    vatAmount: 0,
  });
});
