import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export const AVATAR_COUNT = 5;

interface UserContextValue {
  username: string | null;
  avatarId: number | null;
  setUser: (name: string, avatarId: number) => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(
    () => sessionStorage.getItem('chat_username')
  );
  const [avatarId, setAvatarId] = useState<number | null>(
    () => {
      const stored = sessionStorage.getItem('chat_avatar');
      return stored ? parseInt(stored, 10) : null;
    }
  );

  const setUser = useCallback((name: string, avatar: number) => {
    sessionStorage.setItem('chat_username', name);
    sessionStorage.setItem('chat_avatar', String(avatar));
    setUsername(name);
    setAvatarId(avatar);
  }, []);

  const clearUser = useCallback(() => {
    sessionStorage.removeItem('chat_username');
    sessionStorage.removeItem('chat_avatar');
    setUsername(null);
    setAvatarId(null);
  }, []);

  return (
    <UserContext.Provider value={{ username, avatarId, setUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
