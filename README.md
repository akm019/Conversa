# Real-Time Chat

A real-time chat application built with React, Socket.IO, and SQLite.

## Features

- **Real-time messaging** — Messages appear instantly via WebSocket (Socket.IO)
- **Multiple rooms** — Create and switch between chat rooms
- **Direct messages** — Private 1-on-1 conversations between users
- **Message persistence** — Messages saved to SQLite, survive page refresh
- **Online presence** — See who's online globally and per-room
- **Typing indicators** — Animated "user is typing..." with debounced emissions
- **Connection resilience** — Auto-reconnect with visual status banner
- **Responsive design** — Desktop layout + mobile drawer sidebar
- **Date dividers** — Messages grouped with "Today", "Yesterday" labels
- **Cursor-based pagination** — Infinite scroll with O(1) query performance
- **User avatars** — Color-coded initials for visual identity
- **Rate limiting** — Server-side spam protection (5 msg/sec)
- **XSS prevention** — All message content sanitized server-side

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + TypeScript + Vite | Modern, fast DX, type safety |
| Styling | CSS Modules + CSS Variables | Scoped styles, dark theme, no deps |
| Real-time | Socket.IO | Reconnection, rooms, fallback transports |
| Backend | Express + TypeScript | Clean routing, middleware support |
| Database | SQLite (better-sqlite3) | Zero config, single-file persistence |
| State | React Context + Custom Hooks | Simple — only 2 pieces of global state |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
cd realtime-chat
npm install
```

### Development

```bash
# Run both server and client
npm run dev

# Or run them separately
npm run dev:server   # Express on http://localhost:3001
npm run dev:client   # Vite on http://localhost:5173
```

Open http://localhost:5173 in your browser. Open a second tab with a different username to test real-time messaging and DMs.

## Architecture

```
realtime-chat/
├── server/src/
│   ├── server.ts          # HTTP + Socket.IO bootstrap
│   ├── app.ts             # Express routes + middleware
│   ├── db/                # SQLite connection, schema, queries
│   ├── routes/            # REST endpoints (rooms, messages, DMs)
│   ├── socket/            # Real-time event handlers
│   │   ├── middleware.ts   # Auth (username validation)
│   │   └── handlers/      # chat, room, presence handlers
│   └── utils/             # XSS sanitization
├── client/src/
│   ├── context/           # UserContext, SocketContext
│   ├── hooks/             # useMessages, useRooms, useDms, usePresence, useTyping, useGlobalPresence
│   └── components/        # UI components (Sidebar, MessageArea, etc.)
```

### Key Design Decisions

**Why persist messages?** Real chat products save history. Users expect to see previous messages when they return. SQLite makes this trivial with zero infrastructure.

**Why cursor-based pagination?** Using `WHERE id < ?` instead of `OFFSET` gives consistent O(1) performance regardless of scroll depth, and is stable under concurrent inserts.

**Why no user accounts?** Adding auth adds significant complexity with minimal UX benefit for this scope. Usernames are entered on join and stored in sessionStorage — simple but sufficient for identity.

**Why DMs as rooms?** A DM is implemented as a room with `type='dm'` and a deterministic ID (`dm:alice:bob`, names sorted). This reuses all existing message infrastructure — storage, pagination, real-time delivery — without duplication.

**Why typing indicators + presence?** These transform a message board into a conversation. Seeing someone online and typing creates engagement and natural turn-taking.

**Why CSS Modules over Tailwind?** For a project of this size, CSS Modules provide scoped styles without build complexity. The resulting code is more readable to reviewers unfamiliar with utility-first CSS.

### API

**REST Endpoints:**
- `GET /api/rooms` — List all chat rooms
- `POST /api/rooms` — Create a room (`{ name: string }`)
- `GET /api/rooms/:id/messages?before=<id>&limit=50` — Paginated messages
- `GET /api/dm?username=<name>` — List DM conversations for a user
- `POST /api/dm` — Create/get a DM (`{ user1: string, user2: string }`)

**Socket Events (client -> server):**
- `join_room` / `leave_room` — Room membership
- `send_message` — Send a room message
- `send_dm` — Send a direct message (`{ to: string, content: string }`)
- `typing_start` / `typing_stop` — Typing state
- `room_created` — Broadcast new room

**Socket Events (server -> client):**
- `new_message` — Room message broadcast
- `dm_message` — DM delivered to both users (`{ dm, message }`)
- `user_joined` / `user_left` — Per-room presence updates
- `global_online_users` — All online usernames
- `typing_update` — Currently typing users
- `room_created` — New room broadcast
