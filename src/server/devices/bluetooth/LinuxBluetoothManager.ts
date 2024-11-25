import { spawn } from 'child_process';
import { BluetoothManager } from './BluetoothManager';
import { BluetoothDevice } from '../../../types';
import { config } from '../../config';
import debugModule from 'debug';
import { Writable } from 'stream';

const logger = debugModule('babelpod:bluetooth:linux');

// Define minimal types for what we need from dbus-next
type DBusInterface = any;
type DBusProxyObject = {
  getInterface(name: string): Promise<DBusInterface>;
};
type DBusBus = {
  getProxyObject(name: string, path: string): Promise<DBusProxyObject>;
  callProxyMethod(...args: any[]): Promise<any>;
};
type DBusModule = {
  systemBus(): DBusBus;
  default?: { systemBus(): DBusBus };
};

interface BluetoothConnection {
  instance: any;
  stdin: Writable | null;
  address: string;
  path: string;
}

export class LinuxBluetoothManager extends BluetoothManager {
  private bus: DBusBus | null = null;
  private adapter: DBusInterface | null = null;
  private devices: Map<string, BluetoothConnection>;
  private dbusAvailable: boolean = false;

  constructor() {
    super();
    this.devices = new Map();
    this.initializeBluetooth().catch(err => {
      logger('Failed to initialize Bluetooth:', err);
    });
  }

  private async initializeBluetooth() {
    try {
      // Only attempt D-Bus initialization on Linux
      if (process.platform === 'linux') {
        try {
          // Dynamic import wrapped in try-catch
          const dbusModule = await import('dbus-next')
            .catch(() => {
              logger('dbus-next module not available, falling back to command line tools');
              return null;
            }) as DBusModule | null;

          if (dbusModule) {
            const systemBus = dbusModule.default?.systemBus || dbusModule.systemBus;
            if (systemBus) {
              this.bus = systemBus();
              const obj = await this.bus.getProxyObject('org.bluez', '/org/bluez/hci0');
              this.adapter = await obj.getInterface('org.bluez.Adapter1');
              this.dbusAvailable = true;
              logger('D-Bus initialized successfully');
            }
          }
        } catch (err) {
          logger('D-Bus initialization failed:', err);
          this.dbusAvailable = false;
        }
      } else {
        logger('Not running on Linux, D-Bus will not be available');
        this.dbusAvailable = false;
      }

      // Enable Bluetooth adapter using command line as fallback
      await this.executeCommand('rfkill unblock bluetooth').catch(() => {
        logger('Failed to unblock Bluetooth, might need manual intervention');
      });
      
      // Start Bluetooth service
      await this.executeCommand('systemctl start bluetooth').catch(() => {
        logger('Failed to start Bluetooth service, might need manual intervention');
      });
      
      logger('Bluetooth system initialized');
    } catch (err) {
      logger('Failed to initialize Bluetooth:', err);
      throw err;
    }
  }

