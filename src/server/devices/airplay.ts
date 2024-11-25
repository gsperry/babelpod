import { Readable } from 'stream';
import { EventEmitter } from 'events';
import debugModule from 'debug';
import { AirplayManager as IAirplayManager } from '../../types';
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
const AirTunes = require('airtunes2') as { new(): AirTunesBase & { pipe: unknown } };

export class AirplayManager extends EventEmitter implements IAirplayManager {
  private airtunes: any;
  private activeDevices: Map<string, AirTunesDevice>;
  private deviceVolumes: Map<string, number>;
  private currentStream: Readable | null;

  constructor() {
    super(); // Initialize EventEmitter
    logger('Creating new AirplayManager');
    this.airtunes = new AirTunes();
    this.activeDevices = new Map();
    this.deviceVolumes = new Map();
    this.currentStream = null;

    this.airtunes.on('buffer', (status: string) => {
      logger('AirTunes buffer status:', status);
      this.emit('buffer', status); // Forward the event
    });

    this.airtunes.on('error', (err: Error) => {
      logger('AirTunes error:', err);
      this.emit('error', err); // Forward the error
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
        const error = new Error('Device setup timeout');
        this.emit('setupFailed', { deviceId, error });
        reject(error);
      }, config.airplay.setupTimeout);

      device.on('status', (status: string) => {
        logger('AirPlay device %s status: %s', deviceId, status);
        this.emit('deviceStatus', { deviceId, status });
        if (status === 'ready') {
          clearTimeout(timeout);
          this.activeDevices.set(deviceId, device);
          this.emit('deviceReady', deviceId);
          resolve(device);
        }
      });

      device.on('error', (err: Error) => {
        logger('AirPlay device %s error: %s', deviceId, err);
        clearTimeout(timeout);
        this.cleanup(deviceId);
        this.emit('deviceError', { deviceId, error: err });
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
      
      try {
        inputStream.pipe(this.airtunes);
        logger('Stream piped successfully');
        this.emit('streamUpdated', true);
      } catch (err) {
        logger('Error piping stream:', err);
        this.emit('streamError', err);
      }
    }
  }

  async setVolume(deviceId: string, volume: number): Promise<boolean> {
    logger('Setting volume for device %s to %d', deviceId, volume);
    const device = this.activeDevices.get(deviceId);
    
    if (device) {
      try {
        this.deviceVolumes.set(deviceId, volume);
        device.setVolume(volume);
        this.emit('volumeChanged', { deviceId, volume });
        return true;
      } catch (err) {
        logger('Error setting volume:', err);
        this.emit('volumeError', { deviceId, error: err });
        return false;
      }
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
          this.emit('cleanupError', { deviceId, error: err });
        }
      }
      device.stop(() => {
        logger('Stopped AirPlay device:', deviceId);
        this.emit('deviceStopped', deviceId);
      });
      this.activeDevices.delete(deviceId);
      this.deviceVolumes.delete(deviceId);
      this.emit('deviceCleaned', deviceId);
    }
  }

  cleanupAll(): void {
    logger('Cleaning up all AirPlay devices');
    for (const deviceId of this.activeDevices.keys()) {
      this.cleanup(deviceId);
    }
    this.emit('allDevicesCleaned');
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