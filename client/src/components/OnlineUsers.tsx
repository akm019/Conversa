import { useState, useRef, useEffect } from 'react';
import { usePresence } from '../hooks/usePresence';
import Avatar from './Avatar';
import styles from './OnlineUsers.module.css';

interface Props {
  roomId: string;
}

export default function OnlineUsers({ roomId }: Props) {
  const { onlineUsers } = usePresence(roomId);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.toggle}
        onClick={() => setExpanded(!expanded)}
        title={`${onlineUsers.length} online`}
      >
        <span className={styles.dot} />
        <span className={styles.count}>{onlineUsers.length} online</span>
      </button>
      {expanded && onlineUsers.length > 0 && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>In this room</div>
          {onlineUsers.map((user) => (
            <div key={user.username} className={styles.user}>
              <div className={styles.userAvatar}>
                <Avatar avatarId={user.avatarId} size={24} />
              </div>
              <span className={styles.userName}>{user.username}</span>
              <span className={styles.userDot} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
