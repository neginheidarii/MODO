# MODO - MASTER PRODUCT, BRAND, UX AND BUILD SPECIFICATION

> Copy this entire document into Claude Code, or attach it to Claude and use the kickoff message at the end. Treat this as the product source of truth for the first working release of MODO.

## 0. YOUR ROLE AND EXECUTION INSTRUCTIONS

You are a senior product designer, brand designer, full-stack software engineer, accessibility specialist, and QA lead. Build MODO as a genuinely working, mobile-first lifestyle operating system rather than a static landing page or Figma-like mockup. Deliver clean code, real navigation, connected feature flows, forms, persistence, responsive layouts, and usable UI. Do not stop after describing what you would build: implement it.

Use reasonable decisions when details are not specified. Do not repeatedly ask product questions. Only request secrets, OAuth registrations, accounts, or deployment permissions when genuinely essential. Document all assumptions and mark external services that are not connected. Never fabricate a successfully connected calendar, a sent notification, a saved remote record, a generated recommendation, or a completed integration.

Use a progressive implementation strategy: first establish a coherent application shell and design system; then authentication and persistence; then the connected core features; then integrations, accessibility, tests, and polish. If output or time is limited, prioritize a runnable end-to-end MVP over many disconnected mock screens. When unable to implement an integration without credentials, implement its data model, UI, adapter interface, backend endpoint, error states, and setup documentation, with a clearly labeled demo state.

Primary target: fully responsive WEB app and installable PWA on iPhone, Android, tablets, laptops and desktop browsers. The experience must feel mobile-native when installed but must not pretend to be an App Store-distributed native app. Keep the backend and domain models suitable for an optional later Expo / React Native native client.

## 1. PRODUCT OVERVIEW

Brand name: MODO (styled 'modo.').
Primary tagline: YOUR LIFE. YOUR MODE.
Supportive tagline: A more intentional everyday.
Optional campaign lines: Less noise. More living. / Make today yours. / Your day, your pace.
Category: Premium personal lifestyle and productivity operating system.

Vision: Help people intentionally manage the meaningful parts of everyday life in one calm, elegant environment: tasks and reminders, all calendars, relationships and meetups, customized challenges, habits and rituals, personally loved food and meal planning, and progress insights.

MODO is not a harsh discipline tracker, calorie-counting-first dieting tool, work-only project manager, or conventional business CRM. It is a gentle, capable, gender-neutral lifestyle companion. It must support different lifestyles without assuming that all users follow the same schedule, health goals, or challenge rules.

Primary user needs:
1. Know what matters today at a glance.
2. Quickly capture, organize, complete and reschedule to-dos.
3. Bring multiple external calendars into one view.
4. Remember people to meet and schedule real meetups.
5. Design personal 7-, 21-, 30-, 75-day or arbitrary-length challenges.
6. Build routines and mark daily habits without duplicating check-ins.
7. Remember meals cooked before and find new dishes matching personal taste.
8. Receive useful reminders rather than excessive alerts.
9. See honest evidence of progress through streaks and a GitHub-style activity heatmap.
10. Enjoy a consistent, beautiful UI in both light and dark modes.

Target experience: Quiet luxury plus excellent usability. Calm, minimal, warm, natural, visually refined and approachable. Functional priority is as important as aesthetics.

## 2. OFFICIAL BRAND IDENTITY

### 2.1 Name, logo, and mark

- Brand display name: 'modo.' in lowercase, with the period.
- Written product name in prose: MODO.
- Wordmark: custom-spaced lowercase Manrope, medium or semibold, never aggressively heavy. Refine optical spacing manually if implementing an SVG wordmark. Use small typographic sizes carefully.
- Primary wordmark: deep olive on linen.
- Reversed wordmark: linen on deep olive.
- App icon concept: rounded-square deep-olive field with a carefully centered lowercase 'm.' in linen. Simple enough to remain legible at 32 px. Avoid generic leaf symbols, gradients, unnecessary rings, fake trademark symbols or ornamental flourishes.
- Keep clear space around the logo equal to approximately the height of the 'm'. Never stretch, outline or recolor it arbitrarily.
- Logo and app icon can be implemented as editable vector/SVG components; avoid relying on a raster screenshot.
- Brand/legal note: MODO trademark, domain, app store listing name and logo clearance require independent legal and availability checks prior to launch. Do not claim those rights are secured.

### 2.2 Official palette - Olive & Linen

Exactly preserve these five brand anchors:
- Linen: #F3EBDD - main light background; warm, calm canvas.
- Sand: #C8C3AA - soft secondary surfaces, lines, subdued UI.
- Sage Olive: #929879 - subtle accent, secondary chart level, decorative elements.
- Olive: #59654D - primary buttons, active indicators, accessible muted text, interactive elements.
- Deep Olive: #343D30 - headlines, body text, navigation, stronger surfaces, app icon.

Supporting neutrals allowed for functionality:
- White: #FFFFFF - elevated cards.
- Warm-white: #FAF8F3 - soft cards and hover surfaces.
- Light divider: #E5E1D6.
- Error/destructive (use sparingly): #A54843, with accessible on-color treatment.
- Success should generally use brand olive, not a neon green.

Use roles, not random color selection. Create theme variables (CSS custom properties) for background, foreground, surface, elevated surface, text-muted, border, brand, brand-hover, focus-ring, destructive, success, calendar-source colors, heatmap levels and other semantic states.

Light mode:
- Background: #F3EBDD
- Cards: #FFFFFF or #FAF8F3
- Heading/primary text: #343D30
- CTA background: #59654D
- CTA text: #FFFFFF
- Secondary text: #59654D
- Muted outlines/dividers: #C8C3AA or #E5E1D6

Dark mode (Olive Night; not pure black):
- Background: #222820
- Elevated cards: #343D30
- Secondary surfaces: #3E4939
- Primary text: #F3EBDD
- Secondary text: #D7D9C8
- Brand highlights/progress: #B6C2A3
- Borders: #4B5845
- Primary buttons: light sage/olive with deep-olive text, or a distinctly visible brand-accent treatment.
- The five core brand colors remain the recognizable identity; dark-mode supporting values are permitted for contrast.

