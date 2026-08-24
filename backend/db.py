import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("DB_PATH") or (Path(__file__).resolve().parent.parent / "expenses.db"))


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables. Migrates a pre-auth single-user expenses table
    (no user_id column) out of the way so its data can be claimed by
    the first registered account."""
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                full_name TEXT,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        existing_cols = [
            r["name"] for r in conn.execute("PRAGMA table_info(expenses)").fetchall()
        ]
        if existing_cols and "user_id" not in existing_cols:
            conn.execute("ALTER TABLE expenses RENAME TO expenses_legacy")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                expense_date TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                payment_method TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        conn.commit()


# ---------- users ----------

def count_users():
    with get_conn() as conn:
        return conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]


def get_user_by_username(username):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
    return dict(row) if row else None


def get_user_by_email(email):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def create_user(username, email, full_name, password_hash):
    with get_conn() as conn:
        cur = conn.execute("""
            INSERT INTO users (username, email, full_name, password_hash)
            VALUES (?, ?, ?, ?)
        """, (username, email, full_name, password_hash))
        conn.commit()
        return cur.lastrowid


def update_password(user_id, password_hash):
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (password_hash, user_id),
        )
        conn.commit()


def has_legacy_expenses():
    with get_conn() as conn:
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='expenses_legacy'"
        ).fetchone()
    return row is not None


def claim_legacy_expenses(user_id):
    """Assign pre-auth demo/seed expenses to the first account that registers."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='expenses_legacy'"
        ).fetchone()
        if not row:
            return 0
        rows = conn.execute(
            "SELECT expense_date, amount, category, description, payment_method FROM expenses_legacy"
        ).fetchall()
        conn.executemany("""
            INSERT INTO expenses (user_id, expense_date, amount, category, description, payment_method)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [
            (user_id, r["expense_date"], r["amount"], r["category"], r["description"], r["payment_method"])
            for r in rows
        ])
        conn.execute("DROP TABLE expenses_legacy")
        conn.commit()
        return len(rows)


# ---------- expenses (always scoped to a user) ----------

def add_expense(user_id, expense_date, amount, category, description, payment_method):
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO expenses
            (user_id, expense_date, amount, category, description, payment_method)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, str(expense_date), float(amount), category, description, payment_method))
        conn.commit()


def get_expenses(user_id):
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT id, expense_date, amount, category, description, payment_method
            FROM expenses
            WHERE user_id = ?
            ORDER BY expense_date DESC, id DESC
        """, (user_id,)).fetchall()
    return [dict(r) for r in rows]


def delete_expense(user_id, expense_id):
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM expenses WHERE id = ? AND user_id = ?", (expense_id, user_id)
        )
        conn.commit()


def update_expense(user_id, expense_id, expense_date, amount, category, description, payment_method):
    with get_conn() as conn:
        conn.execute("""
            UPDATE expenses
            SET expense_date=?, amount=?, category=?, description=?, payment_method=?
            WHERE id=? AND user_id=?
        """, (str(expense_date), float(amount), category, description, payment_method, expense_id, user_id))
        conn.commit()
