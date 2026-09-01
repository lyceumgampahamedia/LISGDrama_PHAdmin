# Garu Katanayaka — Admin-Only Walk-in Booking Desk

This is the plain HTML/CSS/JavaScript version of the original 600-seat project, rebuilt as a dedicated staff tool. Opening the root URL first verifies Firebase administrator access. Only then does the browser load the seat map, customer records and booking controls.

## What this version does

- No public reservation page, tentative-booking form, PayHere checkout or customer login.
- Root `index.html` is the administrator login and dashboard.
- Existing media filenames and Zeus Hall seat layout are preserved.
- Live availability for both shows and Block A/B/C sales totals.
- Select up to eight available seats visually.
- Enter customer details and confirm a walk-in booking immediately.
- Atomic Firestore transactions prevent double booking.
- Search, filter and export reservation records.
- Permanently delete walk-in or legacy reservations and release only seats still owned by them.
- Delete cancelled, failed or expired unpaid/test PayHere reservation records through the GUI after checking the matching payment session.
- Confirm a completed PayHere refund, release the refunded reservation's owned seats and unlock permanent deletion.
- Preserve the refunded PayHere payment session, payment events and immutable audit evidence after the customer-facing reservation is deleted.
- No Cloud Functions are required by this admin portal.
- No Vite, React, build process, SQL, PHP framework or Composer dependency.

## Important coexistence with the online-payment site

This project is compatible with the existing `katanayaka-booking-v2` Firebase project and its payment system. The supplied Firestore rules retain anonymous **read-only** access to seat-state documents because the separate public ticketing website needs them to display availability. Customer, payment and audit documents remain private.

Firebase Cloud Functions use the Admin SDK and continue working even though browser writes are restricted. Do not replace the supplied rules with rules that deny public seat reads while the customer ticketing site is operating, or its availability display will stop working.

## Main files

| File | Purpose |
| --- | --- |
| `index.html` | Login, seat map, walk-in form and record manager |
| `js/admin.js` | Authentication, live listeners, transactions and deletion |
| `js/booking-model.js` | Input validation, phone normalisation and seat calculations |
| `js/refund-model.js` | PayHere refund eligibility and typed-confirmation validation |
| `js/config.js` | Firebase public config, shows, prices and all 600 seats |
| `firestore.rules` | Public seat reads plus administrator-only private access/writes |
| `DEPLOYMENT.md` | Complete local, Firebase and cPanel instructions |
| `SECURITY.md` | Access model and operational safeguards |
| `.github/workflows/deploy-pages.yml` | Automated tests and GitHub Pages deployment |
| `deployment/admin-only-cpanel-upload.zip` | Ready-to-extract static website files |

## Administrator authorisation

The portal accepts either of these secure Firebase authorisation methods:

1. An existing Firebase Auth custom claim `admin: true`; or
2. An active Firestore document at `admins/{Firebase Auth UID}`.

The second method requires no Cloud Function. See `DEPLOYMENT.md` for the exact console steps.

## PayHere refund and deletion behaviour

The action shown for an unrefunded PayHere record checks its matching `paymentSessions` document before doing anything:

- `cancelled`, `failed` or `expired`: the GUI offers **Delete unpaid record**. A `created` session is treated as expired only after its recorded `expiresAt` time has passed.
- `paid`: the GUI opens the refund-confirmation flow described below.
- an active `created`/pending session: deletion remains blocked so a payment still in progress cannot lose its reservation record.

Deleting an eligible unpaid/test record releases only seats still owned by that reservation and removes the reservation/customer document. The payment session is retained with a deletion marker, and an immutable `unpaid-payhere-reservation-permanently-deleted` audit record is created. This deletion does not claim that a refund occurred.

The **Confirm refunded** action does not contact PayHere or transfer money. Staff must first complete and verify the refund in the PayHere merchant portal. The portal then requires the exact reservation reference and an explicit verification checkbox.

The confirmation transaction:

1. Re-reads the reservation and matching `paymentSessions` document.
2. Accepts only a matching session whose current status is `paid`.
3. Releases only seat documents still owned by that reservation.
4. Marks both records `refunded` and writes the administrator identity and timestamps.
5. Creates an immutable `payhere-refund-confirmed` audit record.

After that transaction succeeds, **Delete permanently** becomes available. Deletion removes the reservation/customer record, marks the retained payment session as having no reservation record, and adds a second immutable audit entry. It does not delete `paymentSessions`, `paymentEvents` or previous audit evidence.

## Other permanent deletion behaviour

The **Delete permanently** action for walk-in and legacy records runs one Firestore transaction:

1. Re-reads the reservation.
2. Re-reads every recorded seat.
3. Deletes only seat documents whose `reservationId` still matches that reservation.
4. Deletes the reservation document.
5. Creates a minimal audit entry without copying customer details.

This prevents deletion of an old record from accidentally releasing a seat that has since been assigned to somebody else. Paid and active/pending PayHere reservations remain protected by both the UI and Firestore rules. Eligible unpaid sessions can be removed only after their database status is checked. The deletion cannot be undone, so take a Firestore backup or export before event operations.

## Quick verification

Run from the project folder:

```bat
npm test
```

The application itself must be opened through a local web server, not by double-clicking `index.html`. Full instructions are in `DEPLOYMENT.md`.
