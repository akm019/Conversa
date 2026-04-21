import styles from './Avatar.module.css';

interface Props {
  avatarId: number;
  size?: number;
  className?: string;
}

export default function Avatar({ avatarId, size = 32, className }: Props) {
  const id = avatarId >= 1 && avatarId <= 5 ? avatarId : 1;

  return (
    <img
      src={`/avatars/avatar-${id}.jpg`}
      alt="avatar"
      width={size}
      height={size}
      className={`${styles.avatar} ${className || ''}`}
      draggable={false}
    />
  );
}
