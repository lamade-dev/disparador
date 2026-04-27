import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const user = useAuthStore.getState().user;
    socket = io(import.meta.env.VITE_API_URL ?? 'https://disparador-disparador.kj2jgf.easypanel.host', {
      auth: { userId: user?.id },
      transports: ['websocket'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
