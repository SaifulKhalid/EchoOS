# Development Debug Login

**Status**: Active in Development Mode (`import.meta.env.DEV === true`)  
**Security Level**: Excluded from Production Builds  

---

## 1. Purpose & Scope

The **Developer Debug Login** provides a convenient, single-click email/password sign-in workflow strictly for local development, automated testing, and evaluation debugging. 

Google Authentication remains the primary production login flow.

---

## 2. Configuration & Credentials

### Environment Variable
Store the debug password in your uncommitted `.env.local` file:

```bash
# .env.local
VITE_DEBUG_PASSWORD=your_secret_debug_password
```

### Credentials
- **Email**: `debug@log.in` (prefilled by default, editable)
- **Password**: `debug@log.in` (prefilled by default, overridable via `VITE_DEBUG_PASSWORD` env var)

> ⚠️ **Security Notice**: This account must exist in your Firebase Authentication console under **Email/Password**. Never commit `.env.local` or expose production passwords into the codebase. Ensure `.env.local` remains listed in `.gitignore`.

---

## 3. How to Enable & Use

1. Ensure the user account `debug@log.in` exists in your Firebase Authentication console under **Email/Password**.
2. Run the local development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173/login`.
4. The **Developer Login** section appears below the `──────────── OR ────────────` divider.
5. Click **Sign In**.

---

## 4. Production Guarantee

The debug login interface is strictly gated by Vite's build-time condition:

```typescript
const isDev = import.meta.env.DEV === true;
```

During production bundling (`npm run build`), Rollup statically tree-shakes and removes the developer login form completely from the production bundle assets. Production users can only access Google Authentication and Guest Mode.