Accessibility note: do not use Sage Olive #929879 for small text on white or linen unless contrast has been checked. Aim for WCAG AA (4.5:1 normal text and 3:1 large text, plus accessible controls). All focus states must be visible.

### 2.3 Typography

- Primary, default and logo font: Manrope.
- Recommended weights: 400 regular, 500 medium, 600 semibold, 700 bold only for isolated emphasis.
- Default body 14-16 px, line height 1.5-1.65.
- Small metadata labels 11-12 px, readable and not excessively letter-spaced.
- Button text 14-15 px medium/semibold.
- Main page titles on mobile around 25-30 px, desktop around 30-38 px; use fluid clamp where appropriate.
- Headings: sentence case, not constant uppercase.
- Small overlines may be uppercase with careful tracking.
- Optional editorial-only display font: Instrument Serif, for an occasional marketing headline or onboarding statement, never for compact data, navigation, inputs or form labels. The shipped app should look excellent using Manrope alone.
- Load fonts through a privacy-aware local/framework-supported font loader (e.g. next/font/google at build time) with sensible fallbacks. Respect licensing.

### 2.4 Layout, components, and motion

- 8 px spatial grid; 4 px for fine increments.
- Generous whitespace. Avoid crowded dashboards, giant banners, excessive cards or redundant labels.
- Main cards 16-20 px radius; dialogs 20-24 px; input controls 10-12 px; buttons 10-14 px. Avoid cartoonishly round controls everywhere.
- Minimal or no shadows; thin strokes and tonal layering instead.
- Thin consistent Lucide line icons at roughly 1.75-2 stroke width.
- Progress: restrained olive bars, rings and heatmaps.
- Transitions: subtle 150-220 ms, ease-out, mostly opacity and position, with reduced-motion support.
- Use comfortable 44 by 44 px minimum tap targets for interactive controls where possible.
- Buttons and affordances must feel clickable. Support hover on desktop, focus and pressed states everywhere.
- Skeleton states, zero-data empty states and friendly recoverable error states.
- Do not sacrifice readability for aesthetics. Strong hierarchy and real data density matter.

### 2.5 Photography and imagery

Style: Warm natural sunlight, honest everyday lifestyle, quiet minimal interiors, linen textiles, ceramics, journaling, simple home cooking, elegant plated meals, olive branches used sparingly, soft architecture, coffee, hands doing everyday things. Beige/cream/warm green palette, subtle shadows, editorial composition, natural materials and realistic food photos.

Avoid: Stock-office imagery, glossy corporate gradients, artificial neon, exaggerated staged models, over-filtered photos, clutter, random decorative imagery on every screen, generic AI-looking faces, medical weight-loss imagery and overly gender-coded designs.

Use photography strategically on onboarding, discovery cards, recipe details, optional editorial content or empty states. Most task lists, calendars, insights and forms should remain mostly typographic. Images require licensed or user-provided assets, meaningful alt text and graceful placeholders. Do not hotlink unlicensed images or invent attribution. For sample recipe photography use allowed placeholders or licensed sources and label demo content.

### 2.6 Tone of voice and interface copy

Voice: calm, intelligent, warm, encouraging, clear, respectful, personal, understated, not patronizing. Focus on agency, flexibility and making room for life.

Preferred examples:
- Today: 'Make today yours.'
- Tasks empty state: 'A little room to breathe.'
- Rituals: 'Small things add up.'
- Modes: 'Your goals. Your rules.'
- People: 'Make time for people.'
- Meals: 'What are we cooking?'
- Insights: 'Look how far you've come.'
- Missed habit: 'Pick up where you left off.'
- Completed task: 'One thing off your mind.'
- Reconnect reminder: 'It's been a little while since you caught up.'

Avoid: 'Failure!', shame-based streak manipulation, alarmist overdue alerts, overuse of emoji, exclamation marks everywhere, forced motivational quotations, corporate jargon and fake praise. Copy must clearly explain actions and consequences.

## 3. APP INFORMATION ARCHITECTURE AND RESPONSIVE NAVIGATION

Eight primary product areas:
1. Today - unified daily dashboard.
2. Tasks - all to-dos, planning and recurring responsibilities.
3. Calendar - unified personal/work/connected calendars and MODO events.
4. People - personal meetup wishlist, connections, meeting plans and follow-ups.
5. Modes - personalized challenges including a fully custom 75-day reset.
6. Rituals - repeated habits, routine groups and check-ins.
7. Meals - personal food library, taste profile, recommendations and meal planning.
8. Insights - GitHub-like contribution calendar and meaningful progress metrics.

Additional: Profile, Settings, Notifications Center, Search, Quick Add, Onboarding, Authentication, Calendar Connections.

Mobile navigation (phone widths): persistent safe-area-aware five-item bottom bar exactly labeled Today / Tasks / Calendar / People / More. More opens a beautiful grid/list with Modes, Rituals, Meals, Insights, and links to Settings. Surface 'My Current Mode' prominently on Today so the signature challenge is not buried. Include a prominent unobtrusive contextual Quick Add button or action sheet (Task, Meetup, Mode, Ritual, Meal, Event).

Tablet/desktop navigation: persistent left sidebar listing ALL eight sections directly, with the MODO wordmark, account, settings and quick add. Optional right-hand contextual rail or split panel on large screens. Support compact/sidebar collapsed state. No bottom navigation on wide desktop unless necessary.

Information hierarchy: Today is a unifying overview, NOT a separate database. Every item shown there links back to its original record. Do not make duplicated task, mode, reminder or calendar data.

Suggested routes:
/ (redirect to /today or /welcome)
/welcome, /onboarding, /sign-in, /sign-up
/today
/tasks, /tasks/[id]
/calendar, /calendar/connections
/people, /people/[id], /people/[id]/meetups/[meetingId]
/modes, /modes/new, /modes/[id]
/rituals, /rituals/[id]
/meals, /meals/new, /meals/[id], /meals/planner
/insights
/notifications
/settings, /settings/appearance, /settings/reminders, /settings/privacy
/profile

