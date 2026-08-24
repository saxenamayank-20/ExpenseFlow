# 💰 ExpenseFlow — My Expense Tracker

A multi-user personal expense tracker with a FastAPI backend and a React + Tailwind CSS frontend.

## Features

- **Accounts**: register, log in, log out — passwords stored as bcrypt hashes, sessions via JWT
- **Per-user data isolation**: every account only ever sees and edits its own expenses
- **Dashboard**: add expenses, spending-by-category / daily / monthly trend charts, date-range filter, editable history table, CSV export
- **History & Manage**: its own category filter, independent of the Overview tab, plus click-a-row edit/delete for fixing mistaken entries
- **My Account**: profile details, activity stats, change password
- A glamorous, gradient-driven UI built with React, React Router, Tailwind CSS, and Recharts

## Architecture

```
backend/     FastAPI REST API (Python) — auth, expenses, account stats
frontend/    React + Vite + Tailwind CSS single-page app
expenses.db  Shared SQLite database (users + expenses tables) — not committed to git
```

The frontend talks to the backend over HTTP; the backend serves JSON only (no HTML).

## Run locally

You need two terminals — one for the backend, one for the frontend.

**1. Backend (FastAPI)**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**2. Frontend (React + Vite)**

```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**, register an account, and log in.

## Data

`expenses.db` is created automatically in the project root the first time the backend starts, with `users` and `expenses` tables (`expenses.user_id` scopes every row to its owner).

If you're upgrading from the original single-user Streamlit version of this app, its old `expenses` table is automatically renamed to `expenses_legacy` on first run. **The very first account you register claims all of that legacy data**, and `expenses_legacy` is then dropped.

## Deployment

**Vercel** for the frontend, **Render** for the backend. No Docker needed — both run the code directly.

### Backend → Render

1. New **Web Service** on Render, pointing at this GitHub repo, with **root directory** set to `backend`.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   - `SECRET_KEY` — any long random string (e.g. generate one with `openssl rand -hex 32`). This signs login sessions.
   - `ALLOWED_ORIGINS` — leave blank for now, come back and set it once the frontend is deployed (see below).
5. Deploy, then note the backend's URL (e.g. `https://your-app.onrender.com`).

Render's free tier has an **ephemeral disk** — `expenses.db` can be wiped on redeploy or after the service spins down from inactivity. That's fine to start with; if you need the data to persist long-term, upgrade to a paid instance with a persistent disk later.

### Frontend → Vercel

1. Import the GitHub repo into Vercel, with the project's **root directory** set to `frontend` (it auto-detects the Vite setup).
2. Add an environment variable: `VITE_API_URL` = your Render backend URL from above.
3. Deploy, then note the frontend's URL (e.g. `https://your-app.vercel.app`).

### Last step

Go back to Render and set `ALLOWED_ORIGINS` to your Vercel URL, so the backend accepts requests from it (local dev origins are always allowed by default, so this only needs the production URL).

## Notes

- Without `SECRET_KEY` set, the backend generates a random JWT signing secret on first run and stores it in `backend/.secret_key` (gitignored) — set `SECRET_KEY` explicitly in production so logins survive redeploys.
- `expenses.db` is gitignored — never commit real expense data to the repo.
