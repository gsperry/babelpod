import debugModule from 'debug';
import { config } from '../config';
const logger = debugModule('babelpod:airplay');
// Use require since the module doesn't support ES imports
// Note: We're preserving the actual runtime behavior while satisfying TypeScript
const AirTunes = require('airtunes2');
export class AirplayManager {
    constructor() {
        logger('Creating new AirplayManager');
        this.airtunes = new AirTunes();
        this.activeDevices = new Map();
        this.deviceVolumes = new Map();
        this.currentStream = null;
        this.airtunes.on('buffer', (status) => {
            logger('AirTunes buffer status:', status);
        });
        this.airtunes.on('error', (err) => {
            logger('AirTunes error:', err);
        });
    }
    async setupDevice(deviceId, host, port, initialVolume = config.airplay.defaultVolume) {
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
                reject(new Error('Device setup timeout'));
            }, config.airplay.setupTimeout);
            device.on('status', (status) => {
                logger('AirPlay device %s status: %s', deviceId, status);
                if (status === 'ready') {
                    clearTimeout(timeout);
                    this.activeDevices.set(deviceId, device);
                    resolve(device);
                }
            });
            device.on('error', (err) => {
                logger('AirPlay device %s error: %s', deviceId, err);
                clearTimeout(timeout);
                this.cleanup(deviceId);
                reject(err);
            });
        });
    }
    updateStreamToDevice(inputStream) {
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
            // Set up pipe with error handling
            try {
                // Preserve the original piping behavior
                inputStream.pipe(this.airtunes);
                logger('Stream piped successfully');
            }
            catch (err) {
                logger('Error piping stream:', err);
            }
        }
    }
    setVolume(deviceId, volume) {
        const device = this.activeDevices.get(deviceId);
        if (device) {
            this.deviceVolumes.set(deviceId, volume);
            device.setVolume(volume);
            return true;
        }
        return false;
    }
    cleanup(deviceId) {
        logger('Cleaning up AirPlay device:', deviceId);
        const device = this.activeDevices.get(deviceId);
        if (device) {
            if (this.currentStream) {
                try {
                    this.currentStream.unpipe(this.airtunes);
                }
                catch (err) {
                    logger('Error unpiping stream:', err);
                }
            }
            device.stop(() => {
                logger('Stopped AirPlay device:', deviceId);
            });
            this.activeDevices.delete(deviceId);
            this.deviceVolumes.delete(deviceId);
        }
    }
    cleanupAll() {
        logger('Cleaning up all AirPlay devices');
        for (const deviceId of this.activeDevices.keys()) {
            this.cleanup(deviceId);
        }
    }
    isActive(deviceId) {
        return this.activeDevices.has(deviceId);
    }
    getActiveDevices() {
        return Array.from(this.activeDevices.keys());
    }
    getVolume(deviceId) {
        return this.deviceVolumes.get(deviceId) || config.airplay.defaultVolume;
    }
}
