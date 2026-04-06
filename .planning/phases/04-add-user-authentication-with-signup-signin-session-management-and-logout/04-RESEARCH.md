# Phase 4: Add User Authentication — Research

**Researched:** 2026-04-06
**Domain:** FastAPI JWT authentication, Next.js 16 proxy.ts route protection, SQLite schema migration, per-user data isolation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Multi-user accounts with open registration — anyone with the URL can create an account (no invite or admin approval required)
- **D-02:** Per-user data isolation — each user sees only their own history, analyses, and schedules; existing SQLite tables (history, schedules) need `user_id` foreign keys added
- **D-03:** Signup fields: Email + Name + Password (all three required). Passwords stored as bcrypt hashes in a `users` table in SQLite
- **D-04:** Password reset is out of scope for this phase
- **D-05:** JWT stored in an HTTP-only cookie (stateless auth, no Redis or DB lookup per request)
- **D-06:** Session expiry: 24 hours. JWT `exp` claim set to 24h from issue time
- **D-07:** Logout clears the HTTP-only cookie server-side (set cookie to empty with `max_age=0`)
- **D-08:** All API endpoints require authentication — every route returns 401 if no valid JWT cookie present. No public endpoints except `/login`, `/signup`, and `/health`
- **D-09:** Full app gated — unauthenticated frontend visitors are redirected to `/login` with no app content visible
- **D-10:** Auth enforcement via Next.js `middleware.ts` — server-side redirect before rendering. Unauthenticated requests to any route except `/login` and `/signup` redirect to `/login`
- **D-11:** Current user info (name, email) available via React context — `AuthContext` wraps the app in `layout.tsx`; components call `useAuth()` hook
- **D-12:** Session expiry mid-use: show a login modal overlay over the current page (user re-authenticates inline without losing their place). Triggered when any API call returns 401
- **D-13:** Auth routes: `/login` (sign in) and `/signup` (registration)
- **D-14:** Logout button placed in the sidebar, bottom-left corner, showing the logged-in user's name alongside it

### Claude's Discretion

- JWT library choice (e.g., `python-jose`, `PyJWT`) — pick the most actively maintained option
- Pydantic models for auth request/response schemas
- Exact SQLite schema for `users` table (id, email, name, password_hash, created_at minimum)
- Frontend login modal component design (keep consistent with existing TailwindCSS style)
- CORS cookie settings (`samesite`, `secure` flags) — use `samesite=lax`, `secure=False` for local dev

### Deferred Ideas (OUT OF SCOPE)

- Password reset / "forgot password" flow — out of scope for this phase
- Email verification on signup — not mentioned, assumed deferred
- OAuth / social login (Google, GitHub) — out of scope per PROJECT.md
</user_constraints>

---

## Summary

