# Backend Guide: Server-Side Participant Limit Enforcement

This document describes how to implement server-side participant limit enforcement for CatSpeak's LiveKit integration.

## 1. LiveKit Native `maxParticipants`

LiveKit Server natively supports room capacity limits. When creating a room via the Server API, set `maxParticipants`:

### Node.js (livekit-server-sdk)
```js
import { RoomServiceClient } from 'livekit-server-sdk';

const svc = new RoomServiceClient('https://your-livekit-host', 'API_KEY', 'API_SECRET');

// Create room with participant limit
await svc.createRoom({
  name: 'my-room',
  maxParticipants: 10,  // ← LiveKit enforces this natively
  emptyTimeout: 600,    // seconds
});
```

### .NET (Livekit.Server.Sdk.Dotnet)
```csharp
using Livekit.Server.Sdk;

var roomService = new RoomServiceClient("https://your-livekit-host", "API_KEY", "API_SECRET");

await roomService.CreateRoomAsync(new CreateRoomRequest
{
    Name = "my-room",
    MaxParticipants = 10,  // ← LiveKit enforces this natively
    EmptyTimeout = 600
});
```

> **Result**: LiveKit will automatically reject connection attempts when the room is full.

---

## 2. Server-Side Token Rejection (Pre-Join Check)

For additional control (e.g., custom error messages, waitlists), check participant count **before** generating a token:

### Node.js
```js
// In your /api/livekit/token endpoint:
import { RoomServiceClient, AccessToken } from 'livekit-server-sdk';

const MAX_PARTICIPANTS = 10;
const svc = new RoomServiceClient(LK_HOST, API_KEY, API_SECRET);

app.post('/api/livekit/token', async (req, res) => {
  const { roomName, participantName, participantIdentity } = req.body;

  // 1. Check current count
  const participants = await svc.listParticipants(roomName);
  if (participants.length >= MAX_PARTICIPANTS) {
    return res.status(403).json({
      error: 'ROOM_FULL',
      message: `Room is at capacity (${MAX_PARTICIPANTS} participants)`,
      currentCount: participants.length,
    });
  }

  // 2. Generate token
  const token = new AccessToken(API_KEY, API_SECRET, { identity: participantIdentity });
  token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

  res.json({
    participant_token: await token.toJwt(),
    server_url: LK_HOST,
  });
});
```

### .NET (ASP.NET Core)
```csharp
[HttpPost("token")]
public async Task<IActionResult> GetToken([FromBody] TokenRequest request)
{
    const int MaxParticipants = 10;

    var participants = await _roomService.ListParticipantsAsync(
        new ListParticipantsRequest { Room = request.RoomName });

    if (participants.Participants.Count >= MaxParticipants)
    {
        return StatusCode(403, new {
            error = "ROOM_FULL",
            message = $"Room is at capacity ({MaxParticipants} participants)",
            currentCount = participants.Participants.Count
        });
    }

    var token = new AccessToken(_apiKey, _apiSecret)
        .WithIdentity(request.ParticipantIdentity)
        .WithGrants(new VideoGrants { RoomJoin = true, Room = request.RoomName });

    return Ok(new {
        participant_token = token.ToJwt(),
        server_url = _livekitHost
    });
}
```

---

## 3. LiveKit Webhooks for Real-Time Monitoring

Configure LiveKit webhooks to track room events in real-time:

```yaml
# livekit.yaml
webhook:
  urls:
    - https://api.catspeak.com.vn/api/livekit/webhook
  api_key: your_api_key
```

### Key Webhook Events

| Event | Use Case |
|-------|----------|
| `room_started` | Log room creation, initialize counters |
| `room_finished` | Cleanup, finalize session records |
| `participant_joined` | Increment counter, send system notification |
| `participant_left` | Decrement counter, detect ghost participants |
| `track_published` | Monitor audio/video track status |

### Node.js Webhook Handler
```js
import { WebhookReceiver } from 'livekit-server-sdk';

const receiver = new WebhookReceiver(API_KEY, API_SECRET);

app.post('/api/livekit/webhook', async (req, res) => {
  const event = await receiver.receive(req.body, req.get('Authorization'));

  switch (event.event) {
    case 'participant_joined':
      console.log(`${event.participant.identity} joined ${event.room.name}`);
      // Update your database, send notifications, etc.
      break;
    case 'participant_left':
      console.log(`${event.participant.identity} left ${event.room.name}`);
      break;
    case 'room_finished':
      console.log(`Room ${event.room.name} ended`);
      break;
  }

  res.sendStatus(200);
});
```

---

## 4. API Endpoint for Client Pre-Check (Optional)

The CatSpeak frontend calls `GET /api/livekit/rooms/:roomName/participants` before joining. Implement this endpoint:

```js
app.get('/api/livekit/rooms/:roomName/participants', async (req, res) => {
  const participants = await svc.listParticipants(req.params.roomName);
  res.json({ count: participants.length });
});
```

This allows the frontend's `useParticipantLimit` hook to show capacity info **before** the user clicks "Join."
