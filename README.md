# Hayden Surf and Foil

A private, password-protected weekly call on where the southern Gold Coast is worth surfing
(Burleigh Heads down to Duranbah) and when Currumbin is worth wing foiling.

Open it, and the top of the page answers one question: is there anything great this week, and when.

## What counts as good

| Activity | Rule |
| --- | --- |
| Surf | 4ft+ face with offshore or glassy wind, swell inside the spot's window. "Epic" needs 5ft+, 8s+ period and a swell direction lined up with the bank. |
| Wing foil | 16kt+ at Currumbin Creek / Currumbin Alley in a sailable direction. "Epic" needs 20kt+ from the NE (creek, flat water) or SE-S (the Alley). |

Only daylight hours (5am-6pm Brisbane) are considered, and each hour of the week is scored for
every spot, keeping the best spot per hour so the week view reads as a single go/no-go call.

Thresholds live in `THRESHOLDS` in `src/lib/conditions.ts`; spot geometry (offshore direction,
swell window, ideal swell) lives in `src/lib/spots.ts`.

## Spots

Surf: South Stradbroke Island, Burleigh Heads, Palm Beach, Currumbin Alley, Kirra,
Snapper Rocks (Superbank), Duranbah, Dreamtime (Fingal Head).

Wing foil: Currumbin Creek (flat water, NE seabreeze) and Currumbin Alley (wave riding, SE-S).

## Forecast data

Wave height/period/direction come from the Open-Meteo Marine API and wind from the Open-Meteo
weather API — both keyless, so nothing has to be stored or refreshed for the app to keep working.
Surfline and Windy both sit behind bot protection / paid API keys for server-to-server use; if a
Windy Point Forecast API key is added later, it can be slotted in behind the same
`getWeekForecast()` interface in `src/lib/forecast.ts`.

Wave heights are significant wave height converted to feet, which tracks Gold Coast surf-report
face heights closely enough for a 4ft call.

## Running it

```bash
cp .env.example .env.local   # set APP_PASSWORD and SESSION_SECRET
npm install
npm run dev                  # http://localhost:3000
```

`npm run build` for a production build, `npm run lint` for lint.

## Auth

A single shared password (`APP_PASSWORD`) posts to `/api/login`, which sets an HMAC-signed,
httpOnly session cookie valid for 30 days. `src/middleware.ts` redirects unauthenticated requests
to `/login`.

Login and logout require an `Origin` header matching `Host`, and failed logins are throttled to 10
per 15 minutes per client. The throttle key comes from Vercel's platform-set `x-vercel-forwarded-for`
/ `x-real-ip` (client-supplied `x-forwarded-for` is only a last-resort fallback), and the store is
in-process, so it limits each serverless instance rather than the deployment as a whole — adequate for
a single-user app, but a shared store (e.g. Upstash) would be needed for a stricter guarantee. If
`APP_PASSWORD` or `SESSION_SECRET` is missing, the app shows a config message on `/login` instead of
returning 500s.

The signing key is `SESSION_SECRET` plus `APP_PASSWORD`, so changing the password logs every
existing session out — that is the revocation path if the password ever leaks.

The session cookie is `Secure` for every request except plain HTTP on loopback (`localhost`,
`127.0.0.1`, `[::1]`), so `npm run start` works locally without HTTPS. Serving the app from a LAN
hostname or IP over plain HTTP therefore loops back to `/login`, because the browser drops the
`Secure` cookie — put it behind HTTPS (Vercel, or a local reverse proxy that sets
`x-forwarded-proto: https`) rather than over unencrypted HTTP, which would expose the password and
session token on the wire.
