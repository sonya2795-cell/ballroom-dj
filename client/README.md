# Ballroom DJ Client

React + Vite frontend for the Ballroom DJ experience. It fetches authenticated
rounds and practice playlists from the backend and surfaces provider sign-in
via Firebase Auth.

## Environment variables

Copy `.env.example` to `.env` and supply your Firebase web app config:

```bash
cp .env.example .env
```

Required keys:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

If the backend is not hosted on the same origin, set `VITE_API_ORIGIN` and
update `fetch` calls accordingly (currently the Vite dev server proxies `/api`
and `/auth`).

## Scripts

- `npm run dev` – start the Vite dev server (defaults to `http://localhost:5173`).
- `npm run build` – produce a production build in `dist/`.
- `npm run preview` – serve the build output locally.
- `npm run lint` – run ESLint with the configured React rules.

## Auth flow recap

- When a user hits a gated action (Start Round / practice tracks) and is
  unauthenticated, the client opens the provider modal.
- Selecting Google/Facebook/Apple launches Firebase `signInWithPopup`, then the
  client POSTs `/auth/session` to mint a secure session cookie.
- After a successful login, pending round requests are retried automatically.
