import styles from './DateDivider.module.css';

interface Props {
  date: string;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString + 'Z');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DateDivider({ date }: Props) {
  return (
    <div className={styles.divider}>
      <div className={styles.line} />
      <span className={styles.label}>{formatDate(date)}</span>
      <div className={styles.line} />
    </div>
  );
}
