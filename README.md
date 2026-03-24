# CatSpeak LiveKit MVP Frontend

Minimal React demo app for testing your self-hosted LiveKit integration with `cathspeak-api`.

## 1) Prerequisites

- Running `cathspeak-api` backend
- Running LiveKit server (self-hosted) reachable from browser
- A valid CatSpeak account for login (`POST /api/Auth/login`)

## 2) Configure

Copy `.env.example` to `.env` and fill values:

- `VITE_API_BASE_URL`: your API URL (example: `http://localhost:5051`)
- optional demo login email/password (for quick login)
- optional JWT override (`VITE_DEMO_JWT`)
- optional defaults for room/session/name

## 3) Install + Run

```bash
npm install
npm run dev
```

Open the shown local URL, then:
1. Login with email/password (or paste JWT manually)
2. Click **Get LiveKit token**
3. Click **Join room**

## 4) Missing backend config checklist

In `cath-api/appsettings.json` (or environment-specific config), ensure you add:

```json
{
  "LiveKit": {
    "ServerUrl": "wss://YOUR_LIVEKIT_HOST",
    "ApiKey": "YOUR_LIVEKIT_API_KEY",
    "ApiSecret": "YOUR_LIVEKIT_API_SECRET",
    "TokenTtlMinutes": 60
  }
}
```

Your backend `Program.cs` already binds this section via `builder.Services.Configure<LiveKitOptions>(builder.Configuration.GetSection("LiveKit"));`.

## 5) Common issues

- `401 Unauthorized` when requesting token: login failed or JWT expired.
- `server_url` empty from token API: backend `LiveKit:ServerUrl` not configured.
- Connection fails in browser: wrong protocol/host (`ws://` vs `wss://`), firewall, reverse proxy, or cert issues.
- CORS issue: frontend origin must be allowed by backend CORS policy.
- Login endpoint path is case-sensitive in some reverse proxies: use `/api/Auth/login` as currently implemented.
