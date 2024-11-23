const spawn = require('child_process').spawn;
const debug = require('debug')('babelpod:pcm');

class PCMManager {
  constructor() {
    this.activeDevices = new Map(); // id -> { instance, stdin }
    this.deviceVolumes = new Map(); // id -> volume
  }

  setupDevice(deviceId, initialVolume = 20) {
    debug('Setting up PCM device:', deviceId);
    
    if (this.activeDevices.has(deviceId)) {
      debug('Device already exists:', deviceId);
      return this.activeDevices.get(deviceId);
    }

    this.deviceVolumes.set(deviceId, initialVolume);

    return new Promise((resolve, reject) => {
      try {
        const instance = spawn("aplay", [
          '-D', deviceId,
          '-c', "2",
          '-f', "S16_LE",
          '-r', "44100"
        ]);

        instance.on('error', (err) => {
          debug('Error on PCM device %s: %s', deviceId, err);
          this.cleanup(deviceId);
          reject(err);
        });

        instance.stderr.on('data', (data) => {
          debug('aplay stderr (%s): %s', deviceId, data.toString());
        });

        const deviceInfo = {
          instance,
          stdin: instance.stdin
        };

        this.activeDevices.set(deviceId, deviceInfo);
        resolve(deviceInfo);

      } catch (err) {
        debug('Failed to setup PCM device:', err);
        reject(err);
      }
    });
  }

  setVolume(deviceId, volume) {
    debug('Setting volume for PCM device %s to %d', deviceId, volume);
    this.deviceVolumes.set(deviceId, volume);
    
    // Note: This might need to be adjusted based on your sound card
    const amixer = spawn("amixer", [
      '-c', "1",
      '--', "sset",
      'Speaker', volume + "%"
    ]);

    amixer.stderr.on('data', (data) => {
      debug('amixer stderr:', data.toString());
    });

    return true;
  }

  getVolume(deviceId) {
    return this.deviceVolumes.get(deviceId) || 20;
  }

  getInputStream(deviceId) {
    const device = this.activeDevices.get(deviceId);
    return device ? device.stdin : null;
  }

  cleanup(deviceId) {
    debug('Cleaning up PCM device:', deviceId);
    const device = this.activeDevices.get(deviceId);
    if (device) {
      device.instance.kill();
      this.activeDevices.delete(deviceId);
      this.deviceVolumes.delete(deviceId);
    }
  }

  cleanupAll() {
    debug('Cleaning up all PCM devices');
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
}

module.exports = PCMManager;