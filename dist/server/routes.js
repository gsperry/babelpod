import { join } from 'path';
import debugModule from 'debug';
const logger = debugModule('babelpod:server');
export function setupRoutes(app, deviceManagers) {
    const { airplayManager, pcmManager, inputManager } = deviceManagers;
    app.get('/', (_req, res) => {
        res.sendFile(join(__dirname, '../../public/index.html'));
    });
    app.get('/stats', (_req, res) => {
        // Convert Map to plain object for JSON serialization
        const airplayVolumes = Object.fromEntries(Array.from(airplayManager.getActiveDevices())
            .map(deviceId => [deviceId, airplayManager.getVolume(deviceId)]));
        const pcmVolumes = Object.fromEntries(Array.from(pcmManager.getActiveDevices())
            .map(deviceId => [deviceId, pcmManager.getVolume(deviceId)]));
        const stats = {
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