Provide useful browser deep links, back behavior, route-loading states and share-safe links that never expose another user's private records.

## 4. GLOBAL USER EXPERIENCE RULES

- All core CRUD features must genuinely save, update and delete records in the app's data layer.
- Use optimistic UI where safe, with rollback/errors on failed saves.
- Every item has one clear source of truth; Today and Calendar are views of the source records.
- Universal search should be capable of finding tasks, people, challenges, rituals, recipes and events, filtered by permissions.
- All dates are interpreted in the user's preferred IANA timezone; persist appropriate UTC timestamps and timezone identifiers. Handle daylight saving changes. Dates without times must remain date-only, not shift unexpectedly across time zones.
- Recurrence must be modeled deliberately, not as a handful of pre-created fake tasks with no future logic.
- Provide undo for accidental deletion when reasonable and confirmations for irreversible operations.
- Preserve changes between sessions and across signed-in devices when backend is connected.
- Allow users to keep activities private and control notification timing.
- Data shown in demo mode must be identified as sample/demo data and must not pretend to be synced.

## 5. FEATURE SPECIFICATIONS AND USE CASES

### 5.1 TODAY - DAILY HOME DASHBOARD

Purpose: Everything relevant to the day in a calm, useful dashboard.

Must show:
- Date with timezone-aware greeting; optional short brand line.
- My Current Mode featured card: active challenge, day number, days remaining, calculated percent, daily commitments and direct navigation.
- Today's tasks: due/assigned/scheduled, priority and quick completion.
- Today's rituals: quick checkboxes or progress amounts.
- Next calendar events across selected calendars, with distinct source colors and links to details.
- Upcoming confirmed meetups and 'people to follow up with' when opted in.
- Planned meal of the day if any.
- Daily progress summary and short path to Insights.
- Quick Add action.
- Notification bell, profile and appearance access.

User can reorder/hide dashboard modules as a later enhancement; initially provide sensible defaults. Hide empty modules elegantly. The page should fit mobile without feeling like a very long stack of unrelated widgets. Desktop may use a 2-column dashboard.

### 5.2 TASKS - GENERAL AND DAILY TO-DO MANAGER

Must support:
- Create, read, update, delete, complete, uncomplete, archive or restore tasks.
- Fields: title, description/notes, priority (low/medium/high), category or project, tags, planned date, optional due timestamp, optional start time, end time or duration, status, reminder configuration, recurrence rule, optional subtasks, optional linked calendar event, created/updated/completed timestamps.
- Views: Inbox, Today, Upcoming, Recurring, Completed and All. Filters by category, priority, status, date; sort by due date, priority and manual order. Search tasks.
- A quick-capture single field plus a full task editor. Mobile create/edit in a bottom sheet or dedicated page; desktop dialog/side panel.
- Repeat schedules: every day, weekdays, selected weekdays, weekly, monthly, custom intervals and optionally end date/count.
- Distinguish a recurring task definition from its occurrences and completion history, so finishing Tuesday's version does not complete every day. Editing 'this occurrence' vs 'all future occurrences' must be explicit when applicable.
- Today and Calendar can show scheduled tasks without duplicating them; users may choose to hide tasks from Calendar if they prefer.
- Optional reminders: at time, 5/15/30/60 minutes before, day before or custom, and snooze 10 minutes/1 hour/tomorrow.
- Empty states and overdue rescheduling, without shame-based copy.

Example: User adds 'Pay hydro bill' due next Thursday at 6 PM, reminder at 3 PM, marks complete on time and sees it disappear from active Today tasks, still visible in history.

### 5.3 CALENDAR - UNIFIED EXTERNAL AND MODO CALENDAR

Goal: One timeline for a person's different calendars, events and relevant MODO activities.

MVP calendar views: agenda, day, week and month; responsive mobile agenda and day/week behavior. User can navigate date, jump to Today, search and filter by calendar/source. Calendar colors must remain identifiable in light and dark themes. Show event title, start/end, timezone, location, owner/provider, description, participants if available and permissions allow. Time-slot click or plus creates event. Drag/reschedule only when supported by source and write permissions. Provide conflict indicators, but not unsupported claims of free/busy data.

Connection architecture:
- Google Calendar: OAuth consent with minimal scopes, list calendars/events, read event details, optional authorized event creation/updating/deletion in a selected calendar. Handle refresh, expiry, revocation and disconnected states. Integrate official Calendar API.
- Microsoft Outlook / Microsoft 365: delegated OAuth and Microsoft Graph calendar APIs, with read and separately granted write scopes. Display connected calendars, handle refresh and sync errors.
- Apple Calendar/iCloud: distinguish actual native device-calendar integration from what a web PWA can access. For web MVP, provide ICS file import and ICS subscription where feasible; do not claim direct two-way iCloud sync unless a legitimate supported integration has been built and authorized. Native iOS EventKit or suitable securely implemented CalDAV can be a future native/advanced phase.
- Other calendars: manual ICS import and ICS feed subscription if URL is provided. Treat read-only subscribed feeds as read-only. File import is a snapshot, NOT automatically synced.
- MODO calendar: internal events created by the user and meetups, optionally mirrored to a selected writable connected calendar.

Rules:
- Separate external account connection from individual calendars selected for visibility.
- Preserve provider account ID + calendar ID + external event ID + recurrence instance ID to avoid duplicate events.
- Show sync status and last successful sync; allow manual refresh and disconnect.
- Changes to provider-owned events require write permission; explain read-only state.
- Warn before modifying or deleting an event also on a provider's calendar.
- Handle all-day events, multi-day events, recurring event instances, invites, different timezones, canceled events, daylight saving transitions and error recovery.
- Secure tokens server-side, never in client bundle/localStorage.
- When unavailable/offline, show last known synchronized events as stale or an honest unavailable state; do not invent connections.

### 5.4 PEOPLE - PERSONAL CONNECTIONS AND MEETUP PLANNING

Goal: A private, lightweight relationship planner, not a sales CRM.

People database fields: name, nickname, optional email/phone, category (friends, family, colleagues, mentors, other), tags, notes, how you know them, optional last met date, optional preferred cadence to reconnect, created/updated timestamps. Optional contact import only with consent, later phase. Contacts and notes are private by default.

