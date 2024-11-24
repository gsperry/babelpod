import { Application, Request, Response } from 'express';
import { join } from 'path';
import debugModule from 'debug';
import { DeviceManagers } from '../types';

const logger = debugModule('babelpod:server');

interface DeviceStats {
  airplay: {
    activeDevices: string[];
    volumes: Record<string, number>;
  };
  pcm: {
    activeDevices: string[];
    volumes: Record<string, number>;
  };
  input: {
    currentDevice: string;
  };
}

export function setupRoutes(app: Application, deviceManagers: DeviceManagers): Application {
  const { airplayManager, pcmManager, inputManager } = deviceManagers;

  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(join(__dirname, '../../public/index.html'));
  });

  app.get('/stats', (_req: Request, res: Response) => {
    // Convert Map to plain object for JSON serialization
    const airplayVolumes = Object.fromEntries(
      Array.from(airplayManager.getActiveDevices())
        .map(deviceId => [deviceId, airplayManager.getVolume(deviceId)])
    );

    const pcmVolumes = Object.fromEntries(
      Array.from(pcmManager.getActiveDevices())
        .map(deviceId => [deviceId, pcmManager.getVolume(deviceId)])
    );

    const stats: DeviceStats = {
      airplay: {
        activeDevices: airplayManager.getActiveDevices(),
        volumes: airplayVolumes
      },
      pcm: {
        activeDevices: pcmManager.getActiveDevices(),
        volumes: pcmVolumes
      },
      input: {
        currentDevice: inputManager.getCurrentInput()
      }
    };

    logger('Stats requested:', stats);
    res.json(stats);
  });

  return app;
}