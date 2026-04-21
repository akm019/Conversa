import type { Message } from '../../types';
import styles from './SystemMessage.module.css';

interface Props {
  message: Message;
}

export default function SystemMessage({ message }: Props) {
  return (
    <div className={styles.container}>
      <span className={styles.text}>{message.content}</span>
    </div>
  );
}
