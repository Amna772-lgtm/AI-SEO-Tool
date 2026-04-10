"""Permanently delete a user and all associated data by email.

Usage:
    python -m scripts.delete_user <email>
    python -m scripts.delete_user --yes <email>   # skip confirmation prompt
"""
from __future__ import annotations

import sys

from app.store.history_store import delete_user_cascade, get_user_by_email


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print("Usage: python -m scripts.delete_user [--yes] <email>")
        sys.exit(1)

    skip_confirm = False
    if args[0] == "--yes":
        skip_confirm = True
        args = args[1:]

    if not args:
        print("Error: email is required")
        sys.exit(1)

    email = args[0].lower()
    user = get_user_by_email(email)
    if not user:
        print(f"Error: no user found with email {email}")
        sys.exit(1)

    print("About to permanently delete:")
    print(f"  id:       {user['id']}")
    print(f"  email:    {user['email']}")
    print(f"  name:     {user.get('name')}")
    print(f"  is_admin: {bool(user.get('is_admin'))}")
    print(
        "This will also delete all analyses, schedules, subscriptions, "
        "and competitor data owned by this user."
    )

    if not skip_confirm:
        answer = input("Type 'DELETE' to confirm: ").strip()
        if answer != "DELETE":
            print("Aborted.")
            sys.exit(1)

    delete_user_cascade(user["id"])
    print(f"Deleted user {email} ({user['id']}).")


if __name__ == "__main__":
    main()
