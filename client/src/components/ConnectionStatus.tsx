import { useSocket } from '../context/SocketContext';
import styles from './ConnectionStatus.module.css';

export default function ConnectionStatus() {
  const { isConnected } = useSocket();

  if (isConnected) return null;

  return (
    <div className={styles.banner}>
      <span className={styles.spinner} />
      Reconnecting...
    </div>
  );
}
