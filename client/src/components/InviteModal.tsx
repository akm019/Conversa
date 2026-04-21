import { useState } from 'react';
import { useGlobalPresence } from '../hooks/useGlobalPresence';
import { useUser } from '../context/UserContext';
import Avatar from './Avatar';
import styles from './InviteModal.module.css';

interface Props {
  roomId: string;
  roomName: string;
  onInvite: (roomId: string, username: string) => Promise<void>;
  onClose: () => void;
}

export default function InviteModal({ roomId, roomName, onInvite, onClose }: Props) {
  const { onlineUsers } = useGlobalPresence();
  const { username } = useUser();
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  const others = onlineUsers.filter((u) => u.username !== username);

  async function handleInvite(user: string) {
    setLoading(user);
    try {
      await onInvite(roomId, user);
      setInvited((prev) => new Set(prev).add(user));
    } catch {
      // could show error
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Invite to #{roomName}</h3>
        <p className={styles.subtitle}>Select users to add to this private room</p>

        <div className={styles.list}>
          {others.length === 0 && (
            <p className={styles.empty}>No other users online</p>
          )}
          {others.map((user) => (
            <div key={user.username} className={styles.userRow}>
              <div className={styles.userAvatar}>
                <Avatar avatarId={user.avatarId} size={28} />
              </div>
              <span className={styles.userName}>{user.username}</span>
              {invited.has(user.username) ? (
                <span className={styles.invitedBadge}>Invited</span>
              ) : (
                <button
                  className={styles.inviteBtn}
                  onClick={() => handleInvite(user.username)}
                  disabled={loading === user.username}
                >
                  {loading === user.username ? '...' : 'Invite'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
