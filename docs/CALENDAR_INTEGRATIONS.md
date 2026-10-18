# MODO — Calendar Integration Developer Notes

## Source layout

- `calendar-connectors.js`: Google Identity Services token client; Microsoft SPA OAuth 2.0 auth-code/PKCE; provider API fetch, events normalization, create/update/delete; Apple public URL validation.
- `app.js`: local workspace data store, connection settings UI, manual syncing, calendar source filters, saved event linking (local MODO event ID ↔ remote provider calendar/event ID), Apple feed subscription management, recurring ICS expansion.
- `server.mjs`: static server + public iCloud ICS proxy (`POST /api/calendar-feed`), allowlisted to HTTPS `pXX-caldav.icloud.com/published/...`, no cookies or credentials, no redirects off-host, content limits, timeout, simple rate limit.
- `index.html`: app script, Google Identity Services script, `calendar-connectors.js`.
- `sw.js`: caches the v2 app shell, not POST provider connections.

## Sync semantics

**Pull:** Manual, bounded calendar/event fetch. For each successfully fetched provider calendar, the cached events from that calendar are replaced atomically with the incoming snapshot; failed calendar pulls retain their old data. Outgoing MODO events linked to remote IDs are deduplicated from incoming provider events so they appear once.

**Visibility:** Calendar list `visible` checkboxes filter MODO rendering; they do not change the provider's actual calendars.

**Push:** MODO's event and meetup forms optionally select a writable connected calendar. The first save uses provider create. Later saves to the same calendar use PATCH with the saved external event ID. Publishing to a new destination creates a new external event; old destinations are not silently deleted. The user can explicitly remove a linked external copy while authenticated.

**Security:** Public OAuth Client IDs and calendar metadata only in localStorage; Google and Outlook access tokens only in JavaScript memory. Microsoft code verifier and state stored temporarily in sessionStorage for one redirect and deleted on return; auth response code removed from the URL. No client secrets or private iCloud password support. Configure HTTPS for production.

**Apple:** Public feed uses a manually refreshed, read-only ICS snapshot. RSS-like live feed subscriptions are possible only for calendars the owner has made public. A private, editable iCloud calendar requires a separate server-side CalDAV solution—not a frontend password field.

## Production backlog

1. Replace the hand-rolled Microsoft SPA PKCE adapter with the maintained Microsoft Authentication Library (MSAL Browser), verified against supported personal, school and work accounts.
2. Add cloud identity and per-user data isolation, secure encrypted refresh tokens on a trusted server, incremental sync/delta tokens and background jobs.
3. Make timezone handling and recurring event expansion RFC 5545-complete; support provider event exceptions and calendar edit conflicts.
4. Add explicit publishing conflict reviews, remote cancellation workflows and verified push reminders across mobile and desktop.
5. Conduct OAuth app verification/consent screen review, accessibility audit, automated integration test suites with consenting test accounts, and security review.
