# modo. — Your life. Your mode.

## MODO v3: Private accounts + saved, cross-device workspaces

MODO is a responsive Olive & Linen lifestyle web application containing **Today, Tasks, Calendar, People, Modes, Rituals, Meals, Insights**. The v3 build adds server-backed **signup, login, logout, password changes, password reset, email verification, authenticated user-owned data, and conflict-aware saves**. Existing calendar provider adapters are retained.

**Status:** Runnable multi-account release candidate for a **single persistent server**, with production security groundwork. It is **not a completed, security-audited public SaaS launch**. Read the deployment checklist below.

### Run locally

Node.js 22.13+ (Node 24 LTS recommended). The interface is a React app in `client/`; the Node server keeps accounts and workspaces.

```bash
npm install
npm run build
npm start
```

Visit <http://localhost:8080>. Select **Create account** to sign up, then use MODO.

### Vercel

Vercel serves the built interface from `dist` and runs the API as a serverless function. A local `.env` file is not uploaded. In the Vercel project settings, add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_ORIGIN` set to the site’s exact `https://` address. Add `RESEND_API_KEY` and `RESEND_FROM` when you want verification and password-reset email. Apply `supabase/migrations/20261018120000_modo.sql` in the Supabase SQL editor before the first deploy that uses that project. In the same project, open Settings → Deployment Protection and turn Vercel Authentication off. While that lock is on, the page loads and the API answers with Vercel’s login wall, which leaves the app on the connection error.

### Supabase

Importing the GitHub repo into Supabase does not create the tables. In the Supabase SQL editor, run `supabase/migrations/20261018120000_modo.sql`. Then copy the project URL and **service_role** key into a local `.env` file (see `.env.example`). Restart `npm start`.

The server keeps sign-in, passwords, and sessions. Supabase stores the accounts and workspaces. The service role key stays on the server and is never sent to the browser. Row level security is enabled with no public policies, so the anon key cannot read the tables. On the first start with Supabase configured, accounts already in `data/modo.sqlite` are copied across if the Supabase project is still empty. After that, sign in with the same email and password.

For interface work with live reload, run `npm start` in one terminal and `npm run dev` in another, then open <http://localhost:5173>. The dev server proxies the API to port 8080.

- With no email provider configured **in development only**, new users are immediately verified. For local password recovery, the development server prints a one-time recovery link to its console. Do not use this behaviour for production.
- Each account gets a new, empty workspace. The UI has no prefilled fictional people or challenges.
- In **Settings → Your data**, you can import a previous browser-local MODO workspace explicitly, import/export JSON, or clear your account's workspace. Migration requires confirmation and replaces all current account data.
- With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set, accounts and workspaces are saved in Supabase. Without those values, data is saved to `data/modo.sqlite`. Either way it survives browser refresh and server restarts. Sign in on another device against the same server to access it. Changes save automatically after ~450 ms; a network outage displays a warning and retries. If two tabs/devices edit the same workspace, saves detect revision conflicts and **do not overwrite without warning**. Conflicts still require manual reload/backup resolution.

### Security functionality implemented

- Passwords hashed with a unique salt using `scrypt` (`N=32768`, `r=8`, `p=1`) with 12-character minimum.
- Session tokens stored as hashes in SQLite; raw tokens in `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production). Session expiry 14 days, server-side logout revocation, password-change revocation of other sessions.
- Authentication, password recovery and verification links; one-time, short-lived reset/verification tokens stored as hashes.
- Cross-origin write protection: exact configured Origin, CSRF session token for authenticated writes, restricted content types and custom same-origin header.
- Account-level isolation on every workspace read/write; revision-based concurrency checks; account deletion removes account data on this server.
- SQLite WAL and foreign keys; capped JSON payloads; request throttling for account and feed routes; restricted static-file allowlist; CSP, frame and security headers.
- No calendar access token or password is persisted in MODO account data. Google/Microsoft OAuth access tokens remain **ephemeral in browser memory** and users reconnect after reload.

### Production deployment requirements

1. Deploy Node 24 LTS behind a **trusted HTTPS reverse proxy/load balancer** on a real domain. Set `NODE_ENV=production` and the exact `APP_ORIGIN=https://...`. The server refuses production startup without HTTPS origin and email configuration. The proxy must use HTTPS and should redirect HTTP to HTTPS.
2. Configure email with a verified domain: `RESEND_API_KEY` + `RESEND_FROM`. Verify that real signup verification, forgotten-password emails and delivery work. This project uses Resend's REST API as one implementation option.
3. Attach an **encrypted, persistent disk** to `MODO_DATA_DIR` (e.g. `/data`). Never deploy the SQLite file on ephemeral container storage. Establish tested automatic **backups and restore procedures** for SQLite and uploaded/associated user data.
4. Use a **single application instance** with SQLite. For horizontally scaled/high-traffic production deployments, move to a managed PostgreSQL database and shared session storage; do not run multiple containers against independent SQLite files.
5. Configure edge-level IP/rate protections, DDoS protections, monitoring, structured error logs, uptime alerts, abuse controls, and incident response. The bundled in-process limiter is not distributed or durable.
6. Register Google and Microsoft OAuth applications for your production origin / redirect. Confirm consent verification (Google may require additional approval for calendar scopes), Microsoft permission policies, real account sync behaviour, and token refresh strategy. Automatic background calendar sync and private iCloud CalDAV remain **future work**.
7. Enable a deployment pipeline with automated tests, security dependency scanning, browser regression tests, accessibility review, privacy policy / terms, regional data compliance, account-data export/deletion review, and independent penetration testing before broad public release.
8. Reminder notifications currently work only while the app is open; a background job/push provider is still required for durable scheduled notifications. Offline use without an authenticated server connection is not supported by v3.
9. For scalable file storage, move recipe photo data URLs (currently embedded in the workspace JSON) to private object storage. Browser/app request size is capped at ~2.5 MB.
10. Run a real email-provider and calendar-provider test on a staging deployment. Mocked integration tests cannot establish permission/verification success with Google or Microsoft.

