import { BluetoothManager as IBluetoothManager } from '../../../types';
import { LinuxBluetoothManager } from './LinuxBluetoothManager';
import { MacBluetoothManager } from './MacBluetoothManager';
import { MockBluetoothManager } from './MockBluetoothManager';
import debugModule from 'debug';

const logger = debugModule('babelpod:bluetooth');

export function createBluetoothManager(): IBluetoothManager {
  const platform = process.platform;
  
  try {
    switch (platform) {
      case 'linux':
        return new LinuxBluetoothManager();
      case 'darwin':
        return new MacBluetoothManager();
      default:
        logger('Unsupported platform for Bluetooth:', platform);
        return new MockBluetoothManager();
    }
  } catch (err) {
    logger('Failed to initialize Bluetooth manager:', err);
    return new MockBluetoothManager();
  }
}

// Export the managers
export { BluetoothManager } from './BluetoothManager';
export { LinuxBluetoothManager } from './LinuxBluetoothManager';
export { MacBluetoothManager } from './MacBluetoothManager';
export { MockBluetoothManager } from './MockBluetoothManager';