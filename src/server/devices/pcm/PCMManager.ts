import { EventEmitter } from 'events';
import { PCMManager as IPCMManager, PCMConnection } from '../../../types';
import { config } from '../../config';
import debugModule from 'debug';
import { Writable } from 'stream';

const logger = debugModule('babelpod:pcm:base');

export abstract class PCMManager extends EventEmitter implements IPCMManager {
  protected activeDevices: Map<string, PCMConnection>;
  protected deviceVolumes: Map<string, number>;

  constructor() {
    super();
    this.activeDevices = new Map();
    this.deviceVolumes = new Map();
  }

  // Abstract methods that must be implemented by platform-specific classes
  abstract setupDevice(deviceId: string, initialVolume?: number): Promise<PCMConnection>;
  abstract setVolume(deviceId: string, volume: number): Promise<boolean>;
  abstract getInputStream(deviceId: string): Writable | null;
  abstract scanDevices(): Promise<void>;

  // Concrete implementations
  cleanup(deviceId: string): void {
    logger('Cleaning up PCM device:', deviceId);
    const connection = this.activeDevices.get(deviceId);
    if (connection) {
      try {
        connection.instance?.kill();
        connection.stdin?.end();
      } catch (err) {
        logger('Error cleaning up PCM device:', err);
      }
      this.activeDevices.delete(deviceId);
      this.deviceVolumes.delete(deviceId);
    }
  }

  cleanupAll(): void {
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
    return this.deviceVolumes.get(deviceId) || config.pcm.defaultVolume;
  }
}