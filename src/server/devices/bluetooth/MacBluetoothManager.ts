import { execFile } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';
import { BluetoothManager } from './BluetoothManager';
import { BluetoothDevice } from '../../../types';
import { config } from '../../config';
import debugModule from 'debug';
import { Writable } from 'stream';

const logger = debugModule('babelpod:bluetooth:mac');
const execFileAsync = promisify(execFile);

interface BluetoothConnection {
  instance: any;
  stdin: Writable | null;
  address: string;
  deviceId: string;
}

export class MacBluetoothManager extends BluetoothManager {
  private devices: Map<string, BluetoothConnection>;

  constructor() {
    super();
    this.devices = new Map();
    this.initializeBluetooth().catch(err => {
      logger('Failed to initialize Bluetooth:', err);
    });
  }

  private async initializeBluetooth() {
    try {
      // Check if blueutil is installed
      await execFileAsync('which', ['blueutil']);
      
      // Enable Bluetooth
      await execFileAsync('blueutil', ['--power', '1']);
      
      logger('Bluetooth system initialized');
    } catch (err) {
      logger('Failed to initialize Bluetooth. Is blueutil installed?', err);
      throw new Error('blueutil is required for Bluetooth support. Install with: brew install blueutil');
    }
  }

  async setupDevice(deviceId: string, address: string, initialVolume = config.bluetooth.defaultVolume): Promise<any> {
    logger('Setting up Bluetooth device:', deviceId);

    if (this.devices.has(deviceId)) {
      logger('Device already exists:', deviceId);
      return this.devices.get(deviceId);
    }

    try {
      // Connect to the device using blueutil
      await execFileAsync('blueutil', ['--connect', address]);
      
      // Wait for the connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the device info to confirm connection
      const { stdout: deviceInfo } = await execFileAsync('blueutil', ['--info', address]);
      if (!deviceInfo.includes('connected: 1')) {
        throw new Error('Failed to connect to device');
      }

      // Set up audio routing using macOS native audio
      await execFileAsync('SwitchAudioSource', ['-s', deviceId]);

      const connection: BluetoothConnection = {
        instance: null, // macOS handles the connection
        stdin: null,    // macOS handles the audio routing
        address,
        deviceId
      };

      this.devices.set(deviceId, connection);
      this.deviceVolumes.set(deviceId, initialVolume);
      
      // Set initial volume
      await this.setVolume(deviceId, initialVolume);
      
      logger('Successfully set up Bluetooth device:', deviceId);
      return connection;
    } catch (err) {
      logger('Failed to setup Bluetooth device:', err);
      throw err;
    }
  }

  async setVolume(deviceId: string, volume: number): Promise<boolean> {
    logger('Setting volume for device %s to %d', deviceId, volume);

    const connection = this.devices.get(deviceId);
    if (!connection) {
      logger('Device not found:', deviceId);
      return false;
    }

    try {
      // Set volume using macOS native commands
      await execFileAsync('osascript', [
        '-e', `set volume output volume ${volume}`
      ]);
      
      this.deviceVolumes.set(deviceId, volume);
      return true;
    } catch (err) {
      logger('Failed to set volume:', err);
      return false;
    }
  }

  getInputStream(deviceId: string): Writable | null {
    // macOS handles audio routing internally
    return null;
  }

  async scanDevices(): Promise<void> {
    try {
      logger('Starting Bluetooth scan');

      // Start scanning with blueutil
      await execFileAsync('blueutil', ['--inquiry']);

      // Get paired devices
      const { stdout: pairedDevices } = await execFileAsync('blueutil', ['--paired']);
      const devices: BluetoothDevice[] = [];

      // Parse paired devices
      for (const line of pairedDevices.split('\n')) {
        if (line.trim()) {
          const [address, name] = line.split(',').map(s => s.trim());
          if (address && name) {
            // Check if it's an audio device using system_profiler
            const { stdout: deviceInfo } = await execFileAsync('system_profiler', 
              ['SPBluetoothDataType', '-json']);
            const bluetoothData = JSON.parse(deviceInfo);
            
            const deviceData = bluetoothData?.SPBluetoothDataType?.[0]?.device_title;
            if (deviceData && deviceData[address]?.device_minorClassOfDevice_name?.includes('Audio')) {
              devices.push({
                id: `bluetooth_${address}`,
                name,
                type: 'bluetooth',
                address,
                profiles: ['audio']  // macOS doesn't expose specific profiles
              });
            }
          }
        }
      }

      logger('Found Bluetooth devices:', devices);
      this.emit('devicesFound', devices);

    } catch (err) {
      logger('Error during device scan:', err);
      this.emit('devicesFound', []);
    }
  }

  override cleanup(deviceId: string): void {
    logger('Cleaning up macOS Bluetooth device:', deviceId);
    const connection = this.devices.get(deviceId);
    if (connection) {
      try {
        // Disconnect the device using blueutil
        execFileAsync('blueutil', ['--disconnect', connection.address])
          .catch(err => logger('Error disconnecting device:', err));

        // Switch audio back to default output
        execFileAsync('SwitchAudioSource', ['-s', 'Built-in Output'])
          .catch(err => logger('Error switching audio source:', err));

      } catch (err) {
        logger('Error during cleanup:', err);
      } finally {
        this.devices.delete(deviceId);
        this.deviceVolumes.delete(deviceId);
      }
    }
    super.cleanup(deviceId);
  }

  override cleanupAll(): void {
    logger('Cleaning up all macOS Bluetooth devices');
    for (const deviceId of this.devices.keys()) {
      this.cleanup(deviceId);
    }
    super.cleanupAll();
  }
}