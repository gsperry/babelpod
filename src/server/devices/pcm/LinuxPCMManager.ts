// src/server/devices/pcm/LinuxPCMManager.ts
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { PCMManager } from './PCMManager';
import { PCMConnection, PCMDevice } from '../../../types';
import { config } from '../../config';
import debugModule from 'debug';
import { Writable } from 'stream';

const logger = debugModule('babelpod:pcm:linux');

export class LinuxPCMManager extends PCMManager {
  async setupDevice(deviceId: string, initialVolume = config.pcm.defaultVolume): Promise<PCMConnection> {
    logger('Setting up PCM device on Linux:', deviceId);

    if (this.activeDevices.has(deviceId)) {
      logger('Device already exists:', deviceId);
      return this.activeDevices.get(deviceId)!;
    }

    try {
      logger('Starting aplay process with device:', deviceId);
      const instance = spawn('aplay', [
        '-D', deviceId,
        '-c', config.audio.channels.toString(),
        '-f', config.audio.format,
        '-r', config.audio.sampleRate.toString()
      ]);

      // Set up error handling for the spawned process
      instance.on('error', (err) => {
        logger('Error in aplay process:', err);
        this.cleanup(deviceId);
      });

      instance.stderr?.on('data', (data: Buffer) => {
        logger('aplay stderr:', data.toString());
      });

      instance.on('exit', (code) => {
        logger('aplay process exited with code:', code);
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
      return new Promise((resolve, reject) => {
        const amixer = spawn('amixer', [
          '-D', deviceId,
          'set', config.pcm.mixerControl,
          `${volume}%`
        ]);

        let errorOutput = '';

        amixer.stderr?.on('data', (data: Buffer) => {
          errorOutput += data.toString();
          logger('amixer stderr:', data.toString());
        });

        amixer.on('error', (err) => {
          logger('Error in amixer process:', err);
          reject(err);
        });

        amixer.on('close', (code) => {
          if (code === 0) {
            this.deviceVolumes.set(deviceId, volume);
            logger('Successfully set volume for device:', deviceId);
            resolve(true);
          } else {
            logger('Failed to set volume. Exit code:', code);
            logger('Error output:', errorOutput);
            resolve(false);
          }
        });
      });
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
      const pcmDevicesString = readFileSync('/proc/asound/pcm', 'utf8');
      const devices: PCMDevice[] = pcmDevicesString
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [cardInfo, , name] = line.split(':');
          const [card, device] = cardInfo.trim().split('-').map(num => 
            parseInt(num, 10)
          );
          
          const id = `hw:${card},${device}`;
          const hasPlayback = line.includes('playback');
          const hasCapture = line.includes('capture');

          logger('Found PCM device:', {
            id,
            name: name.trim(),
            playback: hasPlayback,
            capture: hasCapture
          });

          return {
            id,
            name: name.trim(),
            type: 'pcm' as const,
            input: hasCapture,
            output: hasPlayback
          };
        });

      // Emit the found devices
      this.emit('devicesFound', devices);
      logger('Found %d PCM devices', devices.length);
    } catch (err) {
      logger('Failed to scan PCM devices:', err);
      this.emit('devicesFound', []);
    }
  }

  // Override cleanup to add Linux-specific cleanup
  cleanup(deviceId: string): void {
    logger('Cleaning up Linux PCM device:', deviceId);
    const connection = this.activeDevices.get(deviceId);
    if (connection) {
      try {
        // Try to reset the volume before cleanup
        spawn('amixer', [
          '-D', deviceId,
          'set', config.pcm.mixerControl,
          '0%'
        ]);

        // Kill the aplay process if it exists
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