Views:
- Want to meet / Wishlist (no time booked yet).
- Planning / Proposed (details tentative).
- Scheduled (confirmed with date/time).
- Completed / Meeting history.
- Optional reminders to reconnect.
- Person detail: notes, past meetups, upcoming meetup, next steps.

Meetup record fields: person ID(s), title or purpose (coffee, dinner, walk, call, mentorship), description, start date/time, end/duration, timezone, location/address or virtual meeting link, status, reminder rules, associated calendar ID and internal/external event IDs, notes, completed timestamp.

Critical workflow:
1. Add 'Sarah' to 'Want to meet' with note 'Catch up over coffee'.
2. Open that person, choose Plan Meetup, select date, start/end time, location and reminder.
3. Before confirmation, check availability and identify potential conflicts from readable calendars.
4. Once the user confirms scheduling, create a MODO calendar event immediately and optionally create in the user's chosen writable Google/Outlook calendar. If permissions are missing, make it an internal MODO event and clearly explain.
5. Save bidirectional linkage: meetup <-> calendar event. Editing time or place in People updates the corresponding MODO record and authorized external event; changes in synced provider should reconcile where supported.
6. Never create duplicates by repeatedly clicking Confirm; use idempotent creation/upsert and provider identifiers.
7. After the actual meeting takes place, user marks meetup Completed, optionally adds notes, updates last-met date, optionally schedules next follow-up. The past calendar event remains in history.
8. Allow reschedule, cancel, delete and undo as appropriate, with clear calendar effects.

Optional: recurring relationship check-in nudges, contact birthdays, invitations, shared events, automatic suggestions only with privacy controls. Do not automatically email/invite anyone without explicit authorization.

### 5.5 MODES - FULLY CUSTOM CHALLENGES (SIGNATURE FEATURE)

My Mode is MODO's product differentiator. Do NOT impose the traditional '75 Hard' rules as defaults for everyone. A user must be able to design custom duration and commitments.

Creation wizard:
1. Challenge name, subtitle/description and optional cover style/icon.
2. Duration presets 7, 21, 30, 75 days OR custom integer duration; optionally choose a start date.
3. Add any number of commitments/rules; each can be binary (did/did not), quantity (pages, liters, reps), timed (minutes), or frequency-based. Optional target and unit.
4. Pick each rule's schedule (daily, weekdays, selected days, N times per week), a reminder time if wanted, and whether it links to an existing ritual.
5. Pick progress behavior: Flexible (missed days allowed), Streak (continuous success tracked without resetting total challenge) or Strict (missed required day can trigger a user-confirmed restart). Support rest days and excused breaks. Never restart silently.
6. Preview and Start, with edit/archive/pause/resume options and explicit confirmation of changes that affect history.

Challenge detail:
- Title, dates, current day, days remaining, accurate percent elapsed and separately completion/adherence percentage.
- Daily commitment cards with checkbox / numeric progress entry.
- Calendar grid of all challenge days, past check-ins, skipped/rest days and upcoming days.
- Streaks, milestones, notes/journal and original rule history.
- Multiple concurrent challenges supported.
- Filter to active, upcoming, paused, completed, archived.
- Editing rules mid-challenge may version future requirements instead of retroactively falsifying past completion.

Example 'The 75-Day Reset': move 45 min, read 10 pages, drink 2 liters water, journal 5 min, mindful moment 10 min. A sample day 32 of 75 is approximately 43% elapsed, with 43 days remaining. Daily commitment completion is separate from elapsed-day percentage.

### 5.6 RITUALS - HABITS AND ROUTINES

- Add/edit/delete/pause/restore rituals.
- Ritual fields: name, description, icon, category, schedule (daily, weekdays, custom weekdays, times/week), optional target amount/duration/unit, reminder times, optional morning/evening routine grouping, optional active time window.
- Track completion for each date, including numeric amounts and notes where relevant.
- Views: Today, All Rituals, Morning, Evening, history, streaks.
- Habit completion from Today, Rituals or linked Mode MUST write one canonical check-in; it then updates every linked view without double-counting.
- Support days off, breaks, partial completion and timezone-aware streak calculations.
- Show gentle progress, not penalties. Avoid fake streak numbers or misleading counts.
- Deletion should not unexpectedly delete unrelated Mode history; handle linked history safely.

### 5.7 MEALS (MY KITCHEN) - FOOD HISTORY AND PERSONAL TASTE

Name the top-level feature 'Meals' (optional friendly in-page title: 'My Kitchen'). Do NOT call it 'Diet' in primary navigation. It is about enjoyable eating and cooking, not mandatory calorie restriction.

Core features:
- Personal library of food/recipes made before, searchable by name, ingredient, cuisine, flavor, tags and dietary preference.
- Add, edit, archive, delete and duplicate a recipe.
- Recipe fields: name, optional user photo, category/cuisine, ingredients with quantity/unit, optional instructions, servings, prep time, cook time, tags, taste notes, rating/favorite, last cooked and cooked count.
- Record 'I cooked this' with a date, rating, optional notes, substitutions and optional photo. Maintain a cook history rather than only incrementing an untraceable number.
- Lists: Cooked Before, Favorites, Try Next, All Recipes.
- Taste profile inferred from explicitly liked/saved/cooked recipes and user-selected preferences (e.g., salmon, pasta, creamy sauce, garlic, Mediterranean, spicy/not spicy); allow users to correct/delete preferences.
- Simple explainable recommendations first: tag/ingredient affinity. E.g. 'Because you liked Creamy Salmon Pasta' suggest Creamy Salmon Orzo, Lemon Shrimp Linguine, Creamy Tuscan Salmon, Pesto Chicken Pasta, based on relevant attributes. Do not claim machine learning or real AI unless implemented.
- Weekly meal planner: place a saved recipe on date and optional mealtime, link to internal Calendar if time is explicitly scheduled.
- Grocery list: generate candidate ingredient items from planned recipes, allow user to edit/remove/check items and avoid blind duplicates. Grocery items may also appear in Tasks if deliberately linked.
- Optional dietary restrictions and allergens with user consent; don't provide medical advice or pretend a meal is medically safe.
- Image upload with proper storage permissions and file constraints.

