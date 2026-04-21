import { useState } from 'react';
import { useDms } from '../../hooks/useDms';
import { useGlobalPresence } from '../../hooks/useGlobalPresence';
import { useSocket } from '../../context/SocketContext';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../Avatar';
import RoomItem from './RoomItem';
import DmItem from './DmItem';
import CreateRoomModal from './CreateRoomModal';
import styles from './Sidebar.module.css';

interface Props {
  activeRoomId: string;
  onRoomSelect: (roomId: string) => void;
  unreadCounts: Record<string, number>;
  rooms: import('../../types').Room[];
  createRoom: (name: string, isPrivate: boolean) => Promise<import('../../types').Room>;
  deleteRoomById: (roomId: string) => Promise<void>;
}

export default function Sidebar({ activeRoomId, onRoomSelect, unreadCounts, rooms, createRoom, deleteRoomById }: Props) {
  const { dms, startDm } = useDms();
  const { onlineUsers } = useGlobalPresence();
  const { socket } = useSocket();
  const { username, avatarId, clearUser } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [showCreate, setShowCreate] = useState(false);

  function handleRoomClick(roomId: string) {
    if (roomId === activeRoomId) return;
    socket?.emit('join_room', { roomId });
    onRoomSelect(roomId);
  }

  function handleDmClick(dmId: string) {
    if (dmId === activeRoomId) return;
    onRoomSelect(dmId);
  }

  async function handleCreateRoom(name: string, isPrivate: boolean) {
    const room = await createRoom(name, isPrivate);
    setShowCreate(false);
    handleRoomClick(room.id);
  }

  async function handleDeleteRoom(roomId: string) {
    await deleteRoomById(roomId);
    if (activeRoomId === roomId) {
      onRoomSelect('general');
    }
  }

  async function handleStartDm(otherUser: string) {
    const dm = await startDm(otherUser);
    handleDmClick(dm.id);
  }

  // Filter out self
  const otherOnlineUsers = onlineUsers.filter((u) => u.username !== username);

  // Users who already have a DM conversation
  const dmUsernames = new Set(
    dms.map((dm) => {
      const parts = dm.id.split(':');
      return parts[1] === username ? parts[2] : parts[1];
    })
  );

  // Online users who don't have an existing DM yet
  const newOnlineUsers = otherOnlineUsers.filter((u) => !dmUsernames.has(u.username));

  // Helper: get avatar for a DM partner
  function getDmPartnerAvatar(dmId: string): number {
    const parts = dmId.split(':');
    const partnerName = parts[1] === username ? parts[2] : parts[1];
    const found = onlineUsers.find((u) => u.username === partnerName);
    return found?.avatarId || 1;
  }

  function isDmPartnerOnline(dmId: string): boolean {
    const parts = dmId.split(':');
    const partnerName = parts[1] === username ? parts[2] : parts[1];
    return otherOnlineUsers.some((u) => u.username === partnerName);
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.brand}>Conversa</span>
        </h1>
        <button className={styles.themeToggle} onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>

      <div className={styles.scrollArea}>
        {/* Rooms */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Rooms</span>
            <button className={styles.addButton} onClick={() => setShowCreate(true)} title="Create room">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <div className={styles.list}>
            {rooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isActive={room.id === activeRoomId}
                unreadCount={unreadCounts[room.id] || 0}
                isAdmin={room.created_by === username}
                onClick={() => handleRoomClick(room.id)}
                onDelete={room.id !== 'general' && room.created_by === username ? () => handleDeleteRoom(room.id) : undefined}
              />
            ))}
          </div>
        </div>

        {/* Direct Messages */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Direct Messages</span>
          </div>

          <div className={styles.list}>
            {dms.map((dm) => (
              <DmItem
                key={dm.id}
                dm={dm}
                currentUser={username || ''}
                isActive={dm.id === activeRoomId}
                isOnline={isDmPartnerOnline(dm.id)}
                avatarId={getDmPartnerAvatar(dm.id)}
                unreadCount={unreadCounts[dm.id] || 0}
                onClick={() => handleDmClick(dm.id)}
              />
            ))}

            {newOnlineUsers.map((user) => (
              <button
                key={user.username}
                className={styles.onlineUserItem}
                onClick={() => handleStartDm(user.username)}
              >
                <div className={styles.onlineAvatarWrapper}>
                  <div className={styles.onlineAvatar}>
                    <Avatar avatarId={user.avatarId} size={28} />
                  </div>
                  <span className={styles.onlineDot} />
                </div>
                <span className={styles.onlineUserName}>{user.username}</span>
              </button>
            ))}

            {dms.length === 0 && newOnlineUsers.length === 0 && (
              <p className={styles.emptyText}>No users online yet</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.footerAvatar}>
            <Avatar avatarId={avatarId || 1} size={36} />
          </div>
          <div className={styles.userDetails}>
            <span className={styles.footerUsername}>{username}</span>
            <span className={styles.statusText}>Online</span>
          </div>
        </div>
        <button className={styles.logoutButton} onClick={clearUser} title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {showCreate && (
        <CreateRoomModal onClose={() => setShowCreate(false)} onCreate={handleCreateRoom} />
      )}
    </div>
  );
}
