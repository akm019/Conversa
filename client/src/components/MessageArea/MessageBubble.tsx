import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../Avatar';
import ForwardModal from './ForwardModal';
import type { Message } from '../../types';
import styles from './MessageBubble.module.css';

interface Props {
  message: Message;
  isDm?: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString + 'Z');
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(name: string): string {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'read') {
    return (
      <span className={styles.statusRead} title="Read">
        <svg width="16" height="10" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 7 5 11 13 3" />
          <polyline points="7 7 11 11 19 3" />
        </svg>
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className={styles.statusDelivered} title="Delivered">
        <svg width="16" height="10" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 7 5 11 13 3" />
          <polyline points="7 7 11 11 19 3" />
        </svg>
      </span>
    );
  }
  return (
    <span className={styles.statusSent} title="Sent">
      <svg width="12" height="10" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 7 5 11 14 2" />
      </svg>
    </span>
  );
}

export default function MessageBubble({ message, isDm }: Props) {
  const { username } = useUser();
  const { socket } = useSocket();
  const isOwn = message.username === username;
  const isImage = message.file_type?.startsWith('image/');
  const isFile = !!message.file_url && !isImage;
  const hasText = message.content && !message.content.startsWith('Sent ');

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  function handleEdit() {
    setEditText(message.content);
    setEditing(true);
  }

  function handleEditSave() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    socket?.emit('edit_message', { messageId: message.id, content: trimmed });
    setEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleEditSave(); }
    if (e.key === 'Escape') setEditing(false);
  }

  function confirmDeleteYes() {
    socket?.emit('delete_message', { messageId: message.id });
    setConfirmDelete(false);
  }

  const actionButtons = (
    <div className={styles.actions}>
      <button className={styles.actionBtn} onClick={() => setShowForward(true)} title="Forward">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 17 20 12 15 7" />
          <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
        </svg>
      </button>
      {isOwn && !message.file_url && (
        <button className={styles.actionBtn} onClick={handleEdit} title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
      {isOwn && (
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setConfirmDelete(true)} title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <div className={`${styles.wrapper} ${isOwn ? styles.own : ''}`}>
      {!isOwn && (
        <div className={styles.avatar}>
          <Avatar avatarId={message.avatar_id} size={32} />
        </div>
      )}

      {/* For own messages: actions on the LEFT of the bubble */}
      {isOwn && !editing && actionButtons}

      <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther} ${isImage ? styles.bubbleWithImage : ''}`}>
        {!!message.forwarded && (
          <span className={styles.forwardedLabel}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 17 20 12 15 7" />
              <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
            </svg>
            Forwarded
          </span>
        )}
        {!isOwn && <span className={styles.username}>{message.username}</span>}

        {isImage && message.file_url && (
          <a href={message.file_url} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
            <img src={message.file_url} alt={message.file_name || 'image'} className={styles.image} loading="lazy" />
          </a>
        )}

        {isFile && message.file_url && (
          <a href={message.file_url} download={message.file_name || true} className={styles.fileCard}>
            <div className={styles.fileIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{message.file_name}</span>
              <span className={styles.fileExt}>{formatFileSize(message.file_name || 'file')}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.downloadIcon}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        )}

        {editing ? (
          <div className={styles.editRow}>
            <input
              ref={editRef}
              className={styles.editInput}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleEditSave}
              maxLength={2000}
            />
          </div>
        ) : (
          hasText && <span className={styles.content}>{message.content}</span>
        )}

        <span className={styles.timeRow}>
          <span className={styles.time}>{formatTime(message.created_at)}</span>
          {isOwn && isDm && <StatusIcon status={message.status || 'sent'} />}
        </span>
      </div>

      {/* For other's messages: actions on the RIGHT of the bubble */}
      {!isOwn && !editing && actionButtons}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <span className={styles.confirmText}>Delete this message?</span>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className={styles.confirmYes} onClick={confirmDeleteYes}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForward && (
        <ForwardModal message={message} onClose={() => setShowForward(false)} />
      )}
    </div>
  );
}
