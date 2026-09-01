import test from "node:test";
import assert from "node:assert/strict";
import {
  isPayHereReservation,
  isRefundConfirmed,
  refundEligibility,
  validateRefundConfirmation,
} from "../js/refund-model.js";

const reservation = {
  id: "reservation-1",
  reference: "GK-TEST1234",
  paymentGateway: "payhere",
  paymentSessionId: "session-1",
  status: "booked",
};

const paidSession = {
  id: "session-1",
  reservationId: "reservation-1",
  status: "paid",
  gatewayPaymentId: "320012345678",
};

test("PayHere reservations are identified from either gateway field", () => {
  assert.equal(isPayHereReservation(reservation), true);
  assert.equal(isPayHereReservation({ paymentSessionId: "session-1" }), true);
  assert.equal(isPayHereReservation({ source: "walk-in-admin" }), false);
});

test("only a matching paid session is eligible for refund confirmation", () => {
  assert.deepEqual(refundEligibility(reservation, paidSession), { eligible: true, reason: "" });
  assert.equal(refundEligibility(reservation, { ...paidSession, status: "failed" }).eligible, false);
  assert.equal(refundEligibility(reservation, { ...paidSession, reservationId: "another" }).eligible, false);
  assert.equal(refundEligibility(reservation, { ...paidSession, id: "another" }).eligible, false);
});

test("refund confirmation requires exact reference and PayHere verification", () => {
  assert.deepEqual(validateRefundConfirmation(reservation, paidSession, {
    typedReference: "gk-test1234",
    verifiedInPayHere: true,
    note: "  Merchant portal refund  ",
  }), {
    expectedReference: "GK-TEST1234",
    note: "Merchant portal refund",
  });
  assert.throws(() => validateRefundConfirmation(reservation, paidSession, {
    typedReference: "wrong",
    verifiedInPayHere: true,
  }), /exact reservation reference/);
  assert.throws(() => validateRefundConfirmation(reservation, paidSession, {
    typedReference: "GK-TEST1234",
    verifiedInPayHere: false,
  }), /completed in the PayHere merchant portal/);
});

test("permanent deletion unlocks only after the verified refund state", () => {
  assert.equal(isRefundConfirmed(reservation), false);
  assert.equal(isRefundConfirmed({
    ...reservation,
    status: "refunded",
    refund: { confirmed: true },
  }), true);
  assert.equal(isRefundConfirmed({
    ...reservation,
    status: "refunded",
    refund: { confirmed: false },
  }), false);
});