Phase 4 adds full multi-user authentication to an existing FastAPI + Next.js 16 application. The backend issues HTTP-only JWT cookies on login, validates them via FastAPI dependency injection on every protected route, and stores users/credentials in the existing SQLite database. The frontend uses `proxy.ts` (Next.js 16's replacement for `middleware.ts`) to gate all routes server-side before rendering, an `AuthContext` for client-state, and a session-expired modal to handle mid-session 401s inline.

The most important research finding is that **the project runs Next.js 16.1.6**, and in Next.js 16 `middleware.ts` is deprecated in favor of `proxy.ts`. The file still works (with a deprecation warning), but the forward-compatible approach is `proxy.ts` with a `proxy` export. CONTEXT.md D-10 specifies `middleware.ts` by name — the planner must decide whether to use the deprecated `middleware.ts` (matching the decision verbatim) or the current `proxy.ts` (matching the intent). Research recommends `proxy.ts` since the project already runs Next.js 16.1.6.

The second critical finding is **library selection**: `python-jose` is effectively abandoned (last release 2021, known security issues), `passlib` is no longer maintained. Use `PyJWT>=2.12.1` for JWT and `bcrypt>=5.0.0` (standalone, no passlib wrapper) for password hashing.

**Primary recommendation:** Implement auth in three layers — (1) FastAPI `/auth` router with bcrypt + PyJWT, (2) `get_current_user` Depends() on all existing routes, (3) Next.js `proxy.ts` + `AuthContext` + `SessionExpiredModal` on the frontend. Migrate SQLite schema with `ALTER TABLE ... ADD COLUMN user_id TEXT REFERENCES users(id)` on first startup (nullable default for existing rows).

---

## Standard Stack

### Core (Backend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PyJWT | `>=2.12.1` | JWT encode/decode (HS256) | Actively maintained (2026), used in FastAPI official docs update; replaces abandoned `python-jose` |
| bcrypt | `>=5.0.0` | Password hashing | Direct bcrypt bindings — no passlib wrapper needed; passlib is unmaintained |
| FastAPI | `>=0.100.0` (already in requirements.txt) | `Depends()` for `get_current_user` | Already in project |
| Pydantic v2 | `>=2.0` (already in requirements.txt) | Auth request/response schemas | Already in project |

### Core (Frontend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jose | `6.2.2` | JWT verification in `proxy.ts` (Node.js runtime) | Works in both Edge and Node.js runtimes; Web Crypto API based |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `PyJWT` | `python-jose` | python-jose abandoned since 2021, CVEs open; PyJWT actively maintained |
| `bcrypt` (standalone) | `passlib[bcrypt]` | passlib unmaintained since ~2023; direct bcrypt bindings are simpler and current |
| `proxy.ts` | `middleware.ts` | `middleware.ts` still works in Next.js 16 but is deprecated; `proxy.ts` is forward-compatible |
| `jose` (frontend) | `jsonwebtoken` | `jose` works in both Edge and Node.js runtimes; `jsonwebtoken` requires Node.js |

**Installation (backend — add to requirements.txt):**
```bash
PyJWT>=2.12.1
bcrypt>=5.0.0
```

**Installation (frontend — none required):**
`jose` is likely already transitively present in `node_modules` (used by Next.js auth internals). Verify with:
```bash
cd frontend && npm list jose
```
If not present: `npm install jose`

**Version verification (confirmed 2026-04-06):**
- `PyJWT`: 2.12.1 (latest on PyPI)
- `bcrypt`: 5.0.0 (latest on PyPI)
- `jose` (npm): 6.2.2 (latest on npm)

---

## Architecture Patterns

### Recommended Project Structure (new files)

```
backend/app/
├── api/
│   └── routes/
│       ├── auth.py              # NEW: /auth/signup, /auth/signin, /auth/logout
│       └── ...existing routes
├── schemas/
│   └── auth.py                  # NEW: SignupRequest, SigninRequest, TokenResponse, UserOut
├── store/
│   └── history_store.py         # MODIFIED: add users table, user_id columns, user-scoped queries
└── dependencies/
    └── auth.py                  # NEW: get_current_user() Depends() function

frontend/app/
├── proxy.ts                     # NEW: route protection (replaces deprecated middleware.ts)
├── lib/
│   ├── api.ts                   # MODIFIED: add credentials:"include", 401 handler
│   └── auth.tsx                 # NEW: AuthContext, AuthProvider, useAuth() hook
├── components/
│   └── auth/
│       └── SessionExpiredModal.tsx  # NEW: re-auth overlay on 401
├── login/
│   └── page.tsx                 # NEW: /login standalone page
└── signup/
    └── page.tsx                 # NEW: /signup standalone page
```

### Pattern 1: FastAPI HTTP-Only Cookie JWT (Backend)

**What:** Routes read a JWT from a named cookie, verify it with PyJWT, and return the user object as a Pydantic model.
**When to use:** All protected route handlers via `Depends(get_current_user)`.

```python
# Source: FastAPI docs + PyJWT 2.x API
# backend/app/dependencies/auth.py
from __future__ import annotations
import os
import jwt
from fastapi import Cookie, HTTPException, status
from app.store.history_store import get_user_by_id

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"

def get_current_user(access_token: str | None = Cookie(default=None)):
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```

### Pattern 2: Setting the JWT Cookie on Login

**What:** After credential verification, set an HTTP-only cookie via FastAPI `Response`.

```python
# Source: FastAPI docs — Response parameter injection
# backend/app/api/routes/auth.py (signin endpoint)
from datetime import datetime, timedelta, timezone
import jwt
import bcrypt
from fastapi import APIRouter, HTTPException, Response

def _create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/signin")
def signin(body: SigninRequest, response: Response):
    user = get_user_by_email(body.email)
    if not user or not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = _create_access_token(user["id"])
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=86400,           # 24 hours in seconds
        samesite="lax",
        secure=False,            # False for local dev (D-46 per CONTEXT.md)
    )
    return {"id": user["id"], "email": user["email"], "name": user["name"]}
```

### Pattern 3: bcrypt Password Hashing (No passlib)

**What:** Use `bcrypt` package directly — no passlib wrapper needed.

```python
# Source: bcrypt 5.x PyPI docs
import bcrypt

# Hash on signup
password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# Verify on signin
is_valid = bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
```

### Pattern 4: Next.js 16 proxy.ts Route Protection

**What:** In Next.js 16, `middleware.ts` is deprecated. Use `proxy.ts` with `export default function proxy(...)`.
**When to use:** Server-side route guard before any page renders. The proxy runs on Node.js runtime.

```typescript
// Source: Next.js 16 official blog + proxy.ts docs
// frontend/app/proxy.ts  (NOT middleware.ts — middleware.ts is deprecated in Next.js 16)
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Note on JWT verification in proxy.ts:** Since `proxy.ts` runs on Node.js runtime (not Edge), you can use either `jose` or `jsonwebtoken` to decode/verify the token. However, only a presence check (cookie exists) is needed for the redirect gate — the real verification happens in `get_current_user()` on the backend. This is the correct layered approach: proxy handles UX redirects, backend enforces security.

### Pattern 5: AuthContext + useAuth Hook

**What:** React Context pattern for sharing the current user across client components.
**When to use:** Wrap `{children}` in `layout.tsx`.

```typescript
// Source: React docs context pattern + CONTEXT.md D-11
// frontend/app/lib/auth.tsx
"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User { id: string; email: string; name: string; }
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user from /auth/me on mount
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setUser(data))
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    window.location.href = "/login";
  };

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

