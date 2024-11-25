import { SocketProvider } from './components/SocketProvider';
import { EnhancedLayout } from './components/EnhancedLayout';

export default function App() {
  return (
    <SocketProvider url="http://localhost:3000">
      <EnhancedLayout />
    </SocketProvider>
  );
}