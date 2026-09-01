# Verification Results

Verified on 1 September 2026 for the PayHere refund and unpaid/test-record deletion release.

## Automated checks

Commands:

```text
node --check js/admin.js
node --check js/booking-model.js
node --check js/firebase.js
node --check js/refund-model.js
node --test tests/admin-only.test.js tests/booking-model.test.js tests/refund-model.test.js
```

Result: **16 passed, 0 failed**.

The checks cover:

- Root administrator gate and removal of the public reservation flow.
- Direct atomic Firestore transactions with no callable Cloud Function dependency.
- Safe permanent deletion ownership check.
- Matching paid-session validation before PayHere refund confirmation.
- GUI deletion eligibility for cancelled, failed and expired unpaid PayHere sessions.
- Time-based expiry handling for a `created` payment session after `expiresAt`.
- Exact-reference and merchant-portal verification requirements.
- Atomic refund status updates and ownership-checked seat release.
- Protection of paid and active/pending PayHere reservations from permanent deletion.
- Immutable unpaid-deletion audit records and retained payment evidence.
- Retention of payment sessions, payment events and audit evidence after deletion.
- Compatible Firestore rules for the shared online-payment database.
- Apache source-file blocking and no-store headers.
- Node.js 24-compatible GitHub Pages workflow and restricted static artifact.
- Original 600 unique seats, six blocks, legacy prefixes and ticket prices.
- Seat ordering and current/expired availability behaviour.
- Sri Lankan phone normalisation, customer validation and booking totals.

## Static-server checks

The following returned HTTP 200 from a local static server:

- `/`
- `/admin.html`
- `/assets/style.css`
- `/assets/admin-only.css`
- `/assets/images/BG.png`
- `/assets/images/Logo.svg`
- `/js/admin.js`
- `/js/booking-model.js`
- `/js/firebase.js`
- `/js/refund-model.js`
- `/robots.txt`

The clean GitHub Pages artifact returned 404 for `/firestore.rules` and `/README.md`; those private operational files are not published.

## Live Firebase and PayHere checks still required

Static validation cannot authenticate against the production Firebase project, verify a PayHere merchant-portal refund or mutate live data. Deploy the supplied Firestore rules, then complete the non-admin rejection, admin login, authorised refund, unpaid-record deletion, seat release, gated deletion, retained-payment-evidence, public-payment-site compatibility and App Check checks in `DEPLOYMENT.md` before operational use.
