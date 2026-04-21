import { usePresence } from '../hooks/usePresence';
import Avatar from './Avatar';
import styles from './OnlineAvatars.module.css';

interface Props {
  roomId: string;
}

export default function OnlineAvatars({ roomId }: Props) {
  const { onlineUsers } = usePresence(roomId);

  if (onlineUsers.length === 0) return null;

  const visible = onlineUsers.slice(0, 6);
  const extra = onlineUsers.length - visible.length;

  return (
    <div className={styles.stack}>
      {visible.map((user, i) => (
        <div
          key={user.username}
          className={styles.avatarWrap}
          style={{ zIndex: visible.length - i }}
          title={user.username}
        >
          <Avatar avatarId={user.avatarId} size={26} />
        </div>
      ))}
      {extra > 0 && (
        <div className={styles.extra} title={`${extra} more`}>+{extra}</div>
      )}
    </div>
  );
}
