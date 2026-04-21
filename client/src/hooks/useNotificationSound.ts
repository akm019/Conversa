import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useUser } from '../context/UserContext';
import type { Message, Room } from '../types';

function playSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* Audio not available */ }
}

export function useNotificationSound() {
  const { socket } = useSocket();
  const { username } = useUser();
  const visRef = useRef(true);

  useEffect(() => {
    const fn = () => { visRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, []);

  useEffect(() => {
    if (!socket) return;
    function onMsg(msg: Message) { if (msg.username !== username && !visRef.current) playSound(); }
    function onDm(d: { dm: Room; message: Message }) { if (d.message.username !== username && !visRef.current) playSound(); }
    socket.on('new_message', onMsg);
    socket.on('dm_message', onDm);
    return () => { socket.off('new_message', onMsg); socket.off('dm_message', onDm); };
  }, [socket, username]);
}
