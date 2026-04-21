import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../../context/UserContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../Avatar';
import ForwardModal from './ForwardModal';
import type { Message } from '../../types';
import styles from './MessageBubble.module.css';

interface Reaction { emoji: string; users: string[]; }

interface Props {
  message: Message;
  isDm?: boolean;
  onReply?: (msg: Message) => void;
  reactions?: Reaction[];
}

function formatTime(iso: string): string {
  return new Date(iso + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatExt(name: string): string {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
}

function StatusIcon({ status }: { status: string }) {
  const double = status === 'read' || status === 'delivered';
  const cls = status === 'read' ? styles.statusRead : status === 'delivered' ? styles.statusDelivered : styles.statusSent;
  return (
    <span className={cls}>
      {double ? (
        <svg width="16" height="10" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 7 5 11 13 3" /><polyline points="7 7 11 11 19 3" />
        </svg>
      ) : (
        <svg width="12" height="10" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 7 5 11 14 2" />
        </svg>
      )}
    </span>
  );
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function MessageBubble({ message, isDm, onReply, reactions = [] }: Props) {
  const { username } = useUser();
  const { socket } = useSocket();
  const isOwn = message.username === username;
  const isImage = message.file_type?.startsWith('image/');
  const isFile = !!message.file_url && !isImage;
  const hasText = message.content && !message.content.startsWith('Sent ');

  const [showMenu, setShowMenu] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (editing) editRef.current?.focus(); }, [editing]);

  // Close menu/picker on outside click
  useEffect(() => {
    if (!showMenu && !showReactPicker) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowReactPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu, showReactPicker]);

  function handleEdit() {
    setShowMenu(false);
    setEditText(message.content);
    setEditing(true);
  }
  function handleEditSave() {
    const t = editText.trim();
    if (!t || t === message.content) { setEditing(false); return; }
    socket?.emit('edit_message', { messageId: message.id, content: t });
    setEditing(false);
  }
  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleEditSave(); }
    if (e.key === 'Escape') setEditing(false);
  }
  function toggleReaction(emoji: string) {
    socket?.emit('toggle_reaction', { messageId: message.id, emoji });
    setShowReactPicker(false);
    setShowMenu(false);
  }
  function confirmDeleteYes() {
    socket?.emit('delete_message', { messageId: message.id });
    setConfirmDelete(false);
  }

  const hasReactions = reactions.length > 0;

  return (
    <div className={`${styles.wrapper} ${isOwn ? styles.own : ''} ${hasReactions ? styles.hasReactions : ''}`}>
      {!isOwn && (
        <div className={styles.avatar}>
          <Avatar avatarId={message.avatar_id} size={32} />
        </div>
      )}

      <div className={styles.bubbleCol}>
        <div className={styles.bubbleRow}>
          {/* Three-dot menu trigger — appears on hover, to the left for own, right for others */}
          {isOwn && !editing && (
            <div className={`${styles.menuAnchor} ${isOwn ? styles.menuAnchorOwn : ''}`} ref={isOwn ? menuRef : undefined}>
              <button className={styles.dotsBtn} onClick={() => { setShowMenu(!showMenu); setShowReactPicker(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {showMenu && (
                <div className={styles.dropdown}>
                  <button className={styles.dropItem} onClick={() => { setShowMenu(false); setShowReactPicker(true); }}>
                    <span>😀</span> React
                  </button>
                  <button className={styles.dropItem} onClick={() => { setShowMenu(false); onReply?.(message); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                    Reply
                  </button>
                  <button className={styles.dropItem} onClick={() => { setShowMenu(false); setShowForward(true); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
                    Forward
                  </button>
                  {!message.file_url && (
                    <button className={styles.dropItem} onClick={handleEdit}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      Edit
                    </button>
                  )}
                  <button className={`${styles.dropItem} ${styles.dropItemDanger}`} onClick={() => { setShowMenu(false); setConfirmDelete(true); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    Delete
                  </button>
                </div>
              )}
              {showReactPicker && (
                <div className={styles.reactPicker}>
                  {QUICK_EMOJIS.map((e) => (
                    <button key={e} className={styles.reactEmoji} onClick={() => toggleReaction(e)}>{e}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther} ${isImage ? styles.bubbleWithImage : ''}`}>
            {!!message.forwarded && (
              <span className={styles.forwardedLabel}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
                Forwarded
              </span>
            )}
            {message.reply_to_id && message.reply_to_username && (
              <div className={styles.replyQuote}>
                <span className={styles.replyAuthor}>{message.reply_to_username}</span>
                <span className={styles.replyText}>{message.reply_to_content?.slice(0, 80) || 'Message'}</span>
              </div>
            )}
            {!isOwn && <span className={styles.username}>{message.username}</span>}

            {isImage && message.file_url && (
              <a href={message.file_url} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
                <img src={message.file_url} alt={message.file_name || 'image'} className={styles.image} loading="lazy" />
              </a>
            )}
            {isFile && message.file_url && (
              <a href={message.file_url} download={message.file_name || true} className={styles.fileCard}>
                <div className={styles.fileIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
                <div className={styles.fileInfo}><span className={styles.fileName}>{message.file_name}</span><span className={styles.fileExt}>{formatExt(message.file_name || 'file')}</span></div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.downloadIcon}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </a>
            )}

            {editing ? (
              <div className={styles.editRow}>
                <input ref={editRef} className={styles.editInput} value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={handleEditKeyDown} onBlur={handleEditSave} maxLength={2000} />
              </div>
            ) : (
              hasText && <span className={styles.content}>{message.content}</span>
            )}

            <span className={styles.timeRow}>
              <span className={styles.time}>{formatTime(message.created_at)}</span>
              {isOwn && isDm && <StatusIcon status={message.status || 'sent'} />}
            </span>
          </div>

          {/* Three-dot for other's messages */}
          {!isOwn && !editing && (
            <div className={`${styles.menuAnchor} ${isOwn ? styles.menuAnchorOwn : ''}`} ref={!isOwn ? menuRef : undefined}>
              <button className={styles.dotsBtn} onClick={() => { setShowMenu(!showMenu); setShowReactPicker(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {showMenu && (
                <div className={styles.dropdown}>
                  <button className={styles.dropItem} onClick={() => { setShowMenu(false); setShowReactPicker(true); }}>
                    <span>😀</span> React
                  </button>
                  <button className={styles.dropItem} onClick={() => { setShowMenu(false); onReply?.(message); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                    Reply
                  </button>
                  <button className={styles.dropItem} onClick={() => { setShowMenu(false); setShowForward(true); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
                    Forward
                  </button>
                </div>
              )}
              {showReactPicker && (
                <div className={styles.reactPicker}>
                  {QUICK_EMOJIS.map((e) => (
                    <button key={e} className={styles.reactEmoji} onClick={() => toggleReaction(e)}>{e}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reactions — tight below bubble */}
        {hasReactions && (
          <div className={`${styles.reactionsRow} ${isOwn ? styles.reactionsOwn : ''}`}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                className={`${styles.reactionBadge} ${r.users.includes(username || '') ? styles.reactionMine : ''}`}
                onClick={() => toggleReaction(r.emoji)}
                title={r.users.join(', ')}
              >
                <span>{r.emoji}</span>
                <span className={styles.reactionCount}>{r.users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && createPortal(
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <span className={styles.confirmText}>Delete this message?</span>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className={styles.confirmYes} onClick={confirmDeleteYes}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showForward && createPortal(
        <ForwardModal message={message} onClose={() => setShowForward(false)} />,
        document.body
      )}
    </div>
  );
}
