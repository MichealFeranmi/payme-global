# PayMe Global: project brief for Claude Code

## Who you're working with
Micheal Alao, a product designer. He approves, you build, and then he gives feedback. He wants work that's fast, warm, concise and in plain English. Explain git and Vercel steps simply. He's not a full-time developer.
- Never ask for his passwords or tokens. He runs `gh auth login` and `vercel login` himself.
- When it comes to secrets, only ever mention the variable names, never the values.
- Commit and push only when he says so. Before every push, show him a short summary of what changed.

## What the product is
Designed invoice links for African freelancers. A freelancer picks a template for their craft (designer, developer, writer and so on) and sends the client a link (`/i/<code>`). The client abroad pays in USD by card or in USDT (Tron, TRC-20) into the freelancer's payout account: Cleva, Grey, Payoneer or their own USDT wallet. The client then follows the project stage by stage and can ask for updates.
It started as an entry to the Cleva × Tether hackathon. It was not shortlisted, so all hackathon and UNILAG mentions were removed. It's now a portfolio piece and a cold pitch to payout providers. Cleva is now just one of the payout options. The badge says "ID verified".

## Live setup
- GitHub repo `payme-global` (account michealferanmi444). **The site files sit in the `payme-global-site/` folder of the repo, not at the root.**
- Vercel project linked to the repo. **Root Directory = `payme-global-site`**. Every push to `main` deploys on its own. Production URL: payme-global.vercel.app
- Database: Upstash Redis (connected through Vercel Storage). Env vars: `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`). Use `vercel env pull` to work with them locally.

## Stack
- Static HTML/CSS/JS with no build step. Each page is one self-contained file (images inlined as base64, so the files are large; edit them with targeted find/replace, never by retyping).
- `api/state.js`: one Node 18 serverless function. It stores one JSON doc under the Redis key `payme:state:v1`, with an in-memory fallback.
  - GET returns the state. POST `{action,...}` with these actions: reset, sample, fresh, profile, create, pay, request, post, stage, read.
  - It also exports `seed()` and `apply(state, body)` so you can test it in Node.
- `vercel.json`: `cleanUrls`, plus a rewrite from `/i/:code` to `/client`.
- Pages check `/api/state` every 3 seconds, so a change on one device shows on the other.

| Route | File | What it is |
|---|---|---|
| `/` | index.html | Landing page (premium, Apple/Stripe level) |
| `/new` | new.html | Onboarding → payout → template → editor → send (creates a real link) |
| `/app` | app.html | Freelancer dashboard: projects, stages, updates, notifications, demo controls |
| `/i/<code>` | client.html | Client view: the invoice "prints", the client pays (simulated), tracks stages, requests updates |

### How data works
- The profile is saved with `custom:true` once a real freelancer sets it up.
- New users start blank. "Load sample data" (the `sample` action) brings back 6 sample projects and keeps the profile. "Clear all data" (`fresh`) empties the projects.
- Sample client codes:
  - Lumi (unpaid): `Lx4Hn8Wq2cVb`
  - Northwind: `k3Rf9xQ2mT7a`
  - Kora: `Qm7dX2pLr9Tz`
- There's no login yet: everyone shares one workspace.

## Design rules (keep them)
- Fonts: Instrument Sans, Geist Mono and Instrument Serif. Accent: Signal `#FF5B1F`, used once per screen. Paper `#F6F6F3`, Ink `#0F0F0F`, dark `#0A0A0A`. Light and dark themes. Test at widths 375 and 1440.
- Restraint:
  - Gradients under 8% opacity.
  - Hairlines that fade out.
  - Brushed-metal secondary buttons.
  - Photos blended into their section.
  - Eyebrow pills with a faint halftone clipped inside the pill.
  - Clear visual hierarchy, with related items grouped close together.
- Inputs must be at least 16px (to stop iOS zoom). Release focus after sending.
- The navbar hides when you scroll down and comes back when you scroll up (`nav-hid` class). Desktop side padding: 48px on the app pages, 56px on the landing page.
- In flex columns, buttons need `flex:none` so they don't squash. This bug has come back twice.

## Run and test locally
```bash
npm install && npx playwright install chromium   # once
npm run dev          # http://localhost:4173 (emulates Vercel rewrites + the API in memory)
npm run test:e2e     # in a 2nd terminal: create → client pays → app notified → request → reply; screenshots in test-shots/
```
Run the e2e test before every push. The output should end with `no page errors`.

## Deploy
```bash
git add -A && git commit -m "…" && git push   # Vercel deploys main automatically
vercel ls / vercel logs <url>                 # check the deploy (after `vercel link`, choosing the existing project)
```
After a deploy that changes the sample data, open `/app` → Demo controls → **Load sample data** once.

## Security
The project is at the **pitch-demo stage**. `SECURITY.md` lists what is protected now and the launch checklist (accounts, a real database, verified payments and more). Follow its rules for any new field or action.

## Open items
- **Round 2 is in this folder but may not be on GitHub yet.** Check with `git status`/`git diff` after copying it into the repo.
- Gaps against the PRD:
  - No login or accounts (one shared workspace).
  - The client page always uses the Ticket layout, even when another template was picked (FR-5b).
  - No 12-hour rate limit on "Request update".
- Possible next steps: a portfolio case study, a cold email to Cleva and other payout providers, and a custom domain.