### Pattern 6: 401 Interception in api.ts

**What:** Modify all fetch calls in `frontend/app/lib/api.ts` to use `credentials: "include"` so the browser sends the HTTP-only cookie cross-origin, and emit a custom event on 401 to trigger the `SessionExpiredModal`.

```typescript
// frontend/app/lib/api.ts — pattern for all fetch calls
const res = await fetch(`${API_BASE}/analyze/`, {
  method: "POST",
  credentials: "include",   // ADD TO ALL REQUESTS — sends cookie cross-origin
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url }),
});
if (res.status === 401) {
  window.dispatchEvent(new Event("auth:expired"));  // SessionExpiredModal listens for this
  throw new Error("Session expired");
}
```

### Pattern 7: SQLite Schema Migration (Init-time)

**What:** Add `users` table and `user_id` columns to existing tables. Use `ALTER TABLE ADD COLUMN` with `DEFAULT NULL` for backward compat, then add `CREATE TABLE IF NOT EXISTS` for users in `init_db()`.

```python
# Source: SQLite docs on ALTER TABLE + CONTEXT.md D-02
# In history_store.py init_db():
conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- Add user_id to existing tables; DEFAULT NULL so existing rows are not broken
    -- ALTER TABLE ADD COLUMN is safe if column doesn't already exist
""")
# Add columns conditionally (SQLite has no IF NOT EXISTS for ADD COLUMN)
_add_column_if_missing(conn, "analyses", "user_id", "TEXT REFERENCES users(id)")
_add_column_if_missing(conn, "schedules", "user_id", "TEXT REFERENCES users(id)")
```

Helper for safe `ALTER TABLE`:
```python
def _add_column_if_missing(conn, table: str, column: str, col_type: str) -> None:
    existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        conn.commit()
```

**Important:** SQLite `ALTER TABLE ADD COLUMN` does NOT support foreign key constraints when FK pragma is ON. Workaround: add column with type only (`TEXT`), and enforce referential integrity at the application layer. The `REFERENCES` clause in ADD COLUMN is accepted syntactically but not enforced until a full table rebuild.

### Anti-Patterns to Avoid

