# Backend Notes from the Frontend Team

Hi! This file collects small things we noticed while connecting the frontend to the API. Nothing here is blocking us right now. Each item says what we saw, why it matters, and what would help. If anything is unclear, just ask.

## 1. Error responses have no message in the body

**What we saw:** When a request fails (for example, logging in with a wrong password), the API returns status `403` with a completely empty body.

**Why it matters:** The app wants to show people a friendly message like "Wrong email or password." With an empty response, we cannot tell the difference between "wrong password", "account suspended", or "something crashed". They all look the same to us.

**What would help:** Return a small JSON body with every error, always in the same shape. For example:

```json
{ "message": "Wrong email or password" }
```

Also, using the usual status codes helps us react correctly:

- `400` = the request data was bad (for example, missing a field)
- `401` = wrong login details, or the token expired
- `403` = logged in, but not allowed to do this
- `404` = thing not found

Right now almost everything comes back as `403`, so the app cannot tell what actually went wrong.

## 2. A public "are you awake?" endpoint

**What we saw:** The server sleeps when nobody uses it (that is a Render free plan thing, not your fault). The first request after a quiet period can take 60 seconds or more. We tried `GET /actuator/health` to check if the server is awake, but it returns `403`.

**Why it matters:** While the server wakes up, we want to show people a nice "Connecting..." screen instead of a frozen page. For that we need one tiny endpoint we can call without logging in.

**What would help:** Make one endpoint public (no login needed) that just answers "I am alive". The easiest way in Spring Boot is to allow the health endpoint in `SecurityConfig`:

```java
.requestMatchers("/actuator/health").permitAll()
```

It only returns `{"status":"UP"}`, so it is safe to leave open.

## 3. Add our frontend URLs to the allowed origins list

**What we saw:** When a browser page from `http://localhost:3000` calls the API directly, the server answers `403 Invalid CORS request`. We found in `SecurityConfig.java` that allowed websites come from the `FRONTEND_URLS` environment variable on the server.

**Why it matters:** For now we route all our API calls through our own Next.js server, so this does not block us. But if we ever call the API straight from the browser, the browser's address must be on that list.

**What would help:** When we have our final website address (and while testing, `http://localhost:3000`), add them to the `FRONTEND_URLS` variable on Render, separated by a comma, like:

```
FRONTEND_URLS=http://localhost:3000,https://earsforyou.app
```

## 4. Cookie settings for the refresh token

**What we saw:** Login sets the `user_refresh_token` cookie. We have not been able to inspect its attributes yet (see item 1, we cannot log in without a real account).

**Why it matters:** Browsers are strict about cookies that travel between different websites. If the cookie is created without the right attributes, the browser silently throws it away and users get logged out after 15 minutes.

**What would help:** When creating the cookie, please make sure it has:

- `HttpOnly` (JavaScript cannot read it - you likely have this already)
- `Secure` (only sent over https)
- `SameSite=None` (allowed to travel cross-site - only needed if the frontend calls the API directly)
- `Path=/api/v1/auth` or `/` (so it reaches the refresh endpoint)
- No hard-coded `Domain` value (let the browser figure it out)

## 5. Could you share a test account?

To build and test the screens (dashboard, journal, chat) we need to log in. Registration sends an OTP to a real email, so we can do it ourselves with a personal address, but a dedicated test account (email + password) that we can all share would make things easier. There is also the admin "manual OTP" endpoint that can help if emails do not arrive.

## 6. OTP codes end up in the URL for some endpoints

**What we saw:** `/api/v1/auth/recovery/confirm` and the resend endpoints take `email` and `otp` as query string parameters instead of a request body. So a call looks like `POST /api/v1/auth/recovery/confirm?email=someone@example.com&otp=123456`.

**Why it matters:** Query strings are easy to leak by accident. They typically get written to server access logs, proxy logs, and browser history, and they can show up in analytics tools that record full URLs. A one-time password sitting in plain text in a log file defeats a lot of the point of it being one-time and secret. We cannot fix this from the frontend since we just call the contract as it is.

**What would help:** For these endpoints, accept `email` and `otp` in a JSON request body instead of the URL, the same way `/api/v1/auth/reset-password` already does. For example:

```json
{ "email": "someone@example.com", "otp": "123456" }
```

That keeps the code out of access logs while the rest of the request (method, path, auth) can stay the same.
