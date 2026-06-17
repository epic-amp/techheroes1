# TechHeroes — Production build (Vercel + Neon)

React frontend + serverless API on **Vercel**, data in **Neon Postgres**.
Roles: **Tutor** and **Student**. No demo accounts, no sample data — every screen
reads and writes the live database. Fully bilingual (English / العربية, RTL) and
dark/light mode; switching language translates the entire interface.

## What's wired (all live against Neon)
- **First-run setup** — on an empty database the app shows a "Create administrator"
  screen. It self-locks once the first tutor exists.
- **Auth** — real login (student S-NUM + password, tutor email + password), JWT,
  role-based access control.
- **Students** — create / edit / deactivate / delete (tutor).
- **Groups** — create / rename / delete, add & remove members (tutor).
- **Materials** — share by group or to everyone; students see only theirs.
- **Assignments** — create per group or individual, deadlines; per-student status.
- **Submissions & grading** — students submit; tutor reviews and publishes grades + feedback.
- **Messaging** — personal (tutor ↔ student) and group chat, REST + polling
  (every 4s). Sending a personal message notifies the recipient.
- **Notifications** — per user, with mark-all-read.
- **Profile** — edit name / change password.
- **Analytics & dashboard** — computed from real data (grade distribution, top
  performers, at-risk, submissions over 7 days); honest empty states until data exists.

## Deploy (browser only, no command line)

### 1) Database — Neon
1. At **neon.tech**, create a project and open the **SQL Editor**.
2. Paste all of `db/schema.sql` and **Run**. (Tables only — no demo data.)
3. Copy the **connection string** from the dashboard.

### 2) Code — GitHub
Create a repo, then **Add file ▸ Upload files** and drag the **contents** of this
folder in (keep the subfolders), and commit.

### 3) Host — Vercel
1. **Add New ▸ Project**, import the repo (auto-detects Vite).
2. Add Environment Variables:
   - `DATABASE_URL` — your Neon string
   - `JWT_SECRET` — a long random string
   - `DEMO_PASSWORD` — the *temporary* password new students get when you create
     them without setting one (rename/remove later if you prefer)
3. **Deploy**.

### 4) First run
Open your live URL. Because the database is empty, you'll get the **Create
administrator** screen. Enter your client's name, email, and a password — that
becomes the tutor account, and the setup screen disappears for good. Log in and
start adding students and groups.

> Shortcut: on Vercel, **Storage ▸ Connect Database ▸ Neon** provisions Neon and
> sets `DATABASE_URL` automatically (still run `schema.sql` once).

## File uploads
Materials and submissions store a link. To host actual files, add **Vercel Blob**
(Storage ▸ Create ▸ Blob) and upload to it from the file fields — the API already
stores the returned URL.

## Real-time chat
Vercel serverless can't hold WebSockets, so chat uses REST + 4s polling (works
everywhere). For instant push later, add Ably/Pusher; the message storage is unchanged.

## Security notes
JWT auth; `authenticate` (401) + `authorize('tutor')` (403). Passwords are
bcrypt-hashed. Set a strong `JWT_SECRET`. Before scale: add input validation,
rate limiting, refresh tokens, and tests.