- **Don't use `python-jose`**: It is abandoned (last release 2021), has open CVEs. Use `PyJWT>=2.12.1`.
- **Don't use `passlib`**: It is unmaintained (~2023). Use `bcrypt` directly.
- **Don't use `middleware.ts` filename**: In Next.js 16.1.6 it is deprecated. Use `proxy.ts` with `export default function proxy(...)`.
- **Don't verify JWT signature in proxy.ts**: Only check cookie presence for the redirect gate. Signature verification belongs in `get_current_user()` on the backend (defense in depth).
- **Don't use `Bearer` header auth**: The decision is HTTP-only cookies. Ensure all fetch calls include `credentials: "include"`.
- **Don't rebuild SQLite tables for migration**: Use `_add_column_if_missing()` helper — safe for production with existing data.
- **Don't filter user data without `user_id`**: Every query on `analyses` and `schedules` must include `WHERE user_id = ?`. Missing this filter exposes cross-user data.
- **Don't set `secure=True` on the cookie in local dev**: Cookie will not be sent over `http://localhost`. `secure=False` for local dev is correct per CONTEXT.md discretion.
- **Don't forget CORS `allow_credentials=True`**: Already set in `main.py`. Confirm it remains when auth router is added.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `bcrypt.hashpw()` + `bcrypt.checkpw()` | Adaptive work factor, salting built-in; bcrypt 5.0.0 |
| JWT signing/verification | Custom HMAC + base64 | `jwt.encode()` / `jwt.decode()` from `PyJWT` | Handles exp claim, algorithm negotiation, padding edge cases |
| UUID generation for user IDs | Custom ID scheme | `str(uuid.uuid4())` | Already used throughout the codebase for task IDs |
| Route protection in Next.js | Per-page checks / layout guards | `proxy.ts` | Server-side before page renders; no flash of unauthenticated content |

**Key insight:** Auth is a domain where nearly every custom implementation has subtle security bugs (timing attacks on password comparison, missing `httponly`, JWT `alg: none` attack). Use battle-tested libraries for the security-critical parts and keep the application code thin.

---

## Common Pitfalls

### Pitfall 1: Cookie Not Sent Cross-Origin (CORS + credentials)

**What goes wrong:** The frontend `fetch()` calls to `http://localhost:8000` omit the auth cookie because `credentials` defaults to `"omit"` in the Fetch API.
**Why it happens:** HTTP-only cookies are only sent when `credentials: "include"` is set on every fetch call, AND the backend sets `allow_credentials=True` in CORS middleware.
**How to avoid:** Add `credentials: "include"` to every fetch call in `frontend/app/lib/api.ts`. The CORS config in `main.py` already has `allow_credentials=True` — verify it remains after the auth router is added.
**Warning signs:** 401 on every request even after successful login; cookies visible in DevTools Application tab but not being sent.

### Pitfall 2: proxy.ts vs middleware.ts Confusion (Next.js 16)

**What goes wrong:** Creating `middleware.ts` (the old pattern) in a Next.js 16 project. It works but generates deprecation warnings and may break in a future minor.
**Why it happens:** All existing guides and the CONTEXT.md decision reference `middleware.ts` because that was the convention before Next.js 16.
**How to avoid:** Create `proxy.ts` at `frontend/app/proxy.ts`, export `default function proxy(...)`, and export `config` with `matcher`. The CONTEXT.md decision says `middleware.ts` by name — note this discrepancy in the plan so the user can confirm.
**Warning signs:** Console warning `The "middleware.ts" file is deprecated`; the app still works but generates noise.

### Pitfall 3: SQLite "Cannot Add Foreign Key Column" Error

**What goes wrong:** `ALTER TABLE analyses ADD COLUMN user_id TEXT REFERENCES users(id)` fails when `PRAGMA foreign_keys = ON`.
**Why it happens:** SQLite does not support adding a column with a foreign key reference via `ALTER TABLE` when FK enforcement is enabled.
**How to avoid:** Either (a) disable FK pragma before `ADD COLUMN` and re-enable after, or (b) add the column as plain `TEXT` without `REFERENCES` clause — application-level filtering by `user_id` provides the isolation, and the FK constraint is not strictly necessary for functionality. The existing codebase already uses `PRAGMA foreign_keys=ON` in `_connect()`.
**Warning signs:** `sqlite3.OperationalError: Cannot add a REFERENCES column with non-NULL default value`

### Pitfall 4: Cross-User Data Leak (Missing user_id Filter)

**What goes wrong:** History or schedules queries return all rows regardless of the authenticated user.
**Why it happens:** Existing query functions in `history_store.py` (`list_analyses`, `list_schedules`, etc.) have no `user_id` parameter — they must be updated to accept and apply it.
**How to avoid:** Every query function that returns history or schedule rows must add `WHERE user_id = ?`. The `get_current_user` dependency returns the user object; routes must pass `current_user.id` to store functions.
**Warning signs:** User A sees User B's history; no error thrown.

