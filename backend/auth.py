import re
import datetime

import bcrypt
import jwt

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")

# Requires a real-looking domain: at least one label, then a mandatory
# alphabetic TLD (2+ letters). Rejects things the old loose pattern let
# through, e.g. "a@b" (no TLD), "a@.com" (empty label), "a@b..com"
# (empty label), "a@localhost" (no TLD), "a@b.c1" (non-alphabetic TLD).
EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*"
    r"\.[a-zA-Z]{2,}$"
)


def is_valid_email(email: str) -> bool:
    if not email or len(email) > 254:
        return False
    local_part = email.split("@", 1)[0]
    if not local_part or len(local_part) > 64:
        return False
    return bool(EMAIL_RE.match(email))

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def validate_registration(username, email, password, confirm_password):
    """Returns a list of error messages; empty list means input is valid."""
    errors = []
    if not USERNAME_RE.match(username or ""):
        errors.append("Username must be 3-20 characters: letters, numbers, underscore only.")
    if not is_valid_email(email or ""):
        errors.append("Please enter a valid email address.")
    if not password or len(password) < 8:
        errors.append("Password must be at least 8 characters.")
    if password != confirm_password:
        errors.append("Passwords do not match.")
    return errors


def create_access_token(user_id: int, secret_key: str) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str, secret_key: str):
    try:
        payload = jwt.decode(token, secret_key, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except jwt.PyJWTError:
        return None
