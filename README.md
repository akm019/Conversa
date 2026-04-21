# *Conversa*

A real-time chat platform built with React, TypeScript, Socket.IO, and SQLite.

### [Try it live](https://conversa-6o6h.onrender.com/)

> **Note:** The app is hosted on Render's free tier. It may take ~30 seconds to wake up on first visit if it's been idle.

---

## Features

### Messaging
- **Real-time chat** — Messages appear instantly via WebSocket (Socket.IO)
- **Rooms** — Public and private chat rooms with admin controls
- **Direct Messages** — 1-on-1 private conversations
- **Reply / Quote** — Reply to a specific message with a quoted preview
- **Edit & Delete** — Modify or remove your own messages
- **Forward** — Forward messages to multiple rooms or people at once
- **Message Reactions** — React with emoji (toggle on/off, visible to all)
- **File & Image Sharing** — Upload and share files with inline image preview
- **Emoji Picker** — Full emoji keyboard built into the message input

### Real-Time Features
- **Typing Indicators** — See when someone is typing (rooms and DMs)
- **Online Presence** — Live user list with avatars in the sidebar and chat header
- **Read Receipts** — Sent, delivered, and read status ticks for DMs
- **Unread Badges** — Notification counts on rooms and DMs in the sidebar
- **Sound Notifications** — Subtle audio alert when a message arrives in background

### Rooms & Access Control
- **Public Rooms** — Visible to everyone, anyone can join
- **Private Rooms** — Only invited members can see and join
- **Room Admin** — Creator can invite members, delete the room
- **Real-time Invites** — Invited users get an instant notification banner with "Join" button

### UI & UX
- **Dark / Light Theme** — Toggle in sidebar, persists across sessions
- **Avatar Selection** — Choose from 5 3D avatars on join
- **Responsive Design** — Works on desktop and mobile
- **Glassmorphism UI** — Purple/black gradient (dark) or white/blue tint (light)
- **Italic branding** — "Conversa" in Playfair Display

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React + TypeScript + Vite | Modern, fast DX, full type safety |
| **Styling** | CSS Modules + CSS Variables | Scoped styles, theme switching, no dependencies |
| **Real-time** | Socket.IO | Reconnection, rooms, fallback transports |
| **Backend** | Express + TypeScript | Clean routing, middleware support |
| **Database** | SQLite (better-sqlite3) | Zero config, single-file persistence, WAL mode |
| **State** | React Context + Custom Hooks | Simple — only global state is user + socket |
| **Deployment** | Render | Free tier, auto-deploy on push |

---

## Architecture

```
realtime-chat/
├── server/src/
│   ├── server.ts             # HTTP + Socket.IO bootstrap
│   ├── app.ts                # Express routes + static serving
│   ├── config.ts             # Environment config
│   ├── db/
│   │   ├── index.ts          # SQLite connection (WAL mode)
│   │   ├── schema.ts         # Tables: rooms, messages, room_members, reactions
│   │   └── queries.ts        # All DB operations (prepared statements)
│   ├── routes/
│   │   ├── rooms.ts          # CRUD rooms + members
│   │   ├── messages.ts       # Paginated message history
│   │   ├── dm.ts             # DM conversations
│   │   └── upload.ts         # File uploads (multer)
│   ├── socket/
│   │   ├── index.ts          # Connection handler + event registry
│   │   ├── middleware.ts      # Auth (username + avatar validation)
│   │   └── handlers/
│   │       ├── chat.ts       # Messages, edit, delete, forward, reactions, read receipts
│   │       ├── room.ts       # Join/leave with membership checks
│   │       └── presence.ts   # Online tracking, typing indicators
│   └── utils/sanitize.ts     # XSS prevention
│
├── client/src/
│   ├── App.tsx               # Root: theme + user + socket providers
│   ├── socket.ts             # Socket.IO client singleton
│   ├── context/
│   │   ├── UserContext.tsx    # Username + avatar (sessionStorage)
│   │   ├── SocketContext.tsx  # Socket instance + connection state
│   │   └── ThemeContext.tsx   # Dark/light toggle (localStorage)
│   ├── hooks/
│   │   ├── useMessages.ts    # Fetch + subscribe + pagination + status
│   │   ├── useRooms.ts       # Room CRUD + invite + real-time updates
│   │   ├── useDms.ts         # DM conversations
│   │   ├── usePresence.ts    # Per-room online users
│   │   ├── useGlobalPresence.ts  # All online users
│   │   ├── useTyping.ts      # Typing indicators (rooms + DMs)
│   │   ├── useUnread.ts      # Unread counts per room/DM
│   │   └── useNotificationSound.ts  # Background audio alerts
│   └── components/
│       ├── ChatLayout.tsx     # Main layout: sidebar + header + messages + input
│       ├── JoinScreen.tsx     # Username + avatar picker
│       ├── Avatar.tsx         # Reusable avatar image component
│       ├── MessageInput.tsx   # Text + emoji + file + reply preview
│       ├── OnlineUsers.tsx    # Dropdown: who's in the room
│       ├── OnlineAvatars.tsx  # Avatar stack in header
│       ├── InviteModal.tsx    # Invite users to private rooms
│       ├── Sidebar/           # Rooms, DMs, online users, theme toggle
│       └── MessageArea/       # Bubbles, reactions, forward modal, typing
```