### Pitfall 5: JWT Secret Not Set in Production

**What goes wrong:** The `JWT_SECRET_KEY` environment variable is left unset; the code falls back to `"change-me-in-production"` and all JWTs are trivially forgeable.
**Why it happens:** The project uses `os.getenv("KEY", "default")` pattern everywhere — convenient for development but dangerous if not configured before deployment.
**How to avoid:** Log a loud warning on startup if `JWT_SECRET_KEY` is the default value. Document `JWT_SECRET_KEY` in the project's `.env` file (or `.env.example` if one is created).
**Warning signs:** Auth "works" locally but the secret is predictable.

### Pitfall 6: Existing Rows Have NULL user_id After Migration

**What goes wrong:** After adding `user_id` columns, existing analyses and schedules rows have `user_id = NULL`. If the queries filter by `user_id = ?`, these rows become invisible to all users.
**Why it happens:** SQLite `ALTER TABLE ADD COLUMN` defaults new columns to `NULL`.
**How to avoid:** This is acceptable behavior — existing rows are orphaned. Document it: pre-auth data is not assigned to any user. If the operator wants to preserve pre-auth data, they must manually assign it to a specific user (out of scope for this phase).
**Warning signs:** History tab shows empty after auth is added; no error, just silent data loss of pre-existing records.

### Pitfall 7: SessionExpiredModal Not Dismissable — Focus Trap Required

**What goes wrong:** The modal opens but keyboard users can Tab out of it and interact with the page behind the overlay.
**Why it happens:** Standard React portals do not trap focus by default.
**How to avoid:** Per the UI-SPEC.md, the modal must trap focus. Use `useEffect` to focus the password input on open and listen for Tab/Shift+Tab to cycle within the modal. The modal has no close button per spec — the user must authenticate.
**Warning signs:** Screenreader reads content behind the modal; Tab leaves the modal.

---

## Code Examples

### Signup Endpoint (Backend)

```python
# Source: pattern from FastAPI docs + bcrypt 5.x API
# backend/app/api/routes/auth.py
import uuid
import bcrypt
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, EmailStr
from app.store.history_store import get_user_by_email, create_user

router = APIRouter()

class SignupRequest(BaseModel):
    email: str
    name: str
    password: str

@router.post("/signup", status_code=201)
def signup(body: SignupRequest, response: Response):
    if get_user_by_email(body.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Sign in instead.")
    password_hash = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_id = str(uuid.uuid4())
    user = create_user(user_id, body.email, body.name, password_hash)
    token = _create_access_token(user_id)
    response.set_cookie(key="access_token", value=token, httponly=True,
                        max_age=86400, samesite="lax", secure=False)
    return {"id": user_id, "email": body.email, "name": body.name}
```

### Protecting Existing Routes (Dependency Injection)

```python
# Source: FastAPI dependency injection docs
# backend/app/api/routes/history.py — modified route signature
from app.dependencies.auth import get_current_user

@router.get("/")
def get_history(
    current_user=Depends(get_current_user),
    domain: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    items = list_analyses(user_id=current_user["id"], domain=domain, limit=limit, offset=offset)
    ...
```

### Mounting the Auth Router in main.py

```python
# backend/app/main.py — add auth router
from app.api.routes import analyze, sites, geo, history, schedules, auth

app.include_router(auth.router, prefix="/auth", tags=["auth"])

@app.get("/health")  # public endpoint per D-08
def health():
    return {"status": "ok"}
```

### Frontend: Wrapping layout.tsx with AuthProvider

