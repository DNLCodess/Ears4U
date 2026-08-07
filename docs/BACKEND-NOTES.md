# Backend Notes from the Frontend Team

Hi! This file collects small things we noticed while connecting the frontend to the API. Each item says what we saw, why it matters, and what would help. If anything is unclear, just ask.

**Update:** the backend team replied with a full round of fixes. Items 1, 2, 4, 5, 6, and 7 below are resolved and confirmed working live against the deployed server. Item 3 is not needed yet (we do not call the API directly from the browser), and item 8 is still open. Kept the original notes below each item for context.

## 1. Error responses have no message in the body — resolved

**What we saw:** When a request fails (for example, logging in with a wrong password), the API returns status `403` with a completely empty body.

**Confirmed fixed:** a `GlobalExceptionHandler` now returns `{ "message": "..." }` on every error, with real status codes: `400` validation, `401` invalid credentials or expired token, `403` valid token but wrong role, `429` rate limited. Confirmed live: a wrong password now returns `401` with `{"message":"Incorrect email or password."}`.

One correction worth recording: a request with a **missing** access token (no `Authorization` header at all) comes back as `403`, not `401`, on this deployment. That is Spring Security's normal behavior for an unauthenticated request hitting a secured route rather than something to fix, and our frontend already treats both `401` and `403` as "try a token refresh," so it does not affect us. Just flagging it in case a future client assumes `401` for that case specifically.

## 2. A public "are you awake?" endpoint — resolved

**What we saw:** The server sleeps when nobody uses it (Render free plan). The first request after a quiet period can take 60 seconds or more. `GET /actuator/health` used to return `403`.

**Confirmed fixed:** `GET /actuator/health` and `GET /` are both public now and return `200` (`{"status":"UP",...}` and `{"status":"online",...}`). The frontend pings `/actuator/health` on the sign-in screen to show a "Connecting..." message while the server wakes up.

## 3. Add our frontend URLs to the allowed origins list — not needed yet

We still route every API call through our own Next.js server rather than calling the API straight from the browser, so CORS does not affect us either way. Good to know `CorsConfig` now trusts `http://localhost:3000` and reads production origins from `APP_FRONTEND_URLS` on Render, in case that changes later.

## 4. Cookie settings for the refresh token — resolved

**Confirmed fixed:** logging in against the live server now sets:

```
Set-Cookie: user_refresh_token=...; Path=/; Max-Age=604800; Secure; HttpOnly; SameSite=None
```

That is every attribute we asked for, and the cookie name is unchanged, so nothing on the frontend needed to move.

## 5. Could you share a test account? — resolved

A `TestAccountSeeder` now creates a standard user and an admin account on server startup, so we can skip the OTP email flow while testing the UI. Not repeating the actual email and password here since this repository is public; ask a teammate for the current credentials, or check the message the backend team sent with them.

## 6. OTP codes end up in the URL for some endpoints — resolved

**What we saw:** `/api/v1/auth/recovery/confirm` and the resend endpoints took `email` and `otp` as query string parameters.

**Confirmed fixed:** these endpoints now take a JSON body, for example `{ "email": "...", "otp": "..." }`, the same way `/api/v1/auth/reset-password` already did. Confirmed live with a quick before/after check: calling with the old `?email=...` query string now fails with a `500`, and calling with a JSON body succeeds. The frontend has been updated to send bodies everywhere.

## 7. Timestamps come back without timezone information — resolved

**What we saw:** `latestMood.createdAt` had no timezone, so the frontend could not reliably answer "did I check in today?" for users far from the server's clock.

**Confirmed fixed:** `GET /api/v1/dashboard/home` now includes a server-computed `"loggedToday": true` boolean, worked out from the user's registered country. The frontend uses this field directly now instead of comparing timestamps itself.

Also confirmed: `GET /api/v1/mood/analytics` now returns plain `ISO_LOCAL_DATE` strings (`"2026-08-06"`) instead of the old English-only `"Aug 6"` format, so the frontend can format dates itself.

## 8. Notifications endpoint only returns unread items — still open

**What we saw:** `GET /api/v1/users/notifications` only returns notifications that have not been marked read yet. As soon as something is marked read, it drops out of the list entirely.

**Why it matters:** We would like to show people a history of their notifications, not just the ones still waiting for attention. Right now, once someone reads a notification, there is no way for the app to show it again, so it just looks like it vanished.

**What would help:** A full list of notifications (read and unread), or a `?filter=` option (for example `?filter=unread` vs `?filter=all`) so we can choose which view to show. Either would let the app keep a history instead of losing notifications the moment they are read.