  private async executeCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('sh', ['-c', command]);
      process.on('error', reject);
      process.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command failed with code ${code}`));
      });
    });
  }

  async setupDevice(deviceId: string, address: string, initialVolume = config.bluetooth.defaultVolume): Promise<any> {
    logger('Setting up Bluetooth device:', deviceId);

    if (this.devices.has(deviceId)) {
      logger('Device already exists:', deviceId);
      return this.devices.get(deviceId);
    }

    try {
      // Connect using D-Bus if available, otherwise use bluetoothctl
      if (this.dbusAvailable && this.bus) {
        const devicePath = `/org/bluez/hci0/dev_${address.replace(/:/g, '_')}`;
        try {
          const deviceObj = await this.bus.getProxyObject('org.bluez', devicePath);
          const device = await deviceObj.getInterface('org.bluez.Device1');
          await device.Connect();
        } catch (dbusErr) {
          logger('D-Bus connection failed, falling back to bluetoothctl:', dbusErr);
          await this.executeCommand(`bluetoothctl connect ${address}`);
        }
      } else {
        await this.executeCommand(`bluetoothctl connect ${address}`);
      }

      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set up audio routing using bluez-alsa
      const instance = spawn('bluealsa-aplay', [
        '--profile-a2dp',
        address
      ]);

      instance.stderr?.on('data', (data: Buffer) => {
        logger('bluealsa-aplay stderr:', data.toString());
      });

      instance.on('error', (err) => {
        logger('bluealsa-aplay error:', err);
        this.cleanup(deviceId);
      });

      const connection: BluetoothConnection = {
        instance,
        stdin: instance.stdin,
        address,
        path: `/org/bluez/hci0/dev_${address.replace(/:/g, '_')}`
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
      // Use PulseAudio for volume control
      await this.executeCommand(
        `pactl set-sink-volume bluez_sink.${connection.address.replace(/:/g, '_')} ${volume}%`
      );

      this.deviceVolumes.set(deviceId, volume);
      return true;
    } catch (err) {
      logger('Failed to set volume:', err);
      return false;
    }
  }

  getInputStream(deviceId: string): Writable | null {
    const connection = this.devices.get(deviceId);
    return connection?.stdin || null;
  }

async scanDevices(): Promise<void> {
    try {
      logger('Starting Bluetooth scan');
      
      if (this.dbusAvailable && this.bus && this.adapter) {
        await this.scanWithDBus();
      } else {
        await this.scanWithBluetooth();
      }

    } catch (err) {
      logger('Error during device scan:', err);
      this.emit('error', err);
    }
  }

  private async scanWithDBus(): Promise<void> {
    if (!this.bus || !this.adapter) {
      throw new Error('D-Bus not initialized');
    }

    try {
      await this.adapter.StartDiscovery();

      // Get managed objects from D-Bus
      const objects = await this.bus.callProxyMethod(
        'org.bluez',
        '/',
        'org.freedesktop.DBus.ObjectManager',
        'GetManagedObjects'
      );

      const devices: BluetoothDevice[] = [];

      // Parse available devices
      for (const [path, interfaces] of Object.entries(objects) as [string, { [key: string]: any }][]) {
        if (interfaces['org.bluez.Device1']) {
          const device = interfaces['org.bluez.Device1'];
          if (device.Class & 0x200000 || // Audio device class
              (device.UUIDs && (
                device.UUIDs.includes('0000110b-0000-1000-8000-00805f9b34fb') || // A2DP Sink
                device.UUIDs.includes('0000110a-0000-1000-8000-00805f9b34fb')    // A2DP Source
              ))) {
            devices.push({
              id: `bluetooth_${device.Address}`,
              name: device.Name || device.Address,
              type: 'bluetooth',
              address: device.Address,
              profiles: device.UUIDs || []
            });
          }
        }
      }

      logger('Found Bluetooth devices:', devices);
      this.emit('devicesFound', devices);

      // Stop discovery after timeout
      setTimeout(async () => {
        try {
          if (this.adapter) {
            await this.adapter.StopDiscovery();
          }
        } catch (err) {
          logger('Error stopping discovery:', err);
        }
      }, config.bluetooth.discoveryDuration);

    } catch (err) {
      logger('D-Bus scan failed:', err);
      // Fallback to bluetoothctl
      await this.scanWithBluetooth();
    }
  }

  private async scanWithBluetooth(): Promise<void> {
    try {
      // Use bluetoothctl for scanning
      const scanProcess = spawn('bluetoothctl', ['scan', 'on']);
      const devices = new Map<string, BluetoothDevice>();

      scanProcess.stdout.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line.includes('Device')) {
          const match = line.match(/Device ([0-9A-F:]+) (.+)/);
          if (match) {
            const [, address, name] = match;
            devices.set(address, {
              id: `bluetooth_${address}`,
              name: name || address,
              type: 'bluetooth',
              address,
              profiles: []
            });
          }
        }
      });

      // Stop scanning after timeout
      setTimeout(() => {
        scanProcess.kill();
        this.emit('devicesFound', Array.from(devices.values()));
      }, config.bluetooth.discoveryDuration);

    } catch (err) {
      logger('Bluetooth scan failed:', err);
      this.emit('devicesFound', []);
    }
  }

  override cleanup(deviceId: string): void {
    logger('Cleaning up Linux Bluetooth device:', deviceId);
    const connection = this.devices.get(deviceId);
    if (connection) {
      try {
        // Kill the bluealsa-aplay process
        if (connection.instance) {
          connection.instance.kill('SIGTERM');
        }

        // Close the stdin stream if it exists
        if (connection.stdin) {
          connection.stdin.end();
        }

        // Try D-Bus disconnect first, fall back to bluetoothctl
        if (this.dbusAvailable && this.bus) {
          this.bus.callProxyMethod(
            'org.bluez',
            connection.path,
            'org.bluez.Device1',
            'Disconnect'
          ).catch((err: Error) => {
            logger('D-Bus disconnect failed, trying bluetoothctl:', err);
            return this.executeCommand(`bluetoothctl disconnect ${connection.address}`);
          });
        } else {
          this.executeCommand(`bluetoothctl disconnect ${connection.address}`)
            .catch(err => logger('Error disconnecting device:', err));
        }

      } catch (err) {
        logger('Error during cleanup:', err);
      } finally {
        this.devices.delete(deviceId);
        this.deviceVolumes.delete(deviceId);
      }
    }
    super.cleanup(deviceId);
  }
}