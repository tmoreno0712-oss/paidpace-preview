# PaidPace Browser-Only Pilot — Test Checklist

This is a **zero-cost local-first prototype**, not the server-backed invoicing SaaS. No customer account or billing integration is activated on this page. No invoice email is sent.

URL: https://paidpace-preview.onrender.com/pilot-app.html

## Pilot acceptance walkthrough (fictional data only)

1. Open the pilot link in a normal, current Chrome, Safari, Firefox, or Edge browser via HTTPS.
2. Select **Try instant demo**. Check that three fictional invoices appear and the totals/overdue count calculate.
3. Click **Draft** on an unpaid demo invoice. Change the tone and use **Copy message**. Verify copying from your browser and confirm that no email was sent.
4. Click **Add invoice** and create one fictional invoice. Edit it, mark it paid, filter invoices, and delete it. Demo mode resets when closed or reloaded.
5. Create a private workspace using a passphrase of at least ten characters. Add a fictional invoice.
6. Export the CSV. WARNING: CSV is unencrypted.
7. Export an encrypted JSON backup. **Do not put the passphrase in the backup filename or in GitHub.**
8. Close and reopen the pilot in the same browser; use **Unlock existing** with the passphrase and confirm the saved invoice returns.
9. In a different browser or device, create a separate private workspace using the **same passphrase**, then use **Restore encrypted backup** to load the saved invoices.
10. Test **Erase this workspace** only after taking a backup. Confirm it disappears.

## Security and limits

- The invoice pilot uses AES-GCM encryption and PBKDF2 key derivation in the browser, with passphrase input required for private workspace unlock.
- Stored encrypted data resides in browser localStorage, scoped to the whole site origin. There are no online PaidPace customer accounts, cloud sync, production backups, payment processing, or email sending.
- This architecture does NOT provide production-grade security against same-origin scripts, compromised browsers, lost devices, lost passwords, or local malware.
- **Use fictional invoice information only** during this prototype phase. Do not add customer identities, actual financial records, bank details, or sensitive client data.
- The full server-based application exists as unlaunched source code in a previous MVP archive; its production data security, billing, domain and email setup remain incomplete.
- The free pilot interest form is separate from this local invoice tracker and may send contact details via Web3Forms.

## Next production-release gates

- Dedicated origin with security review, authentication, access controls, and production database with backup/recovery.
- Explicit consent, data processing terms, privacy and support channels, and live invoice import QA.
- Payment processor integration and subscription test mode first; actual billing only with the business owner's informed approval.
- Email reminder service with recipient opt-out and anti-abuse measures; no auto-reminders by default.
- Record at least 5 qualified users interested in the problem and 2 users repeatedly exercising the prototype before infrastructure spending.
- Honor the $0 infrastructure budget until $1,000 MRR or owner explicitly changes this rule; never activate paid hosting silently.

## Founder validation questions

After a tester uses the fictional-data pilot, ask:
1. What felt easier or harder than your existing tracking process?
2. Do you already have invoicing software? Which parts does it cover?
3. How often do you need to follow up on overdue payments?
4. Would you pay $12/month if the same workflow supported real invoices with secure cloud sync and optional reminders, and why?
5. Are you willing to receive an invitation for the production beta when ready?

Do not count the user's own test submission as a customer lead.