Important cross-feature workflow: find 'Creamy Salmon Pasta', schedule it for Thursday evening, generate the grocery checklist, and see the plan on Today / Calendar if time-selected. Updating or removing the meal plan must update the linked calendar event without duplicate entries.

Later enhancements: recipe URL import, pantry, nutrition fields (opt-in), voice capture, photo-assisted entry, optional AI recipe suggestions with explicit consent and transparent behavior.

### 5.8 INSIGHTS - PROGRESS, CONSISTENCY AND REFLECTION

The signature visualization is a GitHub-inspired contribution/consistency calendar: a grid of small daily squares spanning approximately the last 12 months, with weeks as columns and weekdays as rows. The palette should use graded olive tones from no activity to high completion. Provide month labels, accessible legend, keyboard focus and a useful tooltip/details panel when selecting a date.

Features:
- Heatmap filters: All Activity, Tasks, Modes, Rituals; optional Meetings/Meals only if participation/completion is explicitly tracked.
- Each selected day reveals actual completed items and denominators, not invented metrics.
- Calendar aggregates day by the user's timezone.
- Distinguish 0 activity from 'nothing planned' and from 'missed commitments' where data supports it.
- Do not award inflated scores to users with simply more scheduled tasks; use transparent rules. E.g. show daily completion rate (completed planned commitments / total applicable planned commitments) plus completed count, with clear handling for no scheduled items.
- Summary metrics: completed tasks this week, ritual consistency, active challenge adherence, current/longest streak, selected-period trend.
- Period selectors: Week / Month / Year; beautiful responsive charts.
- Allow filtering between one challenge or ritual and all activity.
- Give data provenance: sample charts only in clearly labeled demo mode. For real users, compute exclusively from persisted activity.
- Minimal celebratory milestones; avoid shame, misleading scorecards or fabricated statistics.

### 5.9 NOTIFICATIONS AND REMINDER ENGINE

One unified reminder system for tasks, rituals, Modes, calendar events, meetups and recurring relationship follow-ups.

User options:
- Notification center with unread/read state.
- Settings for reminders by feature, default lead time, quiet hours, timezone and selected days.
- Ask for browser/push permission in context after explaining its value; never on initial page load without context.
- Due/reminder rules, recurring instances, snooze, reschedule, dismiss, open linked record, mark task/ritual done when appropriate.
- Avoid duplicated reminders across linked task/calendar/mode objects.
- Deduplicate deliveries, maintain delivery status, reschedule changed items and cancel reminders for deleted/canceled records.
- Support in-app notifications as a baseline. Implement standards-based Web Push with a service worker and VAPID where permitted. Explain platform constraints and obtain consent.
- On iOS, web push requires a supported Home Screen-installed web app; do not promise browser push where not available. Do not pretend delivery is guaranteed when offline or when browser/OS blocks notifications.
- Optional email reminders later, disabled unless configured and opted in.

### 5.10 LIGHT / DARK / SYSTEM THEMES

Theme options in Settings: Light, Dark, System. Persist preference to account and locally so the experience does not flash wrong theme on load. The design must be fully consistent across every screen, dialogs, calendars, charts, images and input states. Support OS preference changes for System mode. Ensure charts and heatmap legend remain readable in both themes.

### 5.11 PROFILE, SETTINGS AND PERSONALIZATION

Allow user to manage display name, optional avatar, email/auth, preferred timezone, locale (English default), week start day, default start view, theme, dashboard preferences (later), default reminder lead, notification permission guidance, connected calendar accounts, account export and deletion, privacy controls, sign-out.

### 5.12 SEARCH, QUICK ADD, AND CROSS-FEATURE SHORTCUTS

Global Quick Add choices: Task, Event, Meetup, Mode, Ritual, Recipe/Meal. Context-sensitive defaults. Global search filters. When creating a meetup from a calendar day, prefill date/time; when creating a task from Today, prefill today; when planning a meal from a recipe, prefill that recipe.

## 6. CORE CROSS-FEATURE USER JOURNEYS

Implement and verify at least these journeys:

A. Task journey: Add 'Finish report', set tomorrow 10 AM deadline, reminder 30 minutes before; it appears in Tasks and Today on the correct date; completing it updates both and preserves history.

B. 75-day challenge journey: Create 75-Day Reset with five personal commitments; on day one log reading and workout; linked Rituals reflect those entries; challenge daily progress and Insights heatmap update; reload preserves changes.

C. Meetup journey: Add Sarah to Want to Meet; schedule coffee next Friday 11 AM at a cafe; confirm; one and only one MODO calendar event exists; rescheduling in People updates that event; marking meetup complete stores notes/history; optional external writing happens only with explicit permission.

D. External calendar journey: Connect Google or Outlook with OAuth credentials, choose calendar visibility, import remote events, display source-specific colors, refresh without duplicates, create event in a selected writable calendar when authorized; if credentials not supplied, show honest unconnected/setup state.

E. Cooking journey: Save Creamy Salmon Pasta, tag seafood/creamy/pasta, rate it, log cooking, view tasteful related suggestions, schedule for Thursday 7 PM, generate grocery list, see linked event and tasks when intentionally added.

F. Recurrence journey: Weekly cleaning task repeats on Sundays; completing one occurrence does not complete future ones; notifications are scheduled per occurrence.

G. Heatmap journey: Complete today's items; the current-day square changes according to real stored completion values; tapping it shows the actual completed and planned details.

H. Theme journey: Switch Light -> Dark -> System; all major routes visibly update and chosen preference persists after reload.

I. Responsive journey: On narrow phones, all screens remain usable with fixed bottom navigation and safe areas; on large screens, full eight-item sidebar appears and dashboards use available width.

J. Privacy journey: User A cannot query, view or modify User B's People notes, recipes, tasks, calendar tokens or activity through frontend or backend APIs.

## 7. SCREEN INVENTORY AND UI DETAILS

Design and implement these essential screens and panels:

