# PayMe Global

Designed invoices for Nigerian student freelancers. Clients abroad pay in USD or USDT into the freelancer's Cleva account, then follow the work stage by stage.
Built for the Cleva × Tether Future of Payments Hackathon, UNILAG Edition (2026).

## Pages
| Route | What it is |
|---|---|
| `/` | Landing page |
| `/new` | Create flow: onboarding → template → invoice editor → send (creates a real link) |
| `/app` | Freelancer app: dashboard, projects, stages, updates, notifications, demo controls |
| `/i/<code>` | Client page: the invoice prints, the client pays (mocked), tracks stages, requests updates |

All pages share one demo workspace through `/api/state` (a Vercel serverless function storing JSON in Upstash Redis). Pages check for changes every 3 seconds, so a payment or update on one device shows up on the other.
Payments are simulated and always succeed. **Reset demo** (in `/app` → Demo controls) restores the sample data for everyone.

## Deploy (about 15 minutes, no coding)
1. **GitHub**: create a new repository called `payme-global` (Public, no README). On the empty repo page click **"uploading an existing file"**, drag in **everything inside this folder** (including the `api` folder), then click **Commit changes**.
2. **Vercel**: **Add New… → Project → Import** `payme-global`. Framework Preset: **Other**. Click **Deploy**.
3. **Database**: in the project, open **Storage → Create Database → Upstash for Redis** (free plan) → **Connect** to the project (all environments). Then go to **Deployments → ⋯ → Redeploy**.
4. Open your URL: try `/`, `/new`, `/app`, and a client link such as `/i/Lx4Hn8Wq2cVb` (Clara, unpaid).

Without step 3 the site still loads, but data won't be shared reliably between devices.

## Demo script (3 minutes)
1. Laptop: open `/new` → pick a template → fill the client → **Send invoice** → copy the link.
2. Phone: open the link → the invoice prints → **Pay** with USDT → PAID stamp and receipt.
3. Laptop `/app`: the payment toast arrives; open the project → **Move to next stage** and post an update.
4. Phone: the stage and the update appear. Tap **Request update**.
5. Laptop: the request sits at the top of Home → reply. The phone shows the reply and "Replied in 1m".

## Tech
Static HTML/CSS/JS (no build step) + one Node 18 serverless function (`api/state.js`). Storage: Upstash Redis REST (`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`).