### Environment configuration

See `.env.example`; the server reads values from `process.env` (it does **not** automatically load `.env`). Set them in your hosting dashboard or shell/environment. `APP_ORIGIN` must match the full browser origin (scheme, hostname, port) exactly for auth and saves.

Docker example, after creating a real HTTPS reverse proxy and setting environment variables:

```bash
docker build -t modo-app .
docker run --rm -p 8080:8080 -v modo-data:/data \
  -e NODE_ENV=production -e APP_ORIGIN=https://modo.example.com \
  -e RESEND_API_KEY=YOUR_SECRET -e RESEND_FROM='MODO <hello@example.com>' modo-app
```

**Don't use example/placeholder secrets or domains for a real launch.** Don't put production credentials into source control, GitHub actions logs or client-side code.

### Calendar providers

- **Google:** Google Identity Services access-token client → Google Calendar REST API. Calendar selection, event snapshot and explicit event create/update/delete on selected writable calendars.
- **Outlook / Microsoft 365:** Microsoft OAuth authorization code + PKCE → Microsoft Graph API, same core calendar operations.
- **Apple:** `.ics` import/export and **public** (read-only) iCloud calendar feeds via an authenticated, allowlisted server proxy. Sharing a public feed may expose event details to anybody with the share link. There is **no private two-way iCloud sync**.

Google/Outlook OAuth app client IDs are configured in MODO → Calendar connections. Public OAuth client IDs are not secret; do not supply client **secrets**. Provider integrations still require manual reconnection and do not have server-side refresh tokens.

### Manual/automated tests

Original MODO functions and calendar-adapter mocks are preserved:

```bash
python3 tests/functional_test.py
python3 tests/calendar_connectors_test.py
node tests/outlook_adapter_test.mjs
```

`tests/auth_e2e.py` requires a **running local server on port 8877** (`PORT=8877 APP_ORIGIN=http://localhost:8877 node server.mjs`). Its HTTP-level tests exercise account creation, sessions, isolation, saved workspaces, CSRF, stale revision conflicts and password changes. Some sandbox environments prohibit browsers from navigating to any local HTTP host; in those environments, the browser navigation portion cannot run even though HTTP and DOM-backed tests can.

### Known limitations

- User-owned workspace persistence uses a single JSON snapshot per user rather than normalized relational records. This is suitable for an early low-volume release; complex concurrent editing and sophisticated analytics will benefit from normalization and transaction-level APIs.
- Email verification is enforced with `RESEND_API_KEY` and `RESEND_FROM`; without those, development mode auto-verifies users (production mode refuses to start).
- New users start with empty data, not pre-populated demo profiles.
- MODO's app shell may cache public UI assets via a service worker, but **private account API responses are never cached**.
- App source and illustrative photos are not included in authentication secrets; calendar OAuth authorizations remain distinct from MODO account credentials.

**Brand:** `modo.` · Manrope · Linen `#F3EBDD`, Sand `#C8C3AA`, Sage Olive `#929879`, Olive `#59654D`, Deep Olive `#343D30` · minimal, quiet luxury, encouraging voice.
