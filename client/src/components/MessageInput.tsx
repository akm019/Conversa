import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ChangeEvent } from 'react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import { useSocket } from '../context/SocketContext';
import { useTyping } from '../hooks/useTyping';
import type { Message } from '../types';
import styles from './MessageInput.module.css';

interface Props {
  roomId: string;
  isDm?: boolean;
  dmRecipient?: string;
  replyTo?: Message | null;
  onClearReply?: () => void;
}

export default function MessageInput({ roomId, isDm, dmRecipient, replyTo, onClearReply }: Props) {
  const { socket } = useSocket();
  const { handleInputChange, stopTyping } = useTyping(roomId, { isDm, dmRecipient });
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ name: string; type: string; url: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (preview?.url.startsWith('blob:')) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmoji]);

  function onEmojiClick(emojiData: EmojiClickData) {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  }

  function send() {
    const trimmed = text.trim();
    if ((!trimmed && !preview) || !socket) return;

    if (preview) {
      uploadAndSend(trimmed);
    } else {
      const replyToId = replyTo?.id || undefined;
      if (isDm && dmRecipient) {
        socket.emit('send_dm', { to: dmRecipient, content: trimmed, replyToId });
      } else {
        socket.emit('send_message', { roomId, content: trimmed, replyToId });
      }
      setText('');
      stopTyping();
      setShowEmoji(false);
      onClearReply?.();
      inputRef.current?.focus();
    }
  }

  async function uploadAndSend(caption: string) {
    if (!preview || !socket) return;

    setUploading(true);
    try {
      const res = await fetch(preview.url);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('file', blob, preview.name);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { fileUrl, fileType, fileName } = await uploadRes.json();

      const replyToId = replyTo?.id || undefined;
      if (isDm && dmRecipient) {
        socket.emit('send_dm', { to: dmRecipient, content: caption, fileUrl, fileType, fileName, replyToId });
      } else {
        socket.emit('send_message', { roomId, content: caption, fileUrl, fileType, fileName, replyToId });
      }

      setText('');
      clearPreview();
      stopTyping();
      setShowEmoji(false);
      onClearReply?.();
      inputRef.current?.focus();
    } catch {
      // Could show error toast
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File must be under 10MB');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview({ name: file.name, type: file.type, url });
    e.target.value = '';
  }

  function clearPreview() {
    if (preview?.url.startsWith('blob:')) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isImage = preview?.type.startsWith('image/');

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {replyTo && (
        <div className={styles.replyBar}>
          <div className={styles.replyContent}>
            <span className={styles.replyLabel}>Replying to <strong>{replyTo.username}</strong></span>
            <span className={styles.replyPreview}>{replyTo.content.slice(0, 100)}</span>
          </div>
          <button type="button" className={styles.replyClose} onClick={onClearReply}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      {preview && (
        <div className={styles.previewBar}>
          {isImage ? (
            <img src={preview.url} alt="preview" className={styles.previewImage} />
          ) : (
            <div className={styles.previewFile}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className={styles.previewName}>{preview.name}</span>
            </div>
          )}
          <button type="button" className={styles.previewRemove} onClick={clearPreview}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Emoji picker */}
      <div className={styles.emojiWrapper} ref={emojiRef}>
        {showEmoji && (
          <div className={styles.emojiPicker}>
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={Theme.DARK}
              width="100%"
              height={350}
              searchPlaceholder="Search emoji..."
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
      </div>

      <div className={styles.inputContainer}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => fileRef.current?.click()}
          title="Attach file"
          disabled={uploading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <button
          type="button"
          className={`${styles.iconBtn} ${showEmoji ? styles.iconBtnActive : ''}`}
          onClick={() => setShowEmoji(!showEmoji)}
          title="Emoji"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>

        <input
          ref={fileRef}
          type="file"
          className={styles.fileInput}
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.mp4,.webm,.mp3,.wav,.ogg"
        />

        <textarea
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleInputChange();
          }}
          onKeyDown={handleKeyDown}
          placeholder={isDm ? `Message ${dmRecipient}...` : `Message #${roomId}...`}
          rows={1}
          maxLength={2000}
        />

        <button
          type="submit"
          className={styles.sendButton}
          disabled={(!text.trim() && !preview) || uploading}
          aria-label="Send message"
        >
          {uploading ? (
            <span className={styles.spinner} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
