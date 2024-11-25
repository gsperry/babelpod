import { BluetoothManager } from './BluetoothManager';
import debugModule from 'debug';
import { Writable } from 'stream';
import { config } from '../../config';

const logger = debugModule('babelpod:bluetooth:mock');

export class MockBluetoothManager extends BluetoothManager {
  async setupDevice(deviceId: string, address: string, initialVolume = config.bluetooth.defaultVolume): Promise<any> {
    logger('Mock: Setting up Bluetooth device:', deviceId);
    this.deviceVolumes.set(deviceId, initialVolume);
    return { deviceId, address };
  }

  async setVolume(deviceId: string, volume: number): Promise<boolean> {
    logger('Mock: Setting volume for device %s to %d', deviceId, volume);
    this.deviceVolumes.set(deviceId, volume);
    return true;
  }

  getInputStream(deviceId: string): Writable | null {
    logger('Mock: Getting input stream for device:', deviceId);
    return null;
  }

  async scanDevices(): Promise<void> {
    logger('Mock: Scanning for Bluetooth devices');
    this.emit('devicesFound', [
      {
        id: 'mock_bt_1',
        name: 'Mock Bluetooth Speaker',
        type: 'bluetooth',
        address: '00:11:22:33:44:55',
        profiles: ['A2DP-SINK']
      }
    ]);
  }
}