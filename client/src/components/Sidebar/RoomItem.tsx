import type { Room } from '../../types';
import styles from './RoomItem.module.css';

interface Props {
  room: Room;
  isActive: boolean;
  unreadCount: number;
  isAdmin: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export default function RoomItem({ room, isActive, unreadCount, isAdmin, onClick, onDelete }: Props) {
  return (
    <button
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <span className={styles.hash}>
        {room.is_private ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : '#'}
      </span>
      <span className={styles.name}>{room.name}</span>
      {unreadCount > 0 && !isActive && (
        <span className={styles.badge}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {onDelete && (
        <span
          className={styles.deleteBtn}
          role="button"
          title="Delete room"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      )}
    </button>
  );
}
