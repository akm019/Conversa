import { UserProvider, useUser } from './context/UserContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import JoinScreen from './components/JoinScreen';
import ChatLayout from './components/ChatLayout';

function AppContent() {
  const { username, avatarId } = useUser();

  if (!username || !avatarId) {
    return <JoinScreen />;
  }

  return (
    <SocketProvider username={username} avatarId={avatarId}>
      <ChatLayout />
    </SocketProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
}
