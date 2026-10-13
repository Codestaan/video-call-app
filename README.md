# Meetly: a Google Meet-style video call app

Features: multi-party video and audio, text chat, screen sharing, raise hand, mute and camera toggles, speaking indicator, participant list, invite link, meeting timer.

## Run it

```bash
cd meetly
npm install
npm start
```

Open http://localhost:3000, enter a name, and join. Open the same link in a second tab or on another device to test a call.

## Test with other devices

Browsers only allow camera and microphone on `localhost` or `https`. For a phone or another laptop, either:

- tunnel your local server: `npx localtunnel --port 3000` or `ngrok http 3000` (both give you an https link), or
- deploy it to Render, Railway or Fly.io (they provide https automatically).

## How it works

- `server.js`: a small Node server that serves the page and uses WebSockets (`ws`) for signaling (join, offer/answer, ICE candidates) and chat.
- `public/index.html`: the whole client. Each participant connects directly to every other participant with WebRTC (a mesh), so audio and video do not pass through your server.

## Limits and next steps

- A mesh works well for roughly 4 to 6 people. Larger meetings need an SFU such as LiveKit, mediasoup or Janus.
- Only public STUN servers are configured. Some strict networks need a TURN server (for example coturn or a hosted one); add it to the `ICE` list in `index.html`.
- Ideas to extend it: meeting passwords, a waiting room, recording, file sharing in chat, login with a database, and a spotlight layout for screen shares.
