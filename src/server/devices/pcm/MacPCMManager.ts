// src/server/devices/pcm/MacPCMManager.ts
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { PCMManager } from './PCMManager';
import { PCMConnection, PCMDevice } from '../../../types';
import { config } from '../../config';
import debugModule from 'debug';
import { Writable } from 'stream';

const logger = debugModule('babelpod:pcm:mac');
const execFileAsync = promisify(execFile);

export class MacPCMManager extends PCMManager {
  async setupDevice(deviceId: string, initialVolume = config.pcm.defaultVolume): Promise<PCMConnection> {
    logger('Setting up PCM device on macOS:', deviceId);

    if (this.activeDevices.has(deviceId)) {
      logger('Device already exists:', deviceId);
      return this.activeDevices.get(deviceId)!;
    }

    try {
      // First, get the device details to ensure it exists
      const deviceInfo = await this.getDeviceInfo(deviceId);
      if (!deviceInfo) {
        throw new Error(`Device not found: ${deviceId}`);
      }

      logger('Starting sox process for device:', deviceId);
      // Start audio process using sox
      const instance = spawn('sox', [
        '--default-device',  // Use system default device
        '--type', 'coreaudio',
        deviceId,
        '--type', 'raw',
        '--bits', '16',
        '--encoding', 'signed-integer',
        '--channels', config.audio.channels.toString(),
        '--rate', config.audio.sampleRate.toString(),
        '-'  // Output to stdout
      ]);

      // Set up error handling for the spawned process
      instance.on('error', (err) => {
        logger('Error in sox process:', err);
        this.cleanup(deviceId);
      });

      instance.stderr?.on('data', (data: Buffer) => {
        logger('sox stderr:', data.toString());
      });

      instance.on('exit', (code) => {
        logger('sox process exited with code:', code);
        if (code !== 0) {
          this.cleanup(deviceId);
        }
      });

      const connection: PCMConnection = {
        instance,
        stdin: instance.stdin,
        deviceId
      };

      this.activeDevices.set(deviceId, connection);
      this.deviceVolumes.set(deviceId, initialVolume);
      
      // Set initial volume
      await this.setVolume(deviceId, initialVolume);
      
      logger('Successfully set up PCM device:', deviceId);
      return connection;
    } catch (err) {
      logger('Failed to setup PCM device:', err);
      throw new Error(`Failed to setup PCM device: ${err}`);
    }
  }

  async setVolume(deviceId: string, volume: number): Promise<boolean> {
    logger('Setting volume for device %s to %d', deviceId, volume);
    
    try {
      // Using osascript to control volume
      await execFileAsync('osascript', [
        '-e', `set volume output volume ${volume}`
      ]);
      
      this.deviceVolumes.set(deviceId, volume);
      logger('Successfully set volume for device:', deviceId);
      return true;
    } catch (err) {
      logger('Failed to set volume:', err);
      return false;
    }
  }

  getInputStream(deviceId: string): Writable | null {
    const connection = this.activeDevices.get(deviceId);
    if (!connection) {
      logger('No active connection found for device:', deviceId);
      return null;
    }
    return connection.stdin;
  }

  async scanDevices(): Promise<void> {
    logger('Scanning for PCM devices');
    try {
      // Using system_profiler to get audio device information
      const { stdout } = await execFileAsync('system_profiler', 
        ['SPAudioDataType', '-json']);
      
      const audioData = JSON.parse(stdout);
      const devices: PCMDevice[] = [];

      // Process each audio device
      for (const device of audioData.SPAudioDataType) {
        // Skip Bluetooth devices as they're handled separately
        if (device['coreaudio_device_transport'] === 'bluetooth') {
          continue;
        }

        // Create a PCM device entry
        const pcmDevice: PCMDevice = {
          id: `coreaudio:${device._name}`,
          name: device._name,
          type: 'pcm' as const,
          input: device['coreaudio_device_input'] === 'yes',
          output: device['coreaudio_device_output'] === 'yes'
        };

        logger('Found PCM device:', pcmDevice);
        devices.push(pcmDevice);
      }

      // Emit the found devices
      this.emit('devicesFound', devices);
      logger('Found %d PCM devices', devices.length);
    } catch (err) {
      logger('Failed to scan PCM devices:', err);
      this.emit('devicesFound', []);
    }
  }

  private async getDeviceInfo(deviceId: string): Promise<any> {
    try {
      const { stdout } = await execFileAsync('system_profiler', 
        ['SPAudioDataType', '-json']);
      
      const audioData = JSON.parse(stdout);
      const deviceName = deviceId.replace('coreaudio:', '');
      
      return audioData.SPAudioDataType.find(
        (device: any) => device._name === deviceName
      );
    } catch (err) {
      logger('Failed to get device info:', err);
      return null;
    }
  }

  // Override cleanup to add macOS-specific cleanup
  cleanup(deviceId: string): void {
    logger('Cleaning up macOS PCM device:', deviceId);
    const connection = this.activeDevices.get(deviceId);
    if (connection) {
      try {
        // Try to reset the volume before cleanup
        execFileAsync('osascript', [
          '-e', 'set volume output volume 0'
        ]).catch(err => logger('Error resetting volume:', err));

        // Kill the sox process if it exists
        if (connection.instance) {
          connection.instance.kill('SIGTERM');
        }

        // Close the stdin stream if it exists
        if (connection.stdin) {
          connection.stdin.end();
        }
      } catch (err) {
        logger('Error during cleanup:', err);
      } finally {
        this.activeDevices.delete(deviceId);
        this.deviceVolumes.delete(deviceId);
      }
    }
  }
}