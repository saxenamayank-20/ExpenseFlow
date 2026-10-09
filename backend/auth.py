import re
import datetime

import bcrypt
import jwt

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    # 10 rounds instead of the default 12, render's free cpu took ~2.5s per hash.
    # old hashes keep their own cost so they still verify
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def validate_registration(username, password, confirm_password):
    """Returns a list of error messages; empty list means input is valid."""
    errors = []
    if not USERNAME_RE.match(username or ""):
        errors.append("Username must be 3-20 characters: letters, numbers, underscore only.")
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
