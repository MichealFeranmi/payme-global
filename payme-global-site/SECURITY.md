# PayMe Global: security and launch readiness

**Current stage: pitch demo.** The product is safe to show to investors and founders. It is **not** ready for real freelancers, real clients or real money. This file records what is protected now and what must be built before a public launch.

Last reviewed: 14 Nov 2026.

---

## 1. Done for the pitch stage

| Area | What was wrong | What we did |
|---|---|---|
| Script injection (XSS) | The profile photo and the project stage names could carry hidden code that ran on every screen, including the client's invoice page. | The server now accepts only real image data for photos and plain text everywhere else (HTML tags are stripped). The pages also escape everything they display, so there are two layers of protection. |
| Input checks | Most fields had no type or length limits. One person could save a 3 MB "bio" and slow the app down for everyone. | Every field has a type check and a length cap. Requests over 600 KB are refused. Items, prices and payment terms have sensible limits. |
| Payout wallet | Any text could be saved as the USDT wallet. | Only a valid TRC-20 (Tron) address is accepted, and the provider must be Cleva, Grey, Payoneer or a USDT wallet. |
| Data wiped on errors | If the database had a hiccup or hit its usage limit, the app thought it was empty and replaced everything with sample data. | Database errors now stop the request and change nothing. Sample data only loads when the database is truly empty. |
| Client privacy | Every invoice page downloaded every invoice, every client's email and every private link. | An invoice page now receives only its own invoice and the freelancer's public card. Client emails are never sent to any page. Private invoice links are hidden from search engines and don't leak to other sites when a client clicks a link. |
| Invoice link powers | Anyone holding an invoice link could change that project's stages or mark it delivered. | An invoice link can now only pay and request an update. Freelancer actions need the project ID. |
| Flooding | There was no limit on how fast someone could send changes. | Each visitor can make up to 40 changes a minute. After that they see "Too many changes at once". |
| Other sites embedding ours | Another site could load PayMe inside a frame and trick people into clicking (clickjacking). | Security headers now block framing, block scripts and connections to other sites, block camera, microphone and location access, and force HTTPS. |
| Error details | Internal error messages were shown to visitors. | Visitors see a friendly message; the technical detail goes to the Vercel logs only. |
| Invoice codes | Codes were made with a weak random generator. | Codes now use a secure random generator. |
| Background polling | Already in place: pages stop checking for updates while the tab is hidden. | No change needed. |

How we checked it:
- `npm run test:e2e` still ends with `no page errors`.
- We planted test code in every field. None of it ran on any page.
- We tried giant payloads, invalid wallets, an invoice link sending freelancer actions, and 45 rapid writes. All were blocked as expected.

## 2. Accepted risks during the pitch stage

These are fine for a demo with sample data, as long as no real money or personal data goes in.

- **No login.** The dashboard (`/app`) is one shared demo workspace, so anyone with the URL can use it, including Demo controls. If someone messes it up during a pitch, open `/app` → Demo controls → **Load sample data**.
- **Payments are simulated.** No card is charged and no Tron transaction is checked. Pressing Pay marks an invoice paid.
- **One JSON document holds all the data.** If two people save at exactly the same moment, one change can be lost. This is fine at demo traffic.
- **The 'unsafe-inline' allowance.** The security policy has to allow inline scripts because each page is a single self-contained file. The input cleaning and escaping above are the real protection.

## 3. Must be built before a public launch

Listed in order of priority.

1. **Accounts and login.** Each freelancer gets their own account, and their data is separate from everyone else's.
   - Suggested: Supabase Auth (email magic link plus Google), or Clerk.
   - Every freelancer action must check the logged-in user, and Demo controls must be removed from production.
2. **A real database instead of one JSON document.**
   - Suggested: Supabase Postgres with row-level security, with tables for freelancers, invoices, stages, updates and notifications.
   - This fixes lost writes and keeps each request small.
   - Keep Upstash Redis for rate limiting and caching.
3. **Real payments with verified confirmation.** Only the payment provider may mark an invoice paid, never the client's browser.
   - **Card:** Stripe, or the payout partner's checkout, with signed webhooks.
   - **USDT:** watch the Tron chain for the exact amount sent to the freelancer's address (for example with the TronGrid API), then confirm after enough block confirmations.
4. **Payout account protection.**
   - Changing a payout account or wallet needs re-login plus an email confirmation.
   - Send the freelancer an email alert on every payout change.
   - Show only the last 4 characters in the app.
5. **Live updates without constant polling.** Replace the 3-second check with Supabase Realtime or server-sent events, or at least slow the check to 15–30 seconds. Polling at 3 seconds would cost roughly 18 million requests a month at 3,000 users.
6. **Hosting plans.** Vercel's Hobby plan is for non-commercial use only, so move to Pro. Upgrade Upstash and Supabase to paid tiers sized to real traffic, and set spending alerts.
7. **Abuse protection.**
   - Turn on Vercel's firewall and bot protection.
   - Add Cloudflare Turnstile to sign-up and "Request update".
   - Add the 12-hour limit on update requests (PRD FR item).
8. **Privacy and compliance.**
   - Publish a privacy policy and terms.
   - Cover the Nigeria Data Protection Act (NDPA) and GDPR, since many clients are in the EU.
   - Add data export and delete-my-account.
   - KYC/"ID verified" must come from the payout partner, not be a self-set flag.
9. **Monitoring.**
   - Error tracking with Sentry.
   - Uptime checks.
   - Logs that never record payment details or wallet addresses in full.
10. **Stricter security policy.** Move inline scripts into separate files (or add hashes) so the Content-Security-Policy can drop `'unsafe-inline'`.
11. **An outside check.** Get a short penetration test, or at least an OWASP ZAP scan, before handling real money.

## 4. Rough capacity after the launch work

With items 1–6 done:
- Vercel Pro + Supabase Pro + Upstash pay-as-you-go comfortably serves 3,000 active freelancers and their clients.
- At that size, expect roughly $50–$100 a month in hosting, before payment fees.

## 5. Rules for working on this code

- Secrets live only in Vercel environment variables. Mention them by name only: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Never commit `.env` files.
- Any new field must:
  - be cleaned in `api/state.js` (use `txt()`, `list()` and `pairs()`);
  - be escaped wherever a page displays it (`esc()` / `escH()`).
- Never put user data inside `innerHTML` or an HTML attribute without escaping it.
- Any new client-page action must be added to `CLIENT_ACTIONS` on purpose. Everything else stays freelancer-only.
- Run `npm run test:e2e` before every push.
