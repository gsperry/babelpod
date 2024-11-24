import { spawn, ChildProcess } from 'child_process';
import { Writable } from 'stream';
import debugModule from 'debug';
import { PCMManager as IPCMManager } from '../../types';
import { config } from '../config';

const logger = debugModule('babelpod:pcm');

interface PCMDevice {
  instance: ChildProcess;
  stdin: Writable;
}

export class PCMManager implements IPCMManager {
  private activeDevices: Map<string, PCMDevice>;
  private deviceVolumes: Map<string, number>;

  constructor() {
    this.activeDevices = new Map();
    this.deviceVolumes = new Map();
  }

  async setupDevice(
    deviceId: string, 
    initialVolume: number = config.pcm.defaultVolume
  ): Promise<PCMDevice> {
    logger('Setting up PCM device:', deviceId);
    
    if (this.activeDevices.has(deviceId)) {
      logger('Device already exists:', deviceId);
      return this.activeDevices.get(deviceId)!;
    }

    this.deviceVolumes.set(deviceId, initialVolume);

    return new Promise((resolve, reject) => {
      try {
        const instance = spawn("aplay", [
          '-D', deviceId,
          '-c', config.audio.channels.toString(),
          '-f', config.audio.format,
          '-r', config.audio.sampleRate.toString()
        ]);

        instance.on('error', (err: Error) => {
          logger('Error on PCM device %s: %s', deviceId, err);
          this.cleanup(deviceId);
          reject(err);
        });

        instance.stderr?.on('data', (data: Buffer) => {
          logger('aplay stderr (%s): %s', deviceId, data.toString());
        });

        const deviceInfo: PCMDevice = {
          instance,
          stdin: instance.stdin
        };

        this.activeDevices.set(deviceId, deviceInfo);
        resolve(deviceInfo);

      } catch (err) {
        logger('Failed to setup PCM device:', err);
        reject(err);
      }
    });
  }

  setVolume(deviceId: string, volume: number): boolean {
    logger('Setting volume for PCM device %s to %d', deviceId, volume);
    this.deviceVolumes.set(deviceId, volume);
    
    try {
      const amixer = spawn("amixer", [
        '-c', config.pcm.cardNumber.toString(),
        '--', "sset",
        config.pcm.mixerControl,
        `${volume}%`
      ]);

      amixer.stderr.on('data', (data: Buffer) => {
        logger('amixer stderr:', data.toString());
      });

      return true;
    } catch (err) {
      logger('Failed to set volume:', err);
      return false;
    }
  }

  getVolume(deviceId: string): number {
    return this.deviceVolumes.get(deviceId) || config.pcm.defaultVolume;
  }

  getInputStream(deviceId: string): Writable | null {
    const device = this.activeDevices.get(deviceId);
    return device ? device.stdin : null;
  }

  cleanup(deviceId: string): void {
    logger('Cleaning up PCM device:', deviceId);
    const device = this.activeDevices.get(deviceId);
    if (device) {
      try {
        device.instance.kill();
      } catch (err) {
        logger('Error killing PCM device:', err);
      }
      this.activeDevices.delete(deviceId);
      this.deviceVolumes.delete(deviceId);
    }
  }

  cleanupAll(): void {
    logger('Cleaning up all PCM devices');
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
}