---

## Key Design Decisions

**Why Socket.IO over raw WebSocket?**
Built-in reconnection, room abstraction, and transport fallback. In a chat app, reliability matters more than raw performance.

**Why SQLite?**
Zero infrastructure — no database server to set up. Messages persist across refresh. WAL mode handles concurrent reads. For this scope, it's the right trade-off.

**Why cursor-based pagination?**
`WHERE id < ? ORDER BY id DESC LIMIT 50` is O(1) via the index regardless of message volume. Offset-based pagination degrades as you scroll deeper.

**Why DMs as rooms?**
A DM is just a room with `type='dm'` and a deterministic ID (`dm:alice:bob`). This reuses the entire message pipeline — storage, pagination, real-time broadcast, reactions, read receipts — with zero code duplication.

**Why presence + typing + reactions?**
These are what transform a message board into a conversation. Seeing someone online and typing creates engagement. Reactions let you acknowledge without cluttering the chat.

**Why CSS Modules over Tailwind?**
Scoped styles without build complexity. The code is more readable to reviewers who don't know utility-first CSS. CSS variables make theming trivial.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
git clone https://github.com/akm019/Conversa.git
cd Conversa
npm install
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies API and WebSocket to the Express server on port 3001.

### Production Build

```bash
npm run build    # Builds client + server
npm start        # Serves everything from port 3001
```

---

## API Reference

### REST

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/rooms?username=X` | List rooms visible to user |
| `POST` | `/api/rooms` | Create room `{ name, createdBy, isPrivate }` |
| `DELETE` | `/api/rooms/:id?username=X` | Delete room (admin only) |
| `POST` | `/api/rooms/:id/members` | Invite member `{ username, addedBy }` |
| `GET` | `/api/rooms/:id/members` | List room members |
| `GET` | `/api/rooms/:id/messages?before=N` | Paginated messages |
| `GET` | `/api/dm?username=X` | List DM conversations |
| `POST` | `/api/dm` | Create/get DM `{ user1, user2 }` |
| `POST` | `/api/upload` | Upload file (multipart, 10MB max) |

### Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `send_message` | Client → Server | Send room message (+ optional file, reply, forward) |
| `send_dm` | Client → Server | Send DM |
| `new_message` / `dm_message` | Server → Client | Real-time message delivery |
| `edit_message` / `delete_message` | Client → Server | Modify own messages |
| `toggle_reaction` | Client → Server | Add/remove emoji reaction |
| `typing_start` / `typing_stop` | Both | Typing indicators |
| `join_room` / `leave_room` | Client → Server | Room membership |
| `dm_delivered` / `dm_read` | Client → Server | Read receipt signals |
| `message_status_update` | Server → Client | Delivery/read status changes |
| `global_online_users` | Server → Client | All online users with avatars |
| `room_invite` | Both | Private room invitation |
| `room_created` / `room_deleted` | Both | Room lifecycle |
| `reaction_update` | Server → Client | Updated reaction list for a message |

---

## License

MIT
