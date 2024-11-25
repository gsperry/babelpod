import { Readable, Writable } from 'stream';

export interface Device {
  id: string;
  name: string;
  type: 'airplay' | 'pcm' | 'void';
}

export interface AirplayDevice extends Device {
  type: 'airplay';
  host: string;
  port: number;
}

export interface PCMDevice extends Device {
  type: 'pcm';
  input?: boolean;
  output?: boolean;
}

export interface DeviceManagers {
  airplayManager: AirplayManager;
  pcmManager: PCMManager;
  inputManager: InputStreamManager;
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  format: string;
  chunkSize: number;
  bytesPerSample: number;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export interface Config {
  server: ServerConfig;
  audio: AudioConfig;
  airplay: {
    defaultVolume: number;
    setupTimeout: number;
    reconnectAttempts: number;
  };
  pcm: {
    defaultVolume: number;
    cardNumber: number;
    mixerControl: string;
  };
  discovery: {
    pcmScanInterval: number;
    mdnsType: string;
  };
}

export interface DeviceVolume {
  id: string;
  volume: number;
}

export interface DeviceList {
  inputs: Device[];
  outputs: Device[];
}

// Manager interfaces
export interface AirplayManager {
  setupDevice(deviceId: string, host: string, port: number, initialVolume?: number): Promise<any>;
  updateStreamToDevice(inputStream: Readable | null): void;
  setVolume(deviceId: string, volume: number): boolean;
  cleanup(deviceId: string): void;
  cleanupAll(): void;
  isActive(deviceId: string): boolean;
  getActiveDevices(): string[];
  getVolume(deviceId: string): number;
}

export interface PCMManager {
  setupDevice(deviceId: string, initialVolume?: number): Promise<any>;
  setVolume(deviceId: string, volume: number): boolean;
  getInputStream(deviceId: string): Writable | null;
  cleanup(deviceId: string): void;
  cleanupAll(): void;
  isActive(deviceId: string): boolean;
  getActiveDevices(): string[];
  getVolume(deviceId: string): number;
}

export interface InputStreamManager {
  getCurrentInput(): string;
  getCurrentStream(): Readable | null; // this one can still return null
  switchInput(deviceId: string): Readable; // remove the null here
  cleanup(): void;
}

export interface Device {
  id: string;
  name: string;
  type: 'airplay' | 'pcm' | 'void';
}

export interface VolumeChangeData {
  id: string;
  volume: number;
}
