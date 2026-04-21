import { useState, type FormEvent } from 'react';
import styles from './CreateRoomModal.module.css';

interface Props {
  onClose: () => void;
  onCreate: (name: string, isPrivate: boolean) => Promise<void>;
}

export default function CreateRoomModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Room name is required'); return; }

    setIsCreating(true);
    setError('');
    try {
      await onCreate(trimmed, isPrivate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsCreating(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Create a Room</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Room name"
            className={styles.input}
            autoFocus
            maxLength={50}
          />

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className={styles.checkbox}
            />
            <div className={styles.toggleTrack}>
              <div className={styles.toggleThumb} />
            </div>
            <div className={styles.toggleText}>
              <span className={styles.toggleLabel}>Private room</span>
              <span className={styles.toggleHint}>Only invited members can see and join</span>
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.createButton} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
