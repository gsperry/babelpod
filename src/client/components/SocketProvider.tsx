import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import socketIO from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { Device, VolumeChangeData } from '../../types';

interface SocketContextType {
  socket: ReturnType<typeof socketIO> | null;
  isConnected: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null,
});

interface SocketProviderProps {
  children: ReactNode;
  url: string;
}

export function SocketProvider({ children, url }: SocketProviderProps) {
  const [socket] = useState(() => socketIO(url, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
  }));
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setError(null);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onError(err: Error) {
      setIsConnected(false);
      setError(err.message);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hooks to use the socket
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function useDevices() {
  const { socket } = useSocket();
  const [inputs, setInputs] = useState<Device[]>([]);
  const [outputs, setOutputs] = useState<Device[]>([]);

  useEffect(() => {
    if (!socket) return;

    function onInputsUpdate(newInputs: Device[]) {
      setInputs(newInputs);
    }

    function onOutputsUpdate(newOutputs: Device[]) {
      setOutputs(newOutputs);
    }

    socket.on('available_inputs', onInputsUpdate);
    socket.on('available_outputs', onOutputsUpdate);

    return () => {
      socket.off('available_inputs', onInputsUpdate);
      socket.off('available_outputs', onOutputsUpdate);
    };
  }, [socket]);

  return { inputs, outputs };
}

export function useDeviceControl() {
  const { socket } = useSocket();
  const [selectedInput, setSelectedInput] = useState<string>('void');
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(['void']);
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!socket) return;

    function onInputSwitch(deviceId: string) {
      setSelectedInput(deviceId);
    }

    function onOutputsSwitch(deviceIds: string[]) {
      setSelectedOutputs(deviceIds);
    }

    function onVolumeChange({ id, volume }: VolumeChangeData) {
      setVolumes(prev => ({ ...prev, [id]: volume }));
    }

    socket.on('switched_input', onInputSwitch);
    socket.on('switched_outputs', onOutputsSwitch);
    socket.on('changed_output_volume', onVolumeChange);

    return () => {
      socket.off('switched_input', onInputSwitch);
      socket.off('switched_outputs', onOutputsSwitch);
      socket.off('changed_output_volume', onVolumeChange);
    };
  }, [socket]);

  const switchInput = (deviceId: string) => {
    socket?.emit('switch_input', deviceId);
  };

  const switchOutputs = (outputs: string[]) => {
    socket?.emit('switch_outputs', outputs);
  };

  const changeVolume = (deviceId: string, volume: number) => {
    socket?.emit('change_output_volume', { id: deviceId, volume });
  };

  return {
    selectedInput,
    selectedOutputs,
    volumes,
    switchInput,
    switchOutputs,
    changeVolume,
  };
}