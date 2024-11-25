import { Readable, Writable } from 'stream';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// Base Device Types
export interface Device {
  id: string;
  name: string;
  type: 'airplay' | 'pcm' | 'bluetooth' | 'void';
}

export interface DeviceList {
  inputs: Device[];
  outputs: Device[];
}

// PCM Types
export interface PCMDevice extends Device {
  type: 'pcm';
  input?: boolean;
  output?: boolean;
}

export interface PCMConnection {
  instance: ChildProcess | null;
  stdin: Writable | null;
  deviceId: string;
}

export interface PCMManager extends EventEmitter {
  setupDevice(deviceId: string, initialVolume?: number): Promise<PCMConnection>;
  setVolume(deviceId: string, volume: number): Promise<boolean>;
  getInputStream(deviceId: string): Writable | null;
  cleanup(deviceId: string): void;
  cleanupAll(): void;
  isActive(deviceId: string): boolean;
  getActiveDevices(): string[];
  getVolume(deviceId: string): number;
  scanDevices(): Promise<void>;
}

// AirPlay Types
export interface AirplayDevice extends Device {
  type: 'airplay';
  host: string;
  port: number;
}

export interface AirplayManager extends EventEmitter {
  setupDevice(deviceId: string, host: string, port: number, initialVolume?: number): Promise<any>;
  updateStreamToDevice(inputStream: Readable | null): void;
  setVolume(deviceId: string, volume: number): Promise<boolean>;
  cleanup(deviceId: string): void;
  cleanupAll(): void;
  isActive(deviceId: string): boolean;
  getActiveDevices(): string[];
  getVolume(deviceId: string): number;
}

// Bluetooth Types
export interface BluetoothDevice extends Device {
  type: 'bluetooth';
  address: string;
  profiles: string[];
}

export interface BluetoothManager extends EventEmitter {
  setupDevice(deviceId: string, address: string, initialVolume?: number): Promise<any>;
  setVolume(deviceId: string, volume: number): Promise<boolean>;
  getInputStream(deviceId: string): Writable | null;
  cleanup(deviceId: string): void;
  cleanupAll(): void;
  isActive(deviceId: string): boolean;
  getActiveDevices(): string[];
  getVolume(deviceId: string): number;
  scanDevices(): Promise<void>;
}

// Input Stream Types
export interface InputStreamManager {
  getCurrentInput(): string;
  getCurrentStream(): Readable;
  switchInput(deviceId: string): Readable;
  cleanup(): void;
}

// Device Managers Collection
export interface DeviceManagers {
  airplayManager: AirplayManager;
  pcmManager: PCMManager;
  inputManager: InputStreamManager;
  bluetoothManager: BluetoothManager;
}

// Configuration Types
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

export interface BluetoothConfig {
  defaultVolume: number;
  setupTimeout: number;
  reconnectAttempts: number;
  scanInterval: number;
  profiles: {
    output: string[];
    input: string[];
  };
  bitpool: {
    min: number;
    max: number;
  };
  codecs: string[];
  autoConnect: boolean;
  discoveryDuration: number;
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
  bluetooth: BluetoothConfig;
  discovery: {
    pcmScanInterval: number;
    mdnsType: string;
  };
}

// Volume Change Data Type
export interface VolumeChangeData {
  id: string;
  volume: number;
}