1. Welcome / landing: restrained editorial greeting, logo, brand statement, sign in/get started. Avoid gratuitous carousels.
2. Sign up / sign in / forgot password with clear validation and real auth states.
3. Onboarding: goals selection, lifestyle interests (tasks, habits, meetings, meals), timezone, theme choice and option to connect calendars later. Skippable; no misleading personalized stats.
4. Today dashboard: mode progress, next event, tasks, rituals, meals and short insight.
5. Tasks: list filters, add/edit sheet, recurrence/reminder settings, task detail, completed archive.
6. Calendar: day/week/month/agenda, filter drawer, event detail/editor, connection management, sync statuses.
7. People: wishlist/planned/scheduled/completed tabs, add/edit contact, person profile, meetup creation and editing, follow-up.
8. Modes: list, create wizard, daily challenge detail, requirement editor, progress calendar, pause/resume/complete history.
9. Rituals: habit list, create/edit, today logging, routine grouping and history.
10. Meals: recipe library, Cooked Before, Favorites, suggestions, recipe detail/edit, log cooking, meal planner, grocery list.
11. Insights: olive heatmap with day detail, weekly/monthly/yearly analytics, accessible metrics.
12. Notifications inbox / reminder preferences.
13. Profile / Settings / Appearance / Connected Accounts / Privacy.
14. More menu for phone, with direct links to Modes, Rituals, Meals and Insights.
15. Shared universal quick-add sheet and global search.

Loading skeletons, thoughtfully designed empty states, real inline validation, confirmation/undo and friendly error states must be covered for each relevant screen.

## 8. TECHNICAL ARCHITECTURE - RECOMMENDED IMPLEMENTATION

Build a high-quality responsive web/PWA using:
- Next.js App Router with TypeScript and current stable compatible versions.
- Tailwind CSS and CSS variables for MODO theme tokens; shadcn/ui / Radix primitives for accessible controls, adapted to MODO visuals.
- Lucide React for icons.
- Manrope using Next.js-supported font loading.
- React Hook Form + Zod for input forms and validation.
- date-fns or an equivalent robust date/time library, with explicit timezone handling. Use a tested recurrence library if necessary rather than brittle custom string logic.
- Responsive calendar: a well-supported React calendar library with licenses checked, customized to match MODO; avoid premium-only dependencies unless disclosed.
- Charts: Recharts or another accessible, maintained charting library; heatmap can be custom CSS grid/SVG with tooltips and keyboard interaction.
- Supabase for Postgres database, authentication and private object storage. Enforce row-level security on all user tables; use server-side integrations for provider OAuth and background jobs.
- PWA manifest, branded icons, service worker, installable experience, appropriate cache/offline behavior, and standards-based Web Push where possible.
- Deployment target: a platform compatible with Next.js server features (e.g. Vercel) plus managed Supabase, with documented required environment variables.

Architecture rules:
- Keep clear layers: domain models, data access / repositories, server integrations, UI components, screens.
- Strong TypeScript types and runtime validation for external input.
- Never expose secret API keys or OAuth refresh tokens to the browser.
- Use auth context / server sessions correctly, not fake user IDs.
- Implement real persistent CRUD and migrations rather than localStorage-only as the supposed final product. A clearly labeled local demo fallback may be offered before Supabase env values are configured.
- Components should be composable, reusable, accessible and testable. Avoid a giant single page.tsx component.
- A reliable timezone and recurrence strategy is mandatory before implementing reminders, calendar sync and streaks.

Suggested code organization:
- app/ route groups for auth and authenticated workspace.
- components/ui/ base controls, components/layout/ app shell, components/features/ modules.
- lib/brand/ tokens, lib/dates/, lib/recurrence/, lib/validation/, lib/providers/calendar/, lib/notifications/, lib/insights/.
- server/actions/ or app/api/ for mutations/integrations, with authorization checks.
- supabase/migrations/ SQL schema + RLS, seed data and type generation support.
- tests/ unit, integration and e2e.

Official source references for integration implementation:
- Next.js App Router and PWA: https://nextjs.org/docs/app and https://nextjs.org/docs/app/guides/progressive-web-apps
- Supabase Auth / RLS: https://supabase.com/docs/guides/auth and https://supabase.com/docs/guides/database/postgres/row-level-security
- Google Calendar: https://developers.google.com/workspace/calendar/api/guides/overview
- Microsoft Graph Calendar: https://learn.microsoft.com/en-us/graph/api/resources/calendar?view=graph-rest-1.0
- Web Push for Safari / Home Screen apps: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers

## 9. PROPOSED DATA MODEL (MIGRATIONS REQUIRED)

Use consistent UUID primary keys, created_at, updated_at, user_id ownership where relevant, proper foreign keys, indexed lookups, and RLS. Exact naming can be improved if documented. Minimum conceptual tables:

