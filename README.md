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
```

The frontend talks to the backend over HTTP; the backend serves JSON only (no HTML). Data lives in a **Postgres database on Neon** (see below) — not in a local file.

## Run locally

You need two terminals — one for the backend, one for the frontend. You also need a Postgres database (a free [Neon](https://neon.tech) project works well, including for local dev — just create a project and use its connection string).

**1. Backend (FastAPI)**

```bash
cd backend
cp .env.example .env   # then fill in DATABASE_URL with your Neon connection string
python3 -m venv .venv && source .venv/bin/activate
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

Tables (`users` and `expenses`) are created automatically in Postgres the first time the backend starts (`expenses.user_id` scopes every row to its owner).

If you're upgrading from the original single-user Streamlit version of this app, its old `expenses` table is automatically renamed to `expenses_legacy` on first run. **The very first account you register claims all of that legacy data**, and `expenses_legacy` is then dropped.

## Deployment

**Vercel** for the frontend, **Render** for the backend, **Neon** for the database. No Docker needed — both the frontend and backend run the code directly.

### Database → Neon

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the connection string from the dashboard (Connection Details) — it looks like `postgresql://user:password@ep-xxxx.aws.neon.tech/dbname?sslmode=require`. You'll use this as `DATABASE_URL` below.

Because the database lives on Neon instead of on Render's disk, it survives Render redeploys and spin-downs — this is what actually persists user accounts and expenses long-term.

### Backend → Render

1. New **Web Service** on Render, pointing at this GitHub repo, with **root directory** set to `backend`.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   - `DATABASE_URL` — the Neon connection string from above.
   - `SECRET_KEY` — any long random string (e.g. generate one with `openssl rand -hex 32`). This signs login sessions.
   - `ALLOWED_ORIGINS` — leave blank for now, come back and set it once the frontend is deployed (see below).
5. Deploy, then note the backend's URL (e.g. `https://your-app.onrender.com`).

Render's free tier still spins the service down after periods of inactivity, so the first request after idling takes a few extra seconds to wake it back up — but since the database is on Neon, no data is lost when that happens.

### Frontend → Vercel

1. Import the GitHub repo into Vercel, with the project's **root directory** set to `frontend` (it auto-detects the Vite setup).
2. Add an environment variable: `VITE_API_URL` = your Render backend URL from above.
3. Deploy, then note the frontend's URL (e.g. `https://your-app.vercel.app`).

### Last step

Go back to Render and set `ALLOWED_ORIGINS` to your Vercel URL, so the backend accepts requests from it (local dev origins are always allowed by default, so this only needs the production URL).

## Notes

- Without `SECRET_KEY` set, the backend generates a random JWT signing secret on first run and stores it in `backend/.secret_key` (gitignored) — set `SECRET_KEY` explicitly in production so logins survive redeploys.
- `backend/.env` is gitignored — never commit real database credentials to the repo.
