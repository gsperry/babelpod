export interface Device {
    id: string;
    name: string;
    type: 'airplay' | 'pcm' | 'void';
  }
  
  export interface VolumeChangeData {
    id: string;
    volume: number;
  }
  
  export interface AudioPreset {
    name: string;
    outputs: string[];
    volumes: Record<string, number>;
  }
  
  export interface DeviceGroup {
    type: string;
    devices: Device[];
  }
  
  export interface SocketError extends Error {
    message: string;
    data?: any;
  }