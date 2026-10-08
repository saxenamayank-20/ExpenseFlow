import re
import secrets
import datetime

import bcrypt
import jwt

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# no 0/O or 1/I so it's easy to copy by hand
RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def make_recovery_code() -> str:
    # 12 chars = 60 bits, shown to the user once, only the hash is stored
    chars = "".join(secrets.choice(RECOVERY_ALPHABET) for _ in range(12))
    return f"{chars[:4]}-{chars[4:8]}-{chars[8:]}"


def normalize_recovery_code(code: str) -> str:
    # people type it in lowercase or without the dashes
    return re.sub(r"[^A-Z0-9]", "", (code or "").upper())


def hash_recovery_code(code: str) -> str:
    return hash_password(normalize_recovery_code(code))


def verify_recovery_code(code: str, code_hash: str) -> bool:
    return bool(code_hash) and verify_password(normalize_recovery_code(code), code_hash)


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
