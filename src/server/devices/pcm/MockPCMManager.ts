// src/server/devices/pcm/MockPCMManager.ts
import { PCMManager } from './PCMManager';
import { PCMConnection, PCMDevice } from '../../../types';
import { config } from '../../config';
import debugModule from 'debug';
import { Writable } from 'stream';

const logger = debugModule('babelpod:pcm:mock');

export class MockPCMManager extends PCMManager {
  async setupDevice(deviceId: string, initialVolume = config.pcm.defaultVolume): Promise<PCMConnection> {
    logger('Mock: Setting up PCM device:', deviceId);

    if (this.activeDevices.has(deviceId)) {
      logger('Mock: Device already exists:', deviceId);
      return this.activeDevices.get(deviceId)!;
    }

    // Create a mock connection
    const connection: PCMConnection = {
      instance: null,
      stdin: null,
      deviceId
    };

    this.activeDevices.set(deviceId, connection);
    this.deviceVolumes.set(deviceId, initialVolume);

    logger('Mock: Successfully set up device:', deviceId);
    return connection;
  }

  async setVolume(deviceId: string, volume: number): Promise<boolean> {
    logger('Mock: Setting volume for device %s to %d', deviceId, volume);
    
    if (!this.activeDevices.has(deviceId)) {
      logger('Mock: Device not found:', deviceId);
      return false;
    }

    this.deviceVolumes.set(deviceId, volume);
    logger('Mock: Volume set successfully');
    return true;
  }

  getInputStream(deviceId: string): Writable | null {
    logger('Mock: Getting input stream for device:', deviceId);
    return null;
  }

  async scanDevices(): Promise<void> {
    logger('Mock: Scanning for PCM devices');
    
    // Create some mock devices for testing
    const mockDevices: PCMDevice[] = [
      {
        id: 'mock_output_1',
        name: 'Mock Speaker',
        type: 'pcm',
        input: false,
        output: true
      },
      {
        id: 'mock_input_1',
        name: 'Mock Microphone',
        type: 'pcm',
        input: true,
        output: false
      },
      {
        id: 'mock_duplex_1',
        name: 'Mock Audio Interface',
        type: 'pcm',
        input: true,
        output: true
      }
    ];

    logger('Mock: Emitting mock devices:', mockDevices);
    this.emit('devicesFound', mockDevices);
  }

  // Override cleanup to add mock-specific logging
  cleanup(deviceId: string): void {
    logger('Mock: Cleaning up PCM device:', deviceId);
    
    if (this.activeDevices.has(deviceId)) {
      this.activeDevices.delete(deviceId);
      this.deviceVolumes.delete(deviceId);
      logger('Mock: Device cleaned up successfully');
    } else {
      logger('Mock: Device not found for cleanup');
    }
  }

  // Override cleanupAll to add mock-specific logging
  cleanupAll(): void {
    logger('Mock: Cleaning up all PCM devices');
    super.cleanupAll();
    logger('Mock: All devices cleaned up');
  }

  // Additional mock-specific methods that might be useful for testing
  getMockDeviceCount(): number {
    return this.activeDevices.size;
  }

  getMockDeviceStates(): { deviceId: string; volume: number }[] {
    return Array.from(this.activeDevices.keys()).map(deviceId => ({
      deviceId,
      volume: this.getVolume(deviceId)
    }));
  }

  simulateDeviceFailure(deviceId: string): void {
    logger('Mock: Simulating device failure:', deviceId);
    this.cleanup(deviceId);
    this.emit('error', new Error(`Mock device failure: ${deviceId}`));
  }
}