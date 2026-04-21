import styles from './TypingIndicator.module.css';

interface Props {
  users: string[];
}

export default function TypingIndicator({ users }: Props) {
  if (users.length === 0) return null;

  let text: string;
  if (users.length === 1) {
    text = `${users[0]} is typing`;
  } else if (users.length === 2) {
    text = `${users[0]} and ${users[1]} are typing`;
  } else {
    text = `${users[0]} and ${users.length - 1} others are typing`;
  }

  return (
    <div className={styles.container}>
      <div className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <span className={styles.text}>{text}</span>
    </div>
  );
}
