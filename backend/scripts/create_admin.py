"""Create or promote a user to admin.

Usage:
    python -m scripts.create_admin <email> <password>    # create new admin
    python -m scripts.create_admin --promote <email>     # promote existing user
"""
from __future__ import annotations

import sys
import uuid

import bcrypt

from app.store.history_store import (
    _connect,
    _lock,
    create_user,
    get_user_by_email,
)


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python -m scripts.create_admin <email> <password>")
        print("       python -m scripts.create_admin --promote <email>")
        sys.exit(1)

    if sys.argv[1] == "--promote":
        email = sys.argv[2].lower()
        user = get_user_by_email(email)
        if not user:
            print(f"Error: No user found with email {email}")
            sys.exit(1)
        with _lock:
            conn = _connect()
            try:
                conn.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (email,))
                conn.commit()
            finally:
                conn.close()
        print(f"Promoted {email} to admin.")
    else:
        email = sys.argv[1].lower()
        password = sys.argv[2]
        if get_user_by_email(email):
            print(f"Error: User {email} already exists. Use --promote instead.")
            sys.exit(1)
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user_id = str(uuid.uuid4())
        create_user(user_id, email, "Admin", password_hash)
        with _lock:
            conn = _connect()
            try:
                conn.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (user_id,))
                conn.commit()
            finally:
                conn.close()
        print(f"Created admin user: {email} (id: {user_id})")


if __name__ == "__main__":
    main()
