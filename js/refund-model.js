export function isPayHereReservation(reservation) {
  return reservation?.paymentGateway === "payhere" || Boolean(reservation?.paymentSessionId);
}

export function isRefundConfirmed(reservation) {
  return isPayHereReservation(reservation)
    && reservation?.status === "refunded"
    && reservation?.refund?.confirmed === true;
}

function matchingPaymentSession(reservation, paymentSession) {
  return Boolean(
    reservation?.paymentSessionId
    && paymentSession
    && (!paymentSession.id || paymentSession.id === reservation.paymentSessionId)
    && paymentSession.reservationId === reservation.id,
  );
}

export function effectivePaymentSessionStatus(paymentSession, now = Date.now()) {
  if (!paymentSession) return "missing";
  const expiresAt = paymentSession.expiresAt?.toMillis?.();
  if (paymentSession.status === "created" && expiresAt && expiresAt <= now) return "expired";
  return paymentSession.status || "unknown";
}

export function isUnpaidPayHereSessionDeletable(reservation, paymentSession, now = Date.now()) {
  if (!isPayHereReservation(reservation) || !matchingPaymentSession(reservation, paymentSession)) return false;
  return ["cancelled", "failed", "expired"].includes(effectivePaymentSessionStatus(paymentSession, now));
}

export function refundEligibility(reservation, paymentSession) {
  if (!isPayHereReservation(reservation)) {
    return { eligible: false, reason: "This is not a PayHere reservation." };
  }
  if (isRefundConfirmed(reservation)) {
    return { eligible: false, reason: "This reservation is already marked as refunded." };
  }
  if (!reservation?.paymentSessionId) {
    return { eligible: false, reason: "The PayHere payment-session reference is missing." };
  }
  if (!paymentSession) {
    return { eligible: false, reason: "The matching PayHere payment session could not be found." };
  }
  if (!matchingPaymentSession(reservation, paymentSession)) {
    return { eligible: false, reason: "The payment session does not belong to this reservation." };
  }
  if (paymentSession.status !== "paid") {
    return { eligible: false, reason: `Only a paid PayHere session can be marked refunded. Current payment status: ${paymentSession.status || "unknown"}.` };
  }
  return { eligible: true, reason: "" };
}

export function validateRefundConfirmation(reservation, paymentSession, confirmation) {
  const eligibility = refundEligibility(reservation, paymentSession);
  if (!eligibility.eligible) throw new Error(eligibility.reason);

  const expectedReference = String(reservation.reference || reservation.id).trim().toUpperCase();
  const typedReference = String(confirmation?.typedReference || "").trim().toUpperCase();
  if (typedReference !== expectedReference) throw new Error("Enter the exact reservation reference to confirm the refund.");
  if (confirmation?.verifiedInPayHere !== true) throw new Error("Confirm that the refund is completed in the PayHere merchant portal.");

  const note = String(confirmation?.note || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (note.length > 180) throw new Error("The refund note must not exceed 180 characters.");
  return { expectedReference, note };
}
