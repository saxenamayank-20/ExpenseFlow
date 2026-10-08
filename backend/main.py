import os
import secrets
from datetime import date, timedelta
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

import db
import auth

CATEGORIES = [
    "Medical", "Food", "Shopping", "Education", "Transport",
    "Bills", "Entertainment", "Personal", "Other",
]
PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Other"]

SECRET_KEY_PATH = Path(__file__).resolve().parent / ".secret_key"


def get_secret_key():
    env_key = os.environ.get("SECRET_KEY")
    if env_key:
        return env_key
    if SECRET_KEY_PATH.exists():
        return SECRET_KEY_PATH.read_text().strip()
    key = secrets.token_hex(32)
    SECRET_KEY_PATH.write_text(key)
    return key


SECRET_KEY = get_secret_key()

app = FastAPI(title="Expense Tracker API")

DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
extra_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ORIGINS + extra_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init_db()

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = auth.decode_access_token(credentials.credentials, SECRET_KEY)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")
    user = db.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user


def user_public(user, token=None):
    data = {
        "id": user["id"],
        "username": user["username"],
        "full_name": user["full_name"],
        "created_at": user["created_at"],
        "has_recovery_code": bool(user.get("recovery_hash")),
    }
    if token:
        data["token"] = token
    return data


class RegisterRequest(BaseModel):
    full_name: str = ""
    username: str
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    username: str
    recovery_code: str
    new_password: str
    confirm_password: str


class ExpenseIn(BaseModel):
    expense_date: str
    amount: float
    category: str
    description: str
    payment_method: str


class SalaryIn(BaseModel):
    label: str
    amount: float
    received_date: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class DeleteAccountRequest(BaseModel):
    current_password: str


class RecoveryCodeRequest(BaseModel):
    current_password: str


@app.get("/api/meta")
def meta():
    return {"categories": CATEGORIES, "payment_methods": PAYMENT_METHODS}


@app.post("/api/auth/register")
def register(payload: RegisterRequest):
    username = payload.username.strip()
    full_name = payload.full_name.strip()

    errors = auth.validate_registration(username, payload.password, payload.confirm_password)
    if not errors:
        if db.get_user_by_username(username):
            errors.append("That username is already taken.")
    if errors:
        raise HTTPException(status_code=400, detail=errors[0])

    is_first_user = db.count_users() == 0
    password_hash = auth.hash_password(payload.password)
    recovery_code = auth.make_recovery_code()
    user_id = db.create_user(username, full_name, password_hash, auth.hash_recovery_code(recovery_code))

    claimed = 0
    if is_first_user and db.has_legacy_expenses():
        claimed = db.claim_legacy_expenses(user_id)

    user = db.get_user_by_id(user_id)
    token = auth.create_access_token(user_id, SECRET_KEY)
    result = user_public(user, token)
    result["claimed_legacy_expenses"] = claimed
    # only time the plain code leaves the server
    result["recovery_code"] = recovery_code
    return result


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    user = db.get_user_by_username(payload.username.strip())
    if not user or not auth.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    token = auth.create_access_token(user["id"], SECRET_KEY)
    return user_public(user, token)


@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    user = db.get_user_by_username(payload.username.strip())
    # same message either way, so this can't be used to check which usernames exist
    if not user or not auth.verify_recovery_code(payload.recovery_code, user["recovery_hash"]):
        raise HTTPException(status_code=400, detail="Username or recovery code is wrong.")
    db.update_password(user["id"], auth.hash_password(payload.new_password))
    # codes are single use, hand back a fresh one
    new_code = auth.make_recovery_code()
    db.update_recovery_hash(user["id"], auth.hash_recovery_code(new_code))
    return {"success": True, "recovery_code": new_code}


@app.get("/api/auth/me")
def me(current_user=Depends(get_current_user)):
    return user_public(current_user)


