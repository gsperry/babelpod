"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCMManager = void 0;
const child_process_1 = require("child_process");
const debug_1 = __importDefault(require("debug"));
const config_1 = require("../config");
const logger = (0, debug_1.default)('babelpod:pcm');
class PCMManager {
    constructor() {
        this.activeDevices = new Map();
        this.deviceVolumes = new Map();
    }
    async setupDevice(deviceId, initialVolume = config_1.config.pcm.defaultVolume) {
        logger('Setting up PCM device:', deviceId);
        if (this.activeDevices.has(deviceId)) {
            logger('Device already exists:', deviceId);
            return this.activeDevices.get(deviceId);
        }
        this.deviceVolumes.set(deviceId, initialVolume);
        return new Promise((resolve, reject) => {
            try {
                const instance = (0, child_process_1.spawn)("aplay", [
                    '-D', deviceId,
                    '-c', config_1.config.audio.channels.toString(),
                    '-f', config_1.config.audio.format,
                    '-r', config_1.config.audio.sampleRate.toString()
                ]);
                instance.on('error', (err) => {
                    logger('Error on PCM device %s: %s', deviceId, err);
                    this.cleanup(deviceId);
                    reject(err);
                });
                instance.stderr?.on('data', (data) => {
                    logger('aplay stderr (%s): %s', deviceId, data.toString());
                });
                const deviceInfo = {
                    instance,
                    stdin: instance.stdin
                };
                this.activeDevices.set(deviceId, deviceInfo);
                resolve(deviceInfo);
            }
            catch (err) {
                logger('Failed to setup PCM device:', err);
                reject(err);
            }
        });
    }
    setVolume(deviceId, volume) {
        logger('Setting volume for PCM device %s to %d', deviceId, volume);
        this.deviceVolumes.set(deviceId, volume);
        try {
            const amixer = (0, child_process_1.spawn)("amixer", [
                '-c', config_1.config.pcm.cardNumber.toString(),
                '--', "sset",
                config_1.config.pcm.mixerControl,
                `${volume}%`
            ]);
            amixer.stderr.on('data', (data) => {
                logger('amixer stderr:', data.toString());
            });
            return true;
        }
        catch (err) {
            logger('Failed to set volume:', err);
            return false;
        }
    }
    getVolume(deviceId) {
        return this.deviceVolumes.get(deviceId) || config_1.config.pcm.defaultVolume;
    }
    getInputStream(deviceId) {
        const device = this.activeDevices.get(deviceId);
        return device ? device.stdin : null;
    }
    cleanup(deviceId) {
        logger('Cleaning up PCM device:', deviceId);
        const device = this.activeDevices.get(deviceId);
        if (device) {
            try {
                device.instance.kill();
            }
            catch (err) {
                logger('Error killing PCM device:', err);
            }
            this.activeDevices.delete(deviceId);
            this.deviceVolumes.delete(deviceId);
        }
    }
    cleanupAll() {
        logger('Cleaning up all PCM devices');
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
exports.PCMManager = PCMManager;
