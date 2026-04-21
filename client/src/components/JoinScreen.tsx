import { useState, type FormEvent } from 'react';
import { useUser, AVATAR_COUNT } from '../context/UserContext';
import styles from './JoinScreen.module.css';

const AVATARS = Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1);

export default function JoinScreen() {
  const { setUser } = useUser();
  const [input, setInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [error, setError] = useState('');

  const trimmed = input.trim();
  const canSubmit = trimmed.length > 0 && selectedAvatar !== null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) {
      setError('Please enter a username');
      return;
    }
    if (trimmed.length > 30) {
      setError('Username must be 30 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      setError('Letters, numbers, spaces, hyphens, and underscores only');
      return;
    }
    if (!selectedAvatar) {
      setError('Please choose an avatar');
      return;
    }
    setUser(trimmed, selectedAvatar);
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome to <span className={styles.brand}>Conversa</span></h1>
        <p className={styles.subtitle}>Pick an avatar and choose your name</p>

        <div className={styles.avatarGrid}>
          {AVATARS.map((id) => (
            <button
              key={id}
              type="button"
              className={`${styles.avatarOption} ${selectedAvatar === id ? styles.avatarSelected : ''}`}
              onClick={() => { setSelectedAvatar(id); setError(''); }}
            >
              <img
                src={`/avatars/avatar-${id}.jpg`}
                alt={`Avatar ${id}`}
                className={styles.avatarImg}
                draggable={false}
              />
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(''); }}
              placeholder="Enter your username"
              className={styles.input}
              autoFocus
              maxLength={30}
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button} disabled={!canSubmit}>
            <span>Join Chat</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>

        <p className={styles.hint}>No account needed — just pick a name</p>
      </div>
    </div>
  );
}
