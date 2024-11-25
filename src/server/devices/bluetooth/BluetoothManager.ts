import { EventEmitter } from 'events';
import { BluetoothManager as IBluetoothManager } from '../../../types';
import { Writable } from 'stream';
import debugModule from 'debug';
import { config } from '../../config';

const logger = debugModule('babelpod:bluetooth:base');

export abstract class BluetoothManager extends EventEmitter implements IBluetoothManager {
  protected activeDevices: Map<string, any>;
  protected deviceVolumes: Map<string, number>;

  constructor() {
    super();
    this.activeDevices = new Map();
    this.deviceVolumes = new Map();
  }

  abstract setupDevice(deviceId: string, address: string, initialVolume?: number): Promise<any>;
  abstract setVolume(deviceId: string, volume: number): Promise<boolean>;
  abstract getInputStream(deviceId: string): Writable | null;
  abstract scanDevices(): Promise<void>;

  cleanup(deviceId: string): void {
    logger('Cleaning up Bluetooth device:', deviceId);
    this.activeDevices.delete(deviceId);
    this.deviceVolumes.delete(deviceId);
  }

  cleanupAll(): void {
    logger('Cleaning up all Bluetooth devices');
    for (const deviceId of this.activeDevices.keys()) {
      this.cleanup(deviceId);
    }
  }

  isActive(deviceId: string): boolean {
    return this.activeDevices.has(deviceId);
  }

  getActiveDevices(): string[] {
    return Array.from(this.activeDevices.keys());
  }

  getVolume(deviceId: string): number {
    return this.deviceVolumes.get(deviceId) || config.bluetooth.defaultVolume;
  }
}