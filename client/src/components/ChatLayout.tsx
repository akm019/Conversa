import { useState, useCallback, useEffect } from 'react';
import type { Message } from '../types';
import { useSocket } from '../context/SocketContext';
import { useUser } from '../context/UserContext';
import { useUnread } from '../hooks/useUnread';
import { useRooms } from '../hooks/useRooms';
import { useGlobalPresence } from '../hooks/useGlobalPresence';
import Avatar from './Avatar';
import Sidebar from './Sidebar/Sidebar';
import MessageArea from './MessageArea/MessageArea';
import MessageInput from './MessageInput';
import OnlineUsers from './OnlineUsers';
import OnlineAvatars from './OnlineAvatars';
import InviteModal from './InviteModal';
import ConnectionStatus from './ConnectionStatus';
import { useNotificationSound } from '../hooks/useNotificationSound';
import styles from './ChatLayout.module.css';

function getDmOtherUser(roomId: string, currentUser: string): string {
  const parts = roomId.split(':');
  if (parts[1] === currentUser) return parts[2];
  return parts[1];
}

export default function ChatLayout() {
  useNotificationSound();
  const { socket, isConnected } = useSocket();
  const { username } = useUser();
  const [activeRoomId, setActiveRoomId] = useState('general');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const { unreadCounts, clearUnread } = useUnread(activeRoomId);
  const { onlineUsers } = useGlobalPresence();
  const { rooms, createRoom, deleteRoomById, inviteToRoom, invite, dismissInvite } = useRooms();

  const isDm = activeRoomId.startsWith('dm:');
  const dmPartnerName = isDm ? getDmOtherUser(activeRoomId, username || '') : '';
  const dmPartnerAvatar = onlineUsers.find((u) => u.username === dmPartnerName)?.avatarId || 1;

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const isPrivateRoom = activeRoom?.is_private === 1;
  const isRoomAdmin = activeRoom?.created_by === username;

  useEffect(() => {
    if (socket && isConnected && !isDm) {
      socket.emit('join_room', { roomId: activeRoomId });
    }
  }, [socket, isConnected, activeRoomId, isDm]);

  const handleRoomSelect = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
    clearUnread(roomId);
    setSidebarOpen(false);
    setReplyTo(null);
  }, [clearUnread]);

  return (
    <div className={styles.layout}>
      <ConnectionStatus />

      {invite && (
        <div className={styles.inviteToast}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className={styles.inviteText}>
            <strong>{invite.invitedBy}</strong> invited you to <strong>#{invite.room.name}</strong>
          </span>
          <button
            className={styles.inviteJoinBtn}
            onClick={() => {
              handleRoomSelect(invite.room.id);
              dismissInvite();
            }}
          >
            Join
          </button>
          <button className={styles.inviteDismissBtn} onClick={dismissInvite}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className={styles.main}>
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <Sidebar activeRoomId={activeRoomId} onRoomSelect={handleRoomSelect} unreadCounts={unreadCounts} rooms={rooms} createRoom={createRoom} deleteRoomById={deleteRoomById} />
        </div>
        {sidebarOpen && (
          <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}
        <div className={styles.chatArea}>
          <div className={styles.chatHeader}>
            <button
              className={styles.menuButton}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {isDm ? (
              <div className={styles.headerInfo}>
                <div className={styles.dmAvatar}>
                  <Avatar avatarId={dmPartnerAvatar} size={34} />
                </div>
                <div className={styles.headerText}>
                  <h2 className={styles.roomTitle}>{dmPartnerName}</h2>
                  <span className={styles.headerSubtitle}>Direct Message</span>
                </div>
              </div>
            ) : (
              <div className={styles.headerInfo}>
                <h2 className={styles.roomTitle}>
                  {isPrivateRoom ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, opacity: 0.5 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : '# '}
                  {activeRoom?.name || activeRoomId}
                </h2>
              </div>
            )}
            <div className={styles.headerActions}>
              {!isDm && <OnlineAvatars roomId={activeRoomId} />}
              {!isDm && isPrivateRoom && isRoomAdmin && (
                <button className={styles.inviteBtn} onClick={() => setShowInvite(true)} title="Invite members">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Invite
                </button>
              )}
              {!isDm && <OnlineUsers roomId={activeRoomId} />}
            </div>
          </div>
          <MessageArea roomId={activeRoomId} isDm={isDm} dmRecipient={isDm ? dmPartnerName : undefined} onReply={setReplyTo} />
          <MessageInput roomId={activeRoomId} isDm={isDm} dmRecipient={isDm ? dmPartnerName : undefined} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
        </div>
      </div>

      {showInvite && activeRoom && (
        <InviteModal
          roomId={activeRoomId}
          roomName={activeRoom.name}
          onInvite={inviteToRoom}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
