import os
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
import psycopg2.pool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Point it at your Neon Postgres connection string "
        "(see backend/.env.example)."
    )

# A pooled connection is reused across requests instead of opening a fresh
# TCP+TLS handshake to Neon on every single query -- that handshake alone
# was taking several seconds, so a request touching multiple tables (e.g.
# register) was compounding it into double-digit-second responses.
_pool = psycopg2.pool.ThreadedConnectionPool(
    1, 10, DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor
)


@contextmanager
def get_conn():
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def init_db():
    """Create tables. Migrates a pre-auth single-user expenses table
    (no user_id column) out of the way so its data can be claimed by
    the first registered account."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                full_name TEXT,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        # Drops the email column left over from earlier deployments -- the
        # account model no longer collects or stores email addresses.
        cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS email")

        cur.execute("""
            SELECT column_name AS name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'expenses'
        """)
        existing_cols = [r["name"] for r in cur.fetchall()]
        if existing_cols and "user_id" not in existing_cols:
            cur.execute("ALTER TABLE expenses RENAME TO expenses_legacy")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expense_date TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                payment_method TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)


# ---------- users ----------

def count_users():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS c FROM users")
        return cur.fetchone()["c"]


def get_user_by_username(username):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        row = cur.fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
    return dict(row) if row else None


def create_user(username, full_name, password_hash):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO users (username, full_name, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (username, full_name, password_hash))
        return cur.fetchone()["id"]


def update_password(user_id, password_hash):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (password_hash, user_id),
        )


def delete_user(user_id):
    # Expenses cascade via the users(id) ON DELETE CASCADE foreign key.
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))


def has_legacy_expenses():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'expenses_legacy'
        """)
        row = cur.fetchone()
    return row is not None


def claim_legacy_expenses(user_id):
    """Assign pre-auth demo/seed expenses to the first account that registers."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'expenses_legacy'
        """)
        if not cur.fetchone():
            return 0
        cur.execute("""
            SELECT expense_date, amount, category, description, payment_method
            FROM expenses_legacy
        """)
        rows = cur.fetchall()
        cur.executemany("""
            INSERT INTO expenses (user_id, expense_date, amount, category, description, payment_method)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, [
            (user_id, r["expense_date"], r["amount"], r["category"], r["description"], r["payment_method"])
            for r in rows
        ])
        cur.execute("DROP TABLE expenses_legacy")
        return len(rows)


# ---------- expenses (always scoped to a user) ----------

def add_expense(user_id, expense_date, amount, category, description, payment_method):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO expenses
            (user_id, expense_date, amount, category, description, payment_method)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_id, str(expense_date), float(amount), category, description, payment_method))


def get_expenses(user_id):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, expense_date, amount, category, description, payment_method
            FROM expenses
            WHERE user_id = %s
            ORDER BY expense_date DESC, id DESC
        """, (user_id,))
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def delete_expense(user_id, expense_id):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM expenses WHERE id = %s AND user_id = %s", (expense_id, user_id)
        )


def update_expense(user_id, expense_id, expense_date, amount, category, description, payment_method):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE expenses
            SET expense_date=%s, amount=%s, category=%s, description=%s, payment_method=%s
            WHERE id=%s AND user_id=%s
        """, (str(expense_date), float(amount), category, description, payment_method, expense_id, user_id))
