import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useUser } from '../../context/UserContext';
import Avatar from '../Avatar';
import type { Room, Message, OnlineUser } from '../../types';
import styles from './ForwardModal.module.css';

interface Props {
  message: Message;
  onClose: () => void;
}

interface Target {
  id: string;
  label: string;
  type: 'room' | 'dm';
  avatarId?: number;
  dmUser?: string;
}

export default function ForwardModal({ message, onClose }: Props) {
  const { socket } = useSocket();
  const { username } = useUser();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dms, setDms] = useState<Room[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'select' | 'confirm' | 'done'>('select');

  useEffect(() => {
    if (!username) return;
    fetch(`/api/rooms?username=${encodeURIComponent(username)}`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setRooms(data);
    });
    fetch(`/api/dm?username=${encodeURIComponent(username)}`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setDms(data);
    });
  }, [username]);

  useEffect(() => {
    if (!socket) return;
    function onGlobal(data: { users: OnlineUser[] }) { setOnlineUsers(data.users); }
    socket.on('global_online_users', onGlobal);
    socket.emit('get_online_users');
    return () => { socket.off('global_online_users', onGlobal); };
  }, [socket]);

  function getDmPartner(dm: Room): string {
    const parts = dm.id.split(':');
    return parts[1] === username ? parts[2] : parts[1];
  }

  function getPartnerAvatar(name: string): number {
    return onlineUsers.find((u) => u.username === name)?.avatarId || 1;
  }

  // Build target list
  const dmPartners = new Set(dms.map(getDmPartner));
  const otherUsers = onlineUsers.filter((u) => u.username !== username && !dmPartners.has(u.username));

  const targets: Target[] = [
    ...rooms.map((r): Target => ({ id: r.id, label: r.name, type: 'room' })),
    ...dms.map((dm): Target => {
      const partner = getDmPartner(dm);
      return { id: dm.id, label: partner, type: 'dm', avatarId: getPartnerAvatar(partner), dmUser: partner };
    }),
    ...otherUsers.map((u): Target => ({
      id: `new-dm:${u.username}`, label: u.username, type: 'dm', avatarId: u.avatarId, dmUser: u.username,
    })),
  ];

  function toggleTarget(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleForward() {
    if (!socket) return;

    for (const id of selected) {
      const target = targets.find((t) => t.id === id);
      if (!target) continue;

      const payload = {
        content: message.content,
        fileUrl: message.file_url || undefined,
        fileType: message.file_type || undefined,
        fileName: message.file_name || undefined,
        forwarded: true,
      };

      if (target.type === 'room') {
        socket.emit('send_message', { ...payload, roomId: target.id });
      } else if (target.dmUser) {
        socket.emit('send_dm', { ...payload, to: target.dmUser });
      }
    }

    setStep('done');
    setTimeout(onClose, 800);
  }

  const selectedTargets = targets.filter((t) => selected.has(t.id));
  const roomTargets = targets.filter((t) => t.type === 'room');
  const peopleTargets = targets.filter((t) => t.type === 'dm');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {step === 'select' && (
          <>
            <h3 className={styles.title}>Forward to</h3>
            <p className={styles.preview}>
              {message.file_name ? `[File] ${message.file_name}` : message.content.slice(0, 100)}
              {message.content.length > 100 && !message.file_name ? '...' : ''}
            </p>

            {roomTargets.length > 0 && (
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Rooms</span>
                {roomTargets.map((t) => (
                  <label key={t.id} className={styles.item}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selected.has(t.id)}
                      onChange={() => toggleTarget(t.id)}
                    />
                    <span className={styles.hash}>#</span>
                    <span className={styles.itemName}>{t.label}</span>
                  </label>
                ))}
              </div>
            )}

            {peopleTargets.length > 0 && (
              <div className={styles.section}>
                <span className={styles.sectionLabel}>People</span>
                {peopleTargets.map((t) => (
                  <label key={t.id} className={styles.item}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selected.has(t.id)}
                      onChange={() => toggleTarget(t.id)}
                    />
                    <div className={styles.itemAvatar}>
                      <Avatar avatarId={t.avatarId || 1} size={24} />
                    </div>
                    <span className={styles.itemName}>{t.label}</span>
                  </label>
                ))}
              </div>
            )}

            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                className={styles.nextBtn}
                disabled={selected.size === 0}
                onClick={() => setStep('confirm')}
              >
                Next ({selected.size})
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h3 className={styles.title}>Confirm forward</h3>
            <p className={styles.confirmText}>
              Send this message to {selectedTargets.length} {selectedTargets.length === 1 ? 'recipient' : 'recipients'}?
            </p>
            <div className={styles.selectedList}>
              {selectedTargets.map((t) => (
                <span key={t.id} className={styles.selectedTag}>
                  {t.type === 'room' ? `# ${t.label}` : t.label}
                </span>
              ))}
            </div>
            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={() => setStep('select')}>Back</button>
              <button className={styles.forwardBtn} onClick={handleForward}>Forward</button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className={styles.doneState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-online)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Forwarded!</span>
          </div>
        )}
      </div>
    </div>
  );
}
