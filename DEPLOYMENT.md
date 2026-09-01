# Complete Setup and Deployment Guide

## 1. Back up Firestore first

The portal can permanently delete reservation documents. Before deploying it, take a Firestore export or another verified backup of the current `katanayaka-booking-v2` database.

## 2. Confirm Firebase configuration

The project is already configured for:

```text
Firebase project: katanayaka-booking-v2
Web app ID: 1:575426124492:web:20382ef60c51f7f9908069
```

If this should use another project, replace the public web configuration in `js/config.js` before uploading.

## 3. Enable Email/Password authentication

In Firebase Console:

1. Open **Authentication**.
2. Open **Sign-in method**.
3. Enable **Email/Password**.
4. Open the **Users** tab.
5. Create the staff account or select the existing account.
6. Copy its exact Firebase **UID**.

Use a strong unique password. Do not place the password in source files.

## 4. Authorise the account without Cloud Functions

This is the easiest Firestore-only method:

1. Open Firebase Console -> Firestore Database.
2. Start a collection named exactly:

   ```text
   admins
   ```

3. Use the Firebase Authentication UID as the document ID—not the email address.
4. Add these fields:

   | Field | Type | Value |
   | --- | --- | --- |
   | `active` | boolean | `true` |
   | `email` | string | the administrator email |

5. Save the document.

To disable that administrator later, set `active` to `false` or delete the admin document. Existing accounts with the old `admin: true` custom claim also continue to work.

## 5. Deploy the compatible Firestore rules

### Firebase Console method — no Firebase CLI required

1. Open Firebase Console -> Firestore Database -> Rules.
2. Open this project's `firestore.rules` in a text editor.
3. Copy the complete contents into the Rules editor.
4. Click **Publish**.

### Firebase CLI method

From the project folder:

```bat
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes --project katanayaka-booking-v2
```

These rules deliberately preserve read-only seat availability for the separate online-payment website. Do not deploy a different admin-only seat-read rule to the shared database while the public website is operating.

## 6. Configure App Check and the hosted domain

This application uses reCAPTCHA v3 through Firebase App Check.

1. Add the final admin-site hostname to the reCAPTCHA v3 key's allowed domains.
2. In Firebase Console -> App Check, confirm the matching secret is registered for the web app.
3. In Firebase Authentication -> Settings -> Authorised domains, add the hostname.

If Firestore App Check enforcement is active, an incorrect key/domain combination will prevent the seat map and records from loading even after a correct login.

## 7. Test locally

Do not double-click `index.html`; browser modules require a local HTTP server.

If PHP is installed, open Command Prompt in the project directory and run:

```bat
php -S 127.0.0.1:8000
```

Then open:

```text
http://127.0.0.1:8000/
```

For localhost, the code enables Firebase App Check debug mode. Copy the debug token printed in the browser console and register it under Firebase Console -> App Check -> Manage debug tokens. Refresh the page afterward.

Local acceptance test:

1. Confirm the root URL displays only the login screen.
2. Test a non-admin account and verify that access is refused.
3. Sign in as the authorised administrator.
4. Verify both performance seat maps and existing confirmed seats.
5. Select one unused test seat and enter test customer details.
6. Confirm the booking and verify the seat turns confirmed.
7. Find the test reservation in the record table.
8. Use **Delete permanently** and verify the record disappears and the seat becomes available again.
9. Check Firestore `auditLogs` for creation and deletion audit entries.

## 8. Deploy with GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`. It tests the project and publishes only the required static admin files; Firestore rules, documentation and tests are not included in the website artifact.

1. Upload the complete contents of this project to the repository root, including the hidden `.github` folder.
2. Commit the files to the `main` branch.
3. Open GitHub -> repository **Settings** -> **Pages**.
4. Under **Build and deployment**, choose **GitHub Actions** as the source.
5. Open the **Actions** tab and confirm **Test and deploy admin portal** succeeds.
6. Add the resulting GitHub Pages hostname to Firebase Authentication authorised domains, the reCAPTCHA v3 allowed domains and Firebase App Check.

The workflow uses Node.js 24-compatible GitHub actions and requires no repository secrets because the Firebase browser configuration is already present in `js/config.js`.

## 9. Alternative cPanel upload

The easiest option is the included file:

```text
deployment/admin-only-cpanel-upload.zip
```

1. Open cPanel -> File Manager.
2. Open the dedicated document root for the admin hostname or protected directory.
3. Back up existing files in that exact directory.
4. Upload `admin-only-cpanel-upload.zip`.
5. Extract it directly there.
6. Confirm `index.html`, `.htaccess`, `assets/` and `js/` are directly in the document root.
7. Enable **Show Hidden Files** and verify `.htaccess` exists.
8. Delete the uploaded ZIP after extraction.
9. Force HTTPS only after the certificate works correctly.

Do not upload `firestore.rules`, `firebase.json`, tests or documentation to the public document root. The prepared deployment ZIP excludes them.

## 10. PayHere refund acceptance test

Use only an authorised test transaction or a genuine customer refund:

1. Complete the refund in the PayHere merchant portal first.
2. Find the matching PayHere reservation in the admin table.
3. Select **Confirm refunded**.
4. Confirm the PayHere payment ID and total, type the exact reservation reference and tick the verification checkbox.
5. Select **Confirm refund and release seats**.
6. Confirm the seats become available and the reservation status becomes `refunded`.
7. Confirm Firestore contains a `payhere-refund-confirmed` audit entry and the payment session status is `refunded`.
8. Select **Delete permanently** only if the operational reservation/customer record should be removed.
9. Confirm the reservation disappears, while the payment session, payment events and audit entries remain.

Never use **Confirm refunded** merely to release an unpaid or failed transaction. The transaction intentionally accepts only a PayHere payment session whose Firebase status is `paid`.

### Unpaid/test-record deletion test

For a test record whose matching `paymentSessions` document is already `cancelled`, `failed` or `expired`:

1. Find the record in the admin table.
2. Select **Delete unpaid record**. If the reservation status itself is not visibly cancelled/failed/expired, select **Manage PayHere record**; the same status check runs before deletion.
3. Read the confirmation and select **OK**.
4. Confirm the reservation disappears and every seat still owned by it becomes available.
5. Confirm the payment-session document remains and has `reservationDeleted: true`.
6. Confirm `auditLogs` contains `unpaid-payhere-reservation-permanently-deleted`.

No refund is required because these statuses do not represent a successful payment. Paid, missing-payment-session and active/pending records remain protected. Deploy the supplied `firestore.rules` before testing this feature; replacing only the website files is not sufficient.

## 11. Final production checks

1. Visit the final HTTPS URL in a private browser window.
2. Confirm no seat map or customer data is visible before login.
3. Confirm admin login, seat selection, booking, search, CSV, unpaid-record deletion, refund confirmation and gated deletion.
4. Confirm the separate public payment site still loads availability and completes its normal Cloud Function flow.
5. Confirm a non-admin Firebase account cannot read reservations or write seats using the browser.
6. Review Firebase Authentication, App Check and Firestore logs for rejected or unusual access.

## 12. Updating the website

There is no compilation step. After editing HTML, CSS or JavaScript, replace the corresponding files on the server. If creating a new deployment ZIP in PowerShell from a clean public-files folder, make sure `.htaccess` is included.
