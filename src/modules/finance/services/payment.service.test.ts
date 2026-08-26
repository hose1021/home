import {describe, expect, it} from "vitest";
import {deriveChargeStatus, PaymentError, validatePaymentValues} from "./payment.service";

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

describe("deriveChargeStatus", () => {
  it("keeps unpaid charges pending", () => {
    expect(deriveChargeStatus("100.00", 0)).toBe("pending");
  });

  it("marks partial confirmed payments as partially paid", () => {
    expect(deriveChargeStatus("100.00", 9999)).toBe("partially_paid");
  });

  it("marks fully settled charges as paid", () => {
    expect(deriveChargeStatus("100.00", 10000)).toBe("paid");
    expect(deriveChargeStatus("100.00", 12500)).toBe("paid");
  });
});

describe("PaymentError", () => {
  it("carries machine codes for the action boundary", () => {
    const notFound = new PaymentError("not_found");
    expect(notFound.code).toBe("not_found");
    expect(notFound.statusCode).toBe(404);

    const immutable = new PaymentError("immutable_status");
    expect(immutable.code).toBe("immutable_status");
    expect(immutable.statusCode).toBe(409);
  });
});
