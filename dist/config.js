"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConfig = exports.config = void 0;
const debug_1 = __importDefault(require("debug"));
const logger = (0, debug_1.default)('babelpod:config');
// Default configuration
const config = {
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
        setupTimeout: 10000, // 10 seconds
        reconnectAttempts: 3
    },
    pcm: {
        defaultVolume: 20,
        cardNumber: 1, // Default sound card for amixer
        mixerControl: 'Speaker'
    },
    discovery: {
        pcmScanInterval: 10000, // 10 seconds
        mdnsType: 'raop'
    }
};
exports.config = config;
// Function to validate and update config at runtime
function updateConfig(newConfig) {
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
exports.updateConfig = updateConfig;
