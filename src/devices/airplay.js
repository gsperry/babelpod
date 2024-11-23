const debug = require('debug')('babelpod:airplay');
const AirTunes = require('airtunes2');

class AirplayManager {
  constructor() {
    debug('Creating new AirplayManager');
    this.airtunes = new AirTunes();
    this.activeDevices = new Map();
    this.deviceVolumes = new Map();
    this.currentStream = null;

    this.airtunes.on('buffer', (status) => {
      debug('AirTunes buffer status:', status);
    });

    this.airtunes.on('error', (err) => {
      debug('AirTunes error:', err);
    });
  }

  setupDevice(deviceId, host, port, initialVolume = 20) {
    debug('Setting up AirPlay device - deviceId: %s, host: %s, port: %d', deviceId, host, port);
    
    // Clean up any existing device first
    if (this.activeDevices.has(deviceId)) {
      this.cleanup(deviceId);
    }

    this.deviceVolumes.set(deviceId, initialVolume);
    
    debug('Adding device to AirTunes');
    const device = this.airtunes.add(host, {
      port: parseInt(port),
      volume: initialVolume
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        debug('Device setup timeout for:', deviceId);
        reject(new Error('Device setup timeout'));
      }, 10000);

      device.on('status', (status) => {
        debug('AirPlay device %s status: %s', deviceId, status);
        if (status === 'ready') {
          clearTimeout(timeout);
          this.activeDevices.set(deviceId, device);
          resolve(device);
        }
      });

      device.on('error', (err) => {
        debug('AirPlay device %s error: %s', deviceId, err);
        clearTimeout(timeout);
        this.cleanup(deviceId);
        reject(err);
      });
    });
  }

  updateStreamToDevice(inputStream) {
    debug('Updating stream to device');
    
    // If we already have a stream, clean it up
    if (this.currentStream) {
      debug('Cleaning up existing stream');
      this.currentStream.unpipe(this.airtunes);
      this.currentStream = null;
    }

    // Set up new stream if provided
    if (inputStream) {
      debug('Setting up new stream pipe');
      this.currentStream = inputStream;
      
      // Set up pipe with error handling
      try {
        inputStream.pipe(this.airtunes);
        debug('Stream piped successfully');
      } catch (err) {
        debug('Error piping stream:', err);
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
    debug('Cleaning up AirPlay device:', deviceId);
    const device = this.activeDevices.get(deviceId);
    if (device) {
      if (this.currentStream) {
        try {
          this.currentStream.unpipe(this.airtunes);
        } catch (err) {
          debug('Error unpiping stream:', err);
        }
      }
      device.stop(() => {
        debug('Stopped AirPlay device:', deviceId);
      });
      this.activeDevices.delete(deviceId);
      this.deviceVolumes.delete(deviceId);
    }
  }

  cleanupAll() {
    debug('Cleaning up all AirPlay devices');
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
    return this.deviceVolumes.get(deviceId) || 20;
  }
}

module.exports = AirplayManager;