- profiles: user_id, display_name, avatar_url, timezone, locale, week_starts_on.
- user_preferences: user_id, theme (light/dark/system), dashboard options, reminder defaults, quiet hours, privacy flags.
- tasks: id, user_id, title, description, status, priority, category, tags, start_at, due_at, scheduled_date, duration, recurrence_rule, archived_at, completed_at, linked_event_id.
- task_occurrences: id, task_id, occurrence_date or start_at, status, completion metadata, exceptions; uniquely index task + occurrence identity.
- task_reminders: id, task_id or occurrence_id, lead/delivery time, channel, enabled.
- modes: id, user_id, title, description, duration_days, start_date, status, progress_policy, pause metadata.
- mode_rules: id, mode_id, title, metric_type, target_value, unit, schedule_rule, required flag, linked_ritual_id, effective_from/effective_to for versioning.
- mode_checkins: id, mode_id, rule_id, local_date, quantity/value, is_complete, note, created_at. Unique appropriate date/rule identity.
- rituals: id, user_id, name, category, schedule_rule, metric_type, target, unit, reminder settings, status.
- ritual_logs: id, ritual_id, local_date, quantity, complete, notes, timestamps; unique ritual + user + date where model allows.
- calendar_connections: id, user_id, provider, provider_account_ref, connection_status, access scope metadata, encrypted token references, last_sync_at.
- external_calendars: id, connection_id, provider_calendar_id, title, display_color, visible, writable, sync_status.
- calendar_events: id, user_id, provider_ref nullable, external_calendar_id nullable, external_event_id nullable, series/occurrence ID nullable, title, description, start_at, end_at, is_all_day, timezone, location, availability, status, source, last_sync_at, linked_entity_type/id. External identities should be uniquely constrained per provider/context.
- people: id, user_id, display_name, contact fields, category, tags, notes, last_met_date, reconnection preference.
- meetups: id, user_id, person_id (or participants join table), title, purpose, start_at, end_at, timezone, location, status, reminder settings, linked_event_id, notes, completed_at.
- recipes: id, user_id, name, description, ingredients, instructions, category, cuisine, tags, photo_path, prep/cook time, servings, favorite, dietary tags.
- recipe_ingredients: structured ingredient/unit/quantity records if needed for shopping list calculation.
- cooked_meals: id, user_id, recipe_id, cooked_at/local_date, rating, notes, substitutions, photo_path.
- meal_plans: id, user_id, recipe_id, scheduled_date, meal_type, optional start_at/end_at, linked_event_id, status.
- grocery_lists and grocery_items: id, owner, text, quantity/unit, linked_meal_plan or recipe, status, source.
- push_subscriptions: id, user_id, endpoint, keys encrypted/securely stored, device metadata, status.
- notifications: id, user_id, source_type/source_id, scheduled_at, delivered_at, read_at, delivery_status, channel, dedupe_key.
- daily_activity_aggregates: optional materialized/cache table, user_id, local_date, source_type, planned_count, completed_count, score; the canonical data remains in check-ins/occurrences and this aggregate is reproducible.

Also create tables for tags/join relations when needed. Use DB constraints for status enums, CHECKs for positive duration, unique source identities, cascading rules that do NOT unintentionally delete historical activity, and RLS for SELECT/INSERT/UPDATE/DELETE. File storage paths must be scoped by user and protected by policies. Include versioned SQL migrations and a relationship diagram or written map in README.

## 10. INTEGRATION AND DATA CONSISTENCY RULES

Calendar providers: define a CalendarProvider interface such as listAccounts/listCalendars/listEvents/createEvent/updateEvent/deleteEvent/syncChanges; implement provider-specific adapters for Google and Microsoft. Handle OAuth scopes and state securely. ICS import and read-only subscription should use different adapters/states. External integrations are optional and cannot break internal calendar functionality.

Linked entities: MODO Tasks, Meetups, and Meal Plans own their business meaning. Calendar events own scheduled time display and synchronization state. Store durable references, avoid duplication, use idempotency keys when creating external events, and avoid circular loops between provider webhooks and local update handlers.

Conflict resolution: define source-of-truth rules, last synced version/etag when supported, and explicit UI for conflicts. Never silently overwrite a newer provider change or delete a user's external event without confirmation. Handle partial failure (local saved, provider failed) visibly with retry action.

Reminder engine: server scheduled jobs check pending notifications in a window, dedupe by key, respect timezone/quiet hours and canceled items, send web push only to opted-in active subscriptions, and record delivery result. Notifications center still works even if push is unavailable.

Insights engine: counts derived from actual task occurrences, ritual logs, mode check-ins; avoid double-counting a linked ritual and mode rule as two distinct actions in All Activity. Define denominators and no-planned-day handling. Use timezone-local date boundaries.

## 11. RESPONSIVE DESIGN REQUIREMENTS

Target viewport checks at a minimum: 320, 375, 390, 430, 768, 1024, 1280 and 1440 px widths.

Mobile (< 768px, approximate):
- Single main column, mobile bottom nav, app-safe-area padding.
- Sticky page actions where appropriate, thumb-friendly buttons, bottom sheets and full-screen modal alternatives.
- Today cards stacked carefully; charts and calendar adapt to screen. Weekly calendar may horizontally scroll inside its own contained region, never the whole document.
- Touch-friendly heatmap with horizontal contained scrolling and tap details.
- No clipped dialogs, horizontal page overflow, bottom-navigation overlap or tiny icons.

Tablet (768-1023px approximate):
- More room for split panes and two-column grids, potentially collapsible rail; maintain touch controls.

Desktop (>=1024px approximate):
- Full eight-section left sidebar, main content width ~1200-1440px as appropriate, 2-column dashboard, three-pane calendar only when space allows.
- Keyboard navigation, desktop dialogs, hover states, contextual quick-add.
- Balanced whitespace; no stretching single narrow mobile cards across very wide screens.

Use semantic HTML, visible focus indicators, accessible labels, keyboard support, proper error announcements, reduced-motion preferences, and sufficiently high contrast. Respect browser zoom up to 200% and 400% on narrow screens. Support localization-ready date formatting even if v1 English only.

## 12. DEMO DATA FOR VISUAL QUALITY (CLEARLY LABELED)

Provide an explicit Demo Mode or onboarding sample view; demo records must be obviously sample content and separate from real accounts. Make dates relative to current date so examples remain useful.

Suggested demo:
- Mode: 75-Day Reset, day 32/75, 43% elapsed, 43 days left, with rules: Move 45 min, Read 10 pages, Drink 2 L, Journal 5 min, Mindful moment 10 min. Two of five rules complete today.
- Tasks: Morning workout, Finish project proposal, Pay electricity bill, Buy groceries; mix of due dates/priorities.
- Rituals: Movement, Reading, Hydration, Journaling, Mindfulness.
- Calendar: one personal appointment, one work meeting, one scheduled dinner; use explicit 'demo calendar' source labels, NOT fake connected Google/Outlook accounts.
- People: Sarah (coffee meetup wishlist), Alex (scheduled lunch), Maya (follow-up reminder); synthetic data only.
- Meals: Creamy Salmon Pasta, Pesto Chicken Pasta, Lemon Garlic Salmon, Salmon Rice Bowl; suggestions Creamy Salmon Orzo and Lemon Shrimp Linguine.
- Insights: demonstration heatmap labelled sample, with selectable days and an honest explanation that the numbers are illustrative.

## 13. PRIORITIZATION AND DELIVERY PHASES