@app.put("/api/auth/password")
def change_password(payload: PasswordChangeRequest, current_user=Depends(get_current_user)):
    fresh = db.get_user_by_id(current_user["id"])
    if not auth.verify_password(payload.current_password, fresh["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match.")
    db.update_password(current_user["id"], auth.hash_password(payload.new_password))
    return {"success": True}


@app.post("/api/auth/recovery-code")
def new_recovery_code(payload: RecoveryCodeRequest, current_user=Depends(get_current_user)):
    # makes a new code (old one stops working), needs the password so a stolen session can't do it
    if not auth.verify_password(payload.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    code = auth.make_recovery_code()
    db.update_recovery_hash(current_user["id"], auth.hash_recovery_code(code))
    return {"recovery_code": code}


@app.get("/api/expenses")
def list_expenses(current_user=Depends(get_current_user)):
    return db.get_expenses(current_user["id"])


@app.post("/api/expenses")
def create_expense(payload: ExpenseIn, current_user=Depends(get_current_user)):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")
    if not payload.description.strip():
        raise HTTPException(status_code=400, detail="Description is required.")
    db.add_expense(
        current_user["id"], payload.expense_date, payload.amount,
        payload.category, payload.description.strip(), payload.payment_method,
    )
    return {"success": True}


@app.put("/api/expenses/{expense_id}")
def edit_expense(expense_id: int, payload: ExpenseIn, current_user=Depends(get_current_user)):
    if payload.amount <= 0 or not payload.description.strip():
        raise HTTPException(status_code=400, detail="Amount and description are required.")
    db.update_expense(
        current_user["id"], expense_id, payload.expense_date, payload.amount,
        payload.category, payload.description.strip(), payload.payment_method,
    )
    return {"success": True}


@app.delete("/api/expenses/{expense_id}")
def remove_expense(expense_id: int, current_user=Depends(get_current_user)):
    db.delete_expense(current_user["id"], expense_id)
    return {"success": True}


def check_salary(user_id, payload: SalaryIn, salary_id=None):
    if not payload.label.strip():
        raise HTTPException(status_code=400, detail="Please give the salary a name.")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")
    # periods are matched by comparing date strings, so the format has to be exact
    try:
        ok = date.fromisoformat(payload.received_date).isoformat() == payload.received_date
    except ValueError:
        ok = False
    if not ok:
        raise HTTPException(status_code=400, detail="Date must look like YYYY-MM-DD.")
    if db.salary_on_date(user_id, payload.received_date, salary_id):
        raise HTTPException(status_code=400, detail="You already have a salary on that date.")


def own_salary(user_id, salary_id):
    salary = db.get_salary(user_id, salary_id)
    if not salary:
        raise HTTPException(status_code=404, detail="Salary not found.")
    return salary


@app.get("/api/salaries")
def list_salaries(current_user=Depends(get_current_user)):
    salaries = db.get_salaries(current_user["id"])
    for s in salaries:
        # last day of the period, None means it's still running
        next_date = s.pop("next_date")
        s["end_date"] = (
            (date.fromisoformat(next_date) - timedelta(days=1)).isoformat() if next_date else None
        )
        s["available"] = s["amount"] + s["carried_over"]
        s["left"] = s["available"] - s["spent"]
    return salaries


@app.post("/api/salaries")
def create_salary(payload: SalaryIn, current_user=Depends(get_current_user)):
    check_salary(current_user["id"], payload)
    salary_id = db.add_salary(
        current_user["id"], payload.label.strip(), payload.amount, payload.received_date
    )
    return {"success": True, "id": salary_id}


@app.put("/api/salaries/{salary_id}")
def edit_salary(salary_id: int, payload: SalaryIn, current_user=Depends(get_current_user)):
    own_salary(current_user["id"], salary_id)
    check_salary(current_user["id"], payload, salary_id)
    db.update_salary(
        current_user["id"], salary_id, payload.label.strip(), payload.amount, payload.received_date
    )
    return {"success": True}


@app.delete("/api/salaries/{salary_id}")
def remove_salary(salary_id: int, current_user=Depends(get_current_user)):
    own_salary(current_user["id"], salary_id)
    db.delete_salary(current_user["id"], salary_id)
    return {"success": True}


@app.get("/api/account/stats")
def account_stats(current_user=Depends(get_current_user)):
    expenses = db.get_expenses(current_user["id"])
    total_spent = sum(e["amount"] for e in expenses)
    categories_used = len({e["category"] for e in expenses})
    return {
        "total_count": len(expenses),
        "total_spent": total_spent,
        "categories_used": categories_used,
    }


@app.delete("/api/account")
def delete_account(payload: DeleteAccountRequest, current_user=Depends(get_current_user)):
    fresh = db.get_user_by_id(current_user["id"])
    if not auth.verify_password(payload.current_password, fresh["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    db.delete_user(current_user["id"])
    return {"success": True}
