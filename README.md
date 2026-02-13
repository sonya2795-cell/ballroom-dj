# Ballroom DJ

A web app that sequences ballroom dance rounds and practice playlists. The
frontend is a Vite + React client; the backend is an Express server that
pulls tracks from Firebase Storage and now requires users to authenticate with
Google, Facebook, or Apple before starting a round.

## Prerequisites

- Node.js 18+
- A Firebase project with Firestore/Storage enabled and provider sign-in
  (Google, Facebook, Apple) configured.
- A Firebase service account key stored at `server/firebase-key.json`
  (already referenced by the server).

## Environment configuration

1. Copy the example environment files and fill in the values from your Firebase
   project and deployment settings:

   ```bash
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

2. `client/.env` must contain the Firebase web app settings (`VITE_FIREBASE_*`).

3. `server/.env` should list the allowed frontend origins in `CLIENT_ORIGIN`
   (comma-separated if you have multiple environments). When `NODE_ENV` is set
   to `production`, session cookies are marked `Secure`.

4. For local development, leave the defaults (`http://localhost:5173`) and run
   both client and server on the same machine.

5. Email/password signup verification uses the Resend API. Configure:

   ```env
   RESEND_API_KEY=your-resend-api-key
   AUTH_VERIFICATION_FROM=Muzon <no-reply@muzonapp.com>
   PUBLIC_APP_URL=https://muzonapp.com
   PUBLIC_API_URL=https://muzonapp.com
   ```

   `PUBLIC_API_URL` should point to the backend base URL that serves
   `/auth/email/verify`. `PUBLIC_APP_URL` is where the user is redirected to
   finish setting their password (e.g. `/set-password`).

6. To forward in-app bug reports to your inbox, set either the HTTPS email API
   (recommended for production) or SMTP values inside `server/.env`:

   Recommended (Resend API):

   ```env
   RESEND_API_KEY=your-resend-api-key
   FEEDBACK_FROM=Ballroom DJ <feedback@ballroom-dj.app>
   FEEDBACK_RECIPIENTS=you@example.com,qa@example.com
   # Optional overrides
   # FEEDBACK_MAX_ATTACHMENTS=3
   # FEEDBACK_MAX_FILE_BYTES=8000000
   ```

   SMTP fallback:

   ```env
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=secret
   SMTP_SECURE=false
   FEEDBACK_FROM=Ballroom DJ <feedback@ballroom-dj.app>
   FEEDBACK_RECIPIENTS=you@example.com,qa@example.com
   # Optional overrides
   # FEEDBACK_MAX_ATTACHMENTS=3
   # FEEDBACK_MAX_FILE_BYTES=8000000
   ```

   These settings power the in-app **Feedback** modal so screenshots + notes
   route straight to your support mailbox.

## Provider setup tips

- In the Firebase console, enable each provider (Google, Facebook, Apple) and
  supply the OAuth credentials from their respective developer portals.
- Add the Firebase Hosting/Vite dev origins to each provider's list of allowed
  redirect URIs (e.g. `http://localhost:5173` for local testing).
- To support account linking inside Firebase, allow users to connect additional
  providers after their first sign-in. The client handles provider linking via
  the Firebase SDK.
- Apple Sign In requires a Services ID and private key uploaded to Firebase; be
  sure to configure those before testing the Apple flow.

## Installing dependencies

```bash
cd client && npm install
cd ../server && npm install
```

## Running the app locally

```bash
# In one terminal
cd server
npm start   # or `node index.js`

# In another terminal
cd client
npm run dev
```

- The Vite dev server proxies `/api/*` and `/auth/*` requests to the Express
  server (`http://localhost:3000`).
- When an unauthenticated user clicks **Start Round** (or loads practice
  tracks), a modal prompts for provider sign-in. Once Firebase issues a session
  cookie, the client automatically retries any pending round generation.

## Next steps

- Integrate Stripe/Paddle (or your chosen billing provider) to set the
  subscription tier and store it alongside the Firebase UID.
- Extend the backend to enforce subscription tiers on the protected routes.
- Add UI for viewing/updating account details and linked providers if needed.
