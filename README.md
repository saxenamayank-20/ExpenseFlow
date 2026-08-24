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

Recommended combo: **Vercel** for the frontend (free, trivial for a Vite app) + **Fly.io** for the backend (free tier, and it supports a small *persistent volume* so the SQLite file survives redeploys — most other free hosts wipe the filesystem on every deploy).

### Backend → Fly.io

```bash
cd backend
fly launch          # detects the Dockerfile; say no to a Postgres/Redis add-on
fly volumes create expense_data --size 1 --region <your-region>
fly secrets set SECRET_KEY=$(openssl rand -hex 32)
fly deploy
```

- `fly.toml` already points `DB_PATH` at `/data/expenses.db`, the mounted volume — don't skip creating the volume, or your data will disappear on the next deploy.
- `SECRET_KEY` signs login sessions; setting it explicitly (instead of relying on the auto-generated file) keeps existing logins valid across redeploys.
- Note your backend's URL (e.g. `https://your-expense-tracker-api.fly.dev`) — you'll need it next.

### Frontend → Vercel

1. Import the GitHub repo into Vercel (it auto-detects the Vite project in `frontend/` — set the project's **root directory** to `frontend`).
2. Add an environment variable: `VITE_API_URL` = your Fly.io backend URL from above.
3. Deploy.

### After both are live

Update `ALLOWED_ORIGINS` for the backend so it accepts requests from your deployed frontend:

```bash
cd backend
fly secrets set ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

(Local dev origins are always allowed by default, so this only needs the production URL.)

## Notes

- Without `SECRET_KEY` set, the backend generates a random JWT signing secret on first run and stores it in `backend/.secret_key` (gitignored, and wiped on every Fly.io redeploy unless you set `SECRET_KEY` as shown above).
- `expenses.db` is gitignored — never commit real expense data to the repo.
