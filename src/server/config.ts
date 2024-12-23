import debugModule from 'debug';
import { Config } from '../types/index.js';

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
    setupTimeout: 10000,
    reconnectAttempts: 3
  },
  pcm: {
    defaultVolume: 20,
    cardNumber: 1,
    mixerControl: 'Speaker'
  },
  bluetooth: {
    defaultVolume: 20,
    setupTimeout: 10000,
    reconnectAttempts: 3,
    scanInterval: 10000,
    profiles: {
      output: ['A2DP-SINK', 'HSP', 'HFP'],
      input: ['A2DP-SOURCE', 'HSP', 'HFP']
    },
    bitpool: {
      min: 40,
      max: 64
    },
    codecs: ['SBC', 'AAC'],
    autoConnect: true,
    discoveryDuration: 30000
  },
  discovery: {
    pcmScanInterval: 10000,
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

  // Validate and merge bluetooth config
  if (newConfig.bluetooth) {
    if (typeof newConfig.bluetooth.defaultVolume === 'number') {
      config.bluetooth.defaultVolume = newConfig.bluetooth.defaultVolume;
    }
    if (typeof newConfig.bluetooth.setupTimeout === 'number') {
      config.bluetooth.setupTimeout = newConfig.bluetooth.setupTimeout;
    }
    if (typeof newConfig.bluetooth.scanInterval === 'number') {
      config.bluetooth.scanInterval = newConfig.bluetooth.scanInterval;
    }
    if (typeof newConfig.bluetooth.discoveryDuration === 'number') {
      config.bluetooth.discoveryDuration = newConfig.bluetooth.discoveryDuration;
    }
    if (newConfig.bluetooth.profiles) {
      if (Array.isArray(newConfig.bluetooth.profiles.output)) {
        const outputProfiles = newConfig.bluetooth.profiles.output.filter((profile): profile is string => 
          typeof profile === 'string'
        );
        if (outputProfiles.length > 0) {
          config.bluetooth.profiles.output = outputProfiles;
        }
      }
      if (Array.isArray(newConfig.bluetooth.profiles.input)) {
        const inputProfiles = newConfig.bluetooth.profiles.input.filter((profile): profile is string => 
          typeof profile === 'string'
        );
        if (inputProfiles.length > 0) {
          config.bluetooth.profiles.input = inputProfiles;
        }
      }
    }
    if (newConfig.bluetooth.bitpool) {
      if (typeof newConfig.bluetooth.bitpool.min === 'number') {
        config.bluetooth.bitpool.min = newConfig.bluetooth.bitpool.min;
      }
      if (typeof newConfig.bluetooth.bitpool.max === 'number') {
        config.bluetooth.bitpool.max = newConfig.bluetooth.bitpool.max;
      }
    }
    if (Array.isArray(newConfig.bluetooth.codecs)) {
      const codecs = newConfig.bluetooth.codecs.filter((codec): codec is string => 
        typeof codec === 'string'
      );
      if (codecs.length > 0) {
        config.bluetooth.codecs = codecs;
      }
    }
    if (typeof newConfig.bluetooth.autoConnect === 'boolean') {
      config.bluetooth.autoConnect = newConfig.bluetooth.autoConnect;
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