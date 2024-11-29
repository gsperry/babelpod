import { SocketProvider } from './components/SocketProvider';
import { AudioTouchUI } from './components/AudioTouchUI';

export default function App() {
  // Use VITE_ prefix for Vite, or REACT_APP_ for Create React App
  const socketUrl = window.location.hostname === 'localhost' 
    ? import.meta.env.VITE_DEV_SERVER_URL || 'http://localhost:3000'
    : window.location.origin;

  return (
    <SocketProvider url={socketUrl}>
      <AudioTouchUI />
    </SocketProvider>
  );
}