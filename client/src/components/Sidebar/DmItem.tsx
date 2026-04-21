import type { Room } from '../../types';
import Avatar from '../Avatar';
import styles from './DmItem.module.css';

interface Props {
  dm: Room;
  currentUser: string;
  isActive: boolean;
  isOnline: boolean;
  avatarId: number;
  unreadCount: number;
  onClick: () => void;
}

function getOtherUser(dm: Room, currentUser: string): string {
  const parts = dm.id.split(':');
  if (parts[1] === currentUser) return parts[2];
  return parts[1];
}

export default function DmItem({ dm, currentUser, isActive, isOnline, avatarId, unreadCount, onClick }: Props) {
  const otherUser = getOtherUser(dm, currentUser);

  return (
    <button
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatarWrapper}>
        <div className={styles.avatar}>
          <Avatar avatarId={avatarId} size={28} />
        </div>
        {isOnline && <span className={styles.statusDot} />}
      </div>
      <span className={styles.name}>{otherUser}</span>
      {unreadCount > 0 && !isActive && (
        <span className={styles.badge}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
