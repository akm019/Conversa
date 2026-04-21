import { useEffect, useRef, useCallback } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { useTyping } from '../../hooks/useTyping';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import DateDivider from './DateDivider';
import TypingIndicator from './TypingIndicator';
import styles from './MessageArea.module.css';

interface Props {
  roomId: string;
  isDm?: boolean;
  dmRecipient?: string;
}

export default function MessageArea({ roomId, isDm, dmRecipient }: Props) {
  const { messages, hasMore, isLoading, loadMore } = useMessages(roomId);
  const { typingUsers } = useTyping(roomId, { isDm, dmRecipient });
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    isNearBottomRef.current = true;
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView();
    }, 50);
    return () => clearTimeout(timer);
  }, [roomId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true;
          const el = containerRef.current;
          if (el) prevScrollHeightRef.current = el.scrollHeight;
          loadMore().finally(() => {
            isLoadingMoreRef.current = false;
          });
        }
      },
      { root: containerRef.current, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  useEffect(() => {
    if (prevScrollHeightRef.current > 0) {
      const el = containerRef.current;
      if (el) {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeightRef.current;
        prevScrollHeightRef.current = 0;
      }
    }
  }, [messages]);

  let lastDate = '';

  return (
    <div className={styles.container} ref={containerRef} onScroll={handleScroll}>
      <div ref={sentinelRef} className={styles.sentinel} />

      {isLoading && messages.length === 0 && (
        <div className={styles.loading}>Loading messages...</div>
      )}

      {!isLoading && messages.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p>No messages yet</p>
          <p className={styles.emptyHint}>Be the first to say hello!</p>
        </div>
      )}

      {messages.map((msg) => {
        const msgDate = new Date(msg.created_at + 'Z').toLocaleDateString();
        const showDate = msgDate !== lastDate;
        lastDate = msgDate;

        return (
          <div key={msg.id}>
            {showDate && <DateDivider date={msg.created_at} />}
            {msg.type === 'system' ? (
              <SystemMessage message={msg} />
            ) : (
              <MessageBubble message={msg} isDm={isDm} />
            )}
          </div>
        );
      })}

      <TypingIndicator users={typingUsers} />
      <div ref={bottomRef} />
    </div>
  );
}