```typescript
// frontend/app/layout.tsx
import { AuthProvider } from "./lib/auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `python-jose` for JWT | `PyJWT>=2.12.1` | python-jose abandoned ~2021; FastAPI docs updating | Use PyJWT — actively maintained |
| `passlib[bcrypt]` for hashing | `bcrypt>=5.0.0` standalone | passlib unmaintained ~2023 | Use bcrypt directly |
| `middleware.ts` in Next.js | `proxy.ts` in Next.js 16 | Next.js 16.0 (Oct 2025) | `middleware.ts` deprecated; `proxy.ts` runs on Node.js runtime |
| `jose` required for Edge JWT | Either `jose` or `jsonwebtoken` in proxy.ts | Next.js 16 (proxy runs Node.js) | `jose` still recommended for portability |

**Deprecated/outdated:**
- `middleware.ts` filename: deprecated in Next.js 16 (Oct 2025), still works but logs warnings. Replacement: `proxy.ts` with `export default function proxy()`.
- `python-jose`: effectively abandoned. Do not use.
- `passlib`: unmaintained. Do not use as wrapper — use `bcrypt` directly.

---

## Open Questions

1. **middleware.ts vs proxy.ts — what does the planner/user want?**
   - What we know: CONTEXT.md D-10 says "Next.js `middleware.ts`"; Next.js 16.1.6 deprecates `middleware.ts` in favor of `proxy.ts`
   - What's unclear: Was `middleware.ts` specified because the user knew about the deprecation, or because `proxy.ts` was not yet common knowledge when the discussion happened?
   - Recommendation: The plan should use `proxy.ts` (the correct approach for Next.js 16), note the discrepancy in a comment, and call out that `middleware.ts` would also work (just with deprecation warnings). This aligns intent over literal naming.

2. **JWT_SECRET_KEY environment variable**
   - What we know: The project uses `os.getenv("KEY", "default")` pattern. No `.env.example` exists.
   - What's unclear: Whether the plan should include adding `JWT_SECRET_KEY` to `.env` and/or `docker-compose.yml`.
   - Recommendation: Include a task to add `JWT_SECRET_KEY` to `.env` and `docker-compose.yml` env section (with a placeholder value), plus a startup warning if it's the default.

3. **`/auth/me` endpoint needed for AuthContext**
   - What we know: `AuthContext` needs to load current user state on app mount (to populate `useAuth()`). The JWT cookie cannot be read by JavaScript (HTTP-only). Needs a server round-trip.
   - What's unclear: Not explicitly specified in CONTEXT.md, but it's a necessary implementation detail.
   - Recommendation: Add `GET /auth/me` endpoint that returns `{id, email, name}` for the authenticated user. This is the only way to populate AuthContext from an HTTP-only cookie.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Container builds | ✓ | 27.4.0 | — |
| Python | Backend container | ✓ | 3.14.3 (host); 3.11 (container via Dockerfile) | — |
| Node.js | Frontend | ✓ | 22.19.0 | — |
| PyJWT | JWT encode/decode | ✗ (not in requirements.txt) | 2.12.1 on PyPI | — |
| bcrypt | Password hashing | ✗ (not in requirements.txt) | 5.0.0 on PyPI | — |
| jose (npm) | proxy.ts JWT check | likely present transitively | 6.2.2 on npm | Install explicitly |

**Missing dependencies with no fallback:**
- `PyJWT>=2.12.1` — add to `backend/requirements.txt`
- `bcrypt>=5.0.0` — add to `backend/requirements.txt`

**Missing dependencies with fallback:**
- `jose` (npm) — add to `frontend/package.json` if not present transitively

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json`. This section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (not yet installed — Wave 0 gap) |
| Config file | none — `pytest.ini` or `pyproject.toml` needed (Wave 0) |
| Quick run command | `pytest backend/tests/test_auth.py -x -q` |
| Full suite command | `pytest backend/tests/ -x -q` |

**Note:** No project test infrastructure currently exists (confirmed: no `tests/` directory, no `pytest.ini`). All test files are Wave 0 gaps.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /auth/signup creates user, returns JWT cookie, 201 status | integration | `pytest backend/tests/test_auth.py::test_signup_creates_user -x` | Wave 0 |
| AUTH-02 | POST /auth/signup rejects duplicate email with 409 | unit | `pytest backend/tests/test_auth.py::test_signup_duplicate_email -x` | Wave 0 |
| AUTH-03 | POST /auth/signin returns JWT cookie for valid credentials | integration | `pytest backend/tests/test_auth.py::test_signin_valid -x` | Wave 0 |
| AUTH-04 | POST /auth/signin returns 401 for wrong password | unit | `pytest backend/tests/test_auth.py::test_signin_wrong_password -x` | Wave 0 |
| AUTH-05 | POST /auth/logout clears the cookie (max_age=0) | unit | `pytest backend/tests/test_auth.py::test_logout_clears_cookie -x` | Wave 0 |
| AUTH-06 | GET /history returns 401 with no cookie | integration | `pytest backend/tests/test_auth.py::test_protected_route_no_cookie -x` | Wave 0 |
| AUTH-07 | GET /history returns only rows for the authenticated user (user isolation) | integration | `pytest backend/tests/test_auth.py::test_user_data_isolation -x` | Wave 0 |
| AUTH-08 | GET /auth/me returns user info for authenticated user | unit | `pytest backend/tests/test_auth.py::test_me_endpoint -x` | Wave 0 |
| AUTH-09 | bcrypt hashes are stored (not plaintext) | unit | `pytest backend/tests/test_auth.py::test_password_hashed -x` | Wave 0 |
| AUTH-10 | JWT contains correct exp claim (24h) | unit | `pytest backend/tests/test_auth.py::test_jwt_expiry_claim -x` | Wave 0 |