The comprehensive product vision includes all eight areas. Build it in coherent steps:

PHASE 1 - RUNNABLE FOUNDATION (must deliver first):
- Next.js project, theme tokens, responsive app shell/navigation, branded logo and icons, Supabase auth/data schema/RLS or clearly labeled demo fallback, onboarding, Today and core route skeletons with polished visual layouts.

PHASE 2 - WORKING DAILY LIFE CORE:
- Task CRUD, recurring task occurrences, Ritual CRUD/check-ins, Mode creation and daily tracking, Today connected summaries, real Insights heatmap, Light/Dark/System persistence, internal reminders/in-app notification center.

PHASE 3 - CALENDAR AND PEOPLE:
- Internal calendar views/event CRUD, provider connection settings and Google/Outlook integration adapters with credential-gated real auth, ICS import, People CRUD, meetup planner, linked calendar events, rescheduling/duplicate prevention.

PHASE 4 - MEALS AND POLISH:
- Recipe library CRUD, cook history, favorites, preference matching, meal planning, grocery list links, accessibility fixes, PWA manifest/web push where supported, tests and production readiness.

If a one-pass build is requested, still create route-complete UI and implement the coherent vertical slices before claiming every integration is done. Favor finishable working workflows over superficial breadth.

## 14. ACCEPTANCE CRITERIA AND TEST PLAN

Automated and manual tests should cover:
1. New user signs up and creates one task; task persists after reload and only belongs to that user.
2. Create/update/delete task, change its due date, toggle completion, and verify Today/Tasks reflect same state.
3. Recurring task occurrence and a different future occurrence have independent completion states.
4. 75-day challenge creates valid day numbers and progress; partial daily rules do not falsely mark whole day done.
5. Linked Ritual and Mode check-in are not double-counted.
6. Create meetup -> calendar event, update -> same event updated, cancel -> linked event appropriately updated, no duplication.
7. Switching calendar visible sources changes only display, not source data; provider unauthorized state is clearly indicated.
8. ICS imported feed reflects correct read-only treatment and timezone where applicable.
9. Cooked dish adds one history entry; Taste Match recommends explainable similar meals; grocery list editable.
10. Heatmap changes based on actual persisted data and shows correct details for selected date.
11. Reminders honor consent, are deduped after reschedules, and gracefully indicate blocked permissions.
12. Light/Dark/System works across routes with no low-contrast text.
13. Screens pass visual checks at mobile and desktop sizes; no sideways overflow, cut-off controls or obscured buttons.
14. Basic keyboard navigation, screen reader labels and focus management work, including dialogs and calendar cells.
15. RLS tests prove User A cannot read User B's contacts, notes, tasks, recipes or events.
16. No private API keys are shipped to the browser; environment validation and secure OAuth state handling are included.

Use unit tests for recurrence, progress math, date helpers, recommendation ranking and event linkage; integration tests for data/RLS and API behavior; Playwright (or equivalent) e2e for major user journeys; and responsive screenshots if tooling supports them. Fix failing tests rather than only listing them.

## 15. EXPECTED DELIVERABLES

Create an actual project/repository including:
- Complete source code, reusable components and route structure.
- Working responsive PWA UI that honors the MODO brand, dark/light/system mode and all eight features.
- Database schema and migrations with explicit RLS policies.
- Seed/demo dataset kept separate from real accounts.
- Calendar integration modules/settings and honest credential-gated states.
- Service worker/manifest/push integration or clearly documented supported scope.
- `.env.example` with required variables; never embed real secrets.
- README: run locally, connect Supabase, configure Google and Microsoft calendar credentials, configure Web Push, test, build and deploy.
- Tests, lint/type checks, and a brief implementation-status checklist for what truly works versus which external setup is pending.
- A concise architecture note with data flow, linked event rules and privacy safeguards.
- A visually cohesive product: no default generic blue dashboard, no generic SaaS template, no excessive gradients, and no unlicensed images.

## 16. EXACT IMPLEMENTATION GUIDANCE FOR CLAUDE

Start by describing the chosen structure in 10-15 succinct lines and then WRITE CODE. Establish all files needed to run the app. Implement real data bindings instead of hardcoded list items whenever the underlying module is claimed complete. Use seeded demo content only in demo mode. Avoid placeholder buttons, dead-end cards and forms that never save. For integrations requiring developer keys, build honest 'Connect' setup flows and interfaces and explain which environment variables are required. Keep a task list as you work, make incremental builds, resolve type errors and report test output accurately.

For each completed feature state exactly what has been implemented and what remains. Do not call a static UI 'fully functional.' Do not use fake provider sync, fake notification deliveries, fabricated progress for actual users or unauthorized calendar updates. Make tradeoffs explicit.

When finished, respond with:
1. What was built, with routes and important files.
2. Commands to install and start locally.
3. Required environment variables and instructions for connecting external services.
4. Which features work end to end now and which integrations need credentials/further development.
5. Test/build results and remaining known issues.
6. Proposed next development step.

### FINAL PRODUCT NORTH STAR

MODO is the calm, beautiful home for a person's everyday life. Tasks, time, people, personalized challenges, rituals, meals and insights all work together through one coherent system. Everything feels intentionally designed in Olive & Linen, with the lowercase 'modo.' wordmark and Manrope typography. The experience is minimal but not empty, attractive but not ornamental, gentle but genuinely powerful, and excellent on both mobile and desktop.

---

## OPTIONAL SHORT KICKOFF MESSAGE (IF ATTACHING THIS FILE TO CLAUDE)

Build the MODO application using the attached `MODO_Claude_Master_Build_Prompt.md` as the complete product and brand specification. I want actual working application code, not a PRD or just static mockups. Start with a mobile-first, desktop-responsive Next.js/TypeScript/PWA app using the specified Olive & Linen design system, navigation, domain models, and core workflows. Use Supabase for authenticated persistence and secure data, and implement calendar integration with honest credential-dependent setup. Begin with the runnable foundation and continue through the connected MVP features; validate responsive behavior and report exactly what works. Make thoughtful engineering decisions rather than asking repeated clarification questions.
