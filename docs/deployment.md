# Deployment

Vercel for the frontend, Render for the backend, Neon for the database. No Docker, both parts run the code directly.

## Database (Neon)

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the connection string from Connection Details. It looks like `postgresql://user:password@ep-xxxx.aws.neon.tech/dbname?sslmode=require`. This is your `DATABASE_URL`.

The data lives on Neon, not on Render's disk, so it survives Render redeploys and spin-downs.

## Backend (Render)

1. New **Web Service** pointing at this repo, with root directory `backend`.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Environment variables:
   - `DATABASE_URL`: the Neon connection string
   - `SECRET_KEY`: any long random string (`openssl rand -hex 32`), signs the login tokens
   - `ALLOWED_ORIGINS`: leave blank for now, set it after the frontend is deployed
5. Deploy and note the backend URL.

Tables (and column changes) are applied when the backend starts, so a redeploy is all a schema change needs.

## Frontend (Vercel)

1. Import the repo into Vercel with root directory `frontend` (it picks up Vite on its own).
2. Set `VITE_API_URL` to the Render backend URL.
3. Deploy and note the frontend URL.

## Last step

Back on Render, set `ALLOWED_ORIGINS` to the Vercel URL so the backend accepts requests from it. Local dev origins (`localhost:5173`) are always allowed.

## Notes

- Without `SECRET_KEY`, the backend makes a random one and saves it in `backend/.secret_key` (gitignored). Set it on Render or everyone gets logged out on each redeploy.
- Upgrading from the old single-user Streamlit version: its `expenses` table gets renamed to `expenses_legacy` on first run, the first account to register claims all of it, and then the legacy table is dropped.
