import {describe, expect, it} from "vitest";
import {validatePaymentValues} from "./payment.service";

const validPayment = {
  amount: "25.50",
  periodYear: 2026,
  periodMonth: 7,
  paymentMethod: "bank_transfer",
  tariffPerSqm: "0.40",
};

describe("validatePaymentValues", () => {
  it("accepts a valid payment", () => {
    expect(() => validatePaymentValues(validPayment)).not.toThrow();
  });

  it.each(["0", "-1", "not-a-number", "Infinity"])("rejects invalid amount %s", (amount) => {
    expect(() => validatePaymentValues({...validPayment, amount})).toThrow("Payment amount");
  });

  it.each([0, 13, 1.5])("rejects invalid month %s", (periodMonth) => {
    expect(() => validatePaymentValues({...validPayment, periodMonth})).toThrow("payment month");
  });

  it("rejects unsupported payment methods", () => {
    expect(() => validatePaymentValues({...validPayment, paymentMethod: "crypto"})).toThrow("payment method");
  });

  it("rejects a negative tariff", () => {
    expect(() => validatePaymentValues({...validPayment, tariffPerSqm: "-0.01"})).toThrow("tariff");
  });
});
