import { Readable } from 'stream';
import debugModule from 'debug';
import { AirplayManager as IAirplayManager } from '../../types/index';
import { config } from '../config';

const logger = debugModule('babelpod:airplay');

// Create type definitions for airtunes2
interface AirTunesDevice {
  on(event: string, callback: (status: any) => void): void;
  setVolume(volume: number): void;
  stop(callback: () => void): void;
}

// Define minimal interface for what we need from AirTunes
interface AirTunesBase {
  on(event: string, callback: (status: any) => void): void;
  add(host: string, options: { port: number; volume: number }): AirTunesDevice;
}

// Use require since the module doesn't support ES imports
// Note: We're preserving the actual runtime behavior while satisfying TypeScript
const AirTunes = require('airtunes2') as { new(): AirTunesBase & { pipe: unknown } };

export class AirplayManager implements IAirplayManager {
  // Use any for airtunes to preserve the working stream functionality
  private airtunes: any;
  private activeDevices: Map<string, AirTunesDevice>;
  private deviceVolumes: Map<string, number>;
  private currentStream: Readable | null;

  constructor() {
    logger('Creating new AirplayManager');
    this.airtunes = new AirTunes();
    this.activeDevices = new Map();
    this.deviceVolumes = new Map();
    this.currentStream = null;

    this.airtunes.on('buffer', (status: string) => {
      logger('AirTunes buffer status:', status);
    });

    this.airtunes.on('error', (err: Error) => {
      logger('AirTunes error:', err);
    });
  }

  async setupDevice(
    deviceId: string, 
    host: string, 
    port: number, 
    initialVolume: number = config.airplay.defaultVolume
  ): Promise<AirTunesDevice> {
    logger('Setting up AirPlay device - deviceId: %s, host: %s, port: %d', deviceId, host, port);
    
    // Clean up any existing device first
    if (this.activeDevices.has(deviceId)) {
      this.cleanup(deviceId);
    }

    this.deviceVolumes.set(deviceId, initialVolume);
    
    logger('Adding device to AirTunes');
    const device = this.airtunes.add(host, {
      port: parseInt(port.toString()),
      volume: initialVolume
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger('Device setup timeout for:', deviceId);
        reject(new Error('Device setup timeout'));
      }, config.airplay.setupTimeout);

      device.on('status', (status: string) => {
        logger('AirPlay device %s status: %s', deviceId, status);
        if (status === 'ready') {
          clearTimeout(timeout);
          this.activeDevices.set(deviceId, device);
          resolve(device);
        }
      });

      device.on('error', (err: Error) => {
        logger('AirPlay device %s error: %s', deviceId, err);
        clearTimeout(timeout);
        this.cleanup(deviceId);
        reject(err);
      });
    });
  }

  updateStreamToDevice(inputStream: Readable | null): void {
    logger('Updating stream to device');
    
    // If we already have a stream, clean it up
    if (this.currentStream) {
      logger('Cleaning up existing stream');
      this.currentStream.unpipe(this.airtunes);
      this.currentStream = null;
    }

    // Set up new stream if provided
    if (inputStream) {
      logger('Setting up new stream pipe');
      this.currentStream = inputStream;
      
      // Set up pipe with error handling
      try {
        // Preserve the original piping behavior
        inputStream.pipe(this.airtunes);
        logger('Stream piped successfully');
      } catch (err) {
        logger('Error piping stream:', err);
      }
    }
  }

  setVolume(deviceId: string, volume: number): boolean {
    const device = this.activeDevices.get(deviceId);
    if (device) {
      this.deviceVolumes.set(deviceId, volume);
      device.setVolume(volume);
      return true;
    }
    return false;
  }

  cleanup(deviceId: string): void {
    logger('Cleaning up AirPlay device:', deviceId);
    const device = this.activeDevices.get(deviceId);
    if (device) {
      if (this.currentStream) {
        try {
          this.currentStream.unpipe(this.airtunes);
        } catch (err) {
          logger('Error unpiping stream:', err);
        }
      }
      device.stop(() => {
        logger('Stopped AirPlay device:', deviceId);
      });
      this.activeDevices.delete(deviceId);
      this.deviceVolumes.delete(deviceId);
    }
  }

  cleanupAll(): void {
    logger('Cleaning up all AirPlay devices');
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
    return this.deviceVolumes.get(deviceId) || config.airplay.defaultVolume;
  }
}