import { PCMManager as IPCMManager } from '../../../types';
import { LinuxPCMManager } from './LinuxPCMManager';
import { MacPCMManager } from './MacPCMManager';
import { MockPCMManager } from './MockPCMManager';
import debugModule from 'debug';

const logger = debugModule('babelpod:pcm');

export function createPCMManager(): IPCMManager {
  const platform = process.platform;
  
  try {
    switch (platform) {
      case 'linux':
        return new LinuxPCMManager();
      case 'darwin':
        return new MacPCMManager();
      default:
        logger('Unsupported platform for PCM:', platform);
        return new MockPCMManager();
    }
  } catch (err) {
    logger('Failed to initialize PCM manager:', err);
    return new MockPCMManager();
  }
}

export { PCMManager } from './PCMManager';
export { LinuxPCMManager } from './LinuxPCMManager';
export { MacPCMManager } from './MacPCMManager';
export { MockPCMManager } from './MockPCMManager';