**Frontend validation (manual — no test runner present):**
- `/login` page redirects to main app on successful login
- Unauthenticated navigation to `/` redirects to `/login`
- Sidebar shows logged-in user's name and email
- Logout button clears session and redirects to `/login`
- SessionExpiredModal appears when any API call returns 401

### Sampling Rate

- **Per task commit:** `pytest backend/tests/test_auth.py -x -q`
- **Per wave merge:** `pytest backend/tests/ -x -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/__init__.py` — empty init for pytest discovery
- [ ] `backend/tests/test_auth.py` — all AUTH-XX tests (requires `httpx[test]` for FastAPI TestClient)
- [ ] `backend/tests/conftest.py` — shared fixtures: in-memory SQLite db, test FastAPI client, test user factory
- [ ] `pytest.ini` or `[tool.pytest.ini_options]` in `pyproject.toml` at repo root
- [ ] Add `pytest>=7.0.0` and `httpx>=0.24.0` to `requirements.txt` (or a dev requirements file)

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md describes the system architecture and end-to-end workflow but contains no explicit coding directives, forbidden patterns, or testing rules. The following structural constraints apply based on system design:

- Redis stores ephemeral crawl data (2-hour TTL) — do NOT use Redis for auth sessions (stateless JWT per D-05 is correct)
- SQLite (`history.db`) is the permanent store — users table goes here
- Both backend and worker containers mount the same SQLite volume — any schema migration in `init_db()` must be safe for concurrent init (the existing `_lock` + `CREATE TABLE IF NOT EXISTS` pattern handles this)
- The Celery worker also imports `history_store.py` — the schema migration runs on worker start too. This is safe with the `_add_column_if_missing` helper pattern.

---

## Sources

### Primary (HIGH confidence)

- PyPI registry (pip index versions) — confirmed PyJWT 2.12.1, bcrypt 5.0.0 latest versions (2026-04-06)
- npm registry (npm view) — confirmed jose 6.2.2 latest (2026-04-06)
- [Next.js 16 official blog](https://nextjs.org/blog/next-16) — middleware.ts deprecated, proxy.ts replacement; Node.js runtime; migration steps
- FastAPI existing `main.py`, `history_store.py`, `requirements.txt` — confirmed current architecture and extension points
- Next.js official [Renaming Middleware to Proxy docs](https://nextjs.org/docs/messages/middleware-to-proxy)

### Secondary (MEDIUM confidence)

- [FastAPI JWT Authentication with HTTP-only cookies](https://retz.dev/blog/jwt-and-cookie-auth-in-fastapi/) — verified against FastAPI docs patterns
- [PyJWT vs python-jose discussion](https://github.com/fastapi/fastapi/discussions/11345) — FastAPI team acknowledging python-jose is nearly abandoned
- [passlib maintenance concern](https://github.com/fastapi/fastapi/discussions/11773) — FastAPI team confirming passlib no longer maintained
- SQLite [ALTER TABLE docs](https://www.sqlite.org/lang_altertable.html) — confirmed foreign key constraint limitation with ADD COLUMN

### Tertiary (LOW confidence)

- WebSearch results on CVE-2025-29927 (Next.js middleware bypass) — mentions the vulnerability was patched in Next.js 15.2.3 and 14.2.25; project is on 16.1.6 which post-dates the patch

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified library versions from PyPI and npm registries directly (2026-04-06)
- Architecture: HIGH — patterns derived from existing codebase structure + official FastAPI and Next.js 16 docs
- Pitfalls: HIGH — SQLite FK limitation verified from official docs; cookie/CORS pitfall from direct code inspection; proxy.ts change verified from Next.js 16 official blog

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable ecosystem — PyJWT, bcrypt, FastAPI change slowly; Next.js 16 proxy.ts is now stable)
