import debugModule from 'debug';
import { Config } from '../types/index.js';  // Updated import path

const logger: debugModule.IDebugger = debugModule('babelpod:config');

// Default configuration
const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0'
  },
  audio: {
    sampleRate: 44100,
    channels: 2,
    format: 'S16_LE',
    chunkSize: 4096,
    bytesPerSample: 2
  },
  airplay: {
    defaultVolume: 20,
    setupTimeout: 10000,  // 10 seconds
    reconnectAttempts: 3
  },
  pcm: {
    defaultVolume: 20,
    cardNumber: 1,  // Default sound card for amixer
    mixerControl: 'Speaker'
  },
  discovery: {
    pcmScanInterval: 10000,  // 10 seconds
    mdnsType: 'raop'
  }
};

// Type for partial config updates
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Function to validate and update config at runtime
function updateConfig(newConfig: DeepPartial<Config>): Config {
  logger('Updating configuration');
  
  // Validate and merge server config
  if (newConfig.server) {
    if (typeof newConfig.server.port === 'number') {
      config.server.port = newConfig.server.port;
    }
    if (typeof newConfig.server.host === 'string') {
      config.server.host = newConfig.server.host;
    }
  }

  // Validate and merge audio config
  if (newConfig.audio) {
    if (typeof newConfig.audio.sampleRate === 'number') {
      config.audio.sampleRate = newConfig.audio.sampleRate;
    }
    if (typeof newConfig.audio.channels === 'number') {
      config.audio.channels = newConfig.audio.channels;
    }
    if (typeof newConfig.audio.chunkSize === 'number') {
      config.audio.chunkSize = newConfig.audio.chunkSize;
    }
  }

  logger('Updated configuration:', config);
  return config;
}

export {
  config,
  updateConfig,
  type DeepPartial
};