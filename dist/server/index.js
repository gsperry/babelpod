import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import debugModule from 'debug';
import { join } from 'path';
// Import configuration
import { config } from './config';
// Import managers and handlers
import { AirplayManager } from './devices/airplay';
import { PCMManager } from './devices/pcm';
import { InputStreamManager } from './streams/inputStream';
import { DeviceDiscovery } from './discovery/deviceDiscovery';
import { setupRoutes } from './routes';
import { SocketHandler } from './socketHandlers';
const logger = debugModule('babelpod');
// Create express app and http server
const app = express();
const http = createServer(app);
// Initialize Socket.IO with CORS and other options
const io = new SocketIOServer(http, {
    cors: {
        origin: process.env.NODE_ENV === 'development'
            ? ["http://localhost:5173"] // Vite dev server port
            : false,
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});
// Create instances of managers
const airplayManager = new AirplayManager();
const pcmManager = new PCMManager();
const inputManager = new InputStreamManager(config.audio);
const deviceDiscovery = new DeviceDiscovery();
// Bundle managers for dependency injection
const deviceManagers = {
    airplayManager,
    pcmManager,
    inputManager
};
// Set up express middleware
app.use(express.json());
// Handle static files and routing based on environment
if (process.env.NODE_ENV === 'production') {
    logger('Serving static files from dist directory');
    app.use(express.static(join(__dirname, '../dist')));
    // Serve index.html for any unknown paths (for client-side routing)
    app.get('*', (_req, res) => {
        res.sendFile(join(__dirname, '../dist/index.html'));
    });
}
else {
    logger('Running in development mode - static files served by Vite');
    // Set up CORS for development
    app.use((_req, res, next) => {
        res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        next();
    });
}
// Set up routes
setupRoutes(app, deviceManagers);
// Set up socket handlers
const socketHandler = new SocketHandler(io, deviceManagers, deviceDiscovery);
socketHandler.setup();
// Start device discovery
deviceDiscovery.start();
// Error handling
process.on('uncaughtException', (err) => {
    logger('Uncaught Exception:', err);
    // Perform cleanup
    deviceDiscovery.stop();
    airplayManager.cleanupAll();
    pcmManager.cleanupAll();
    inputManager.cleanup();
    process.exit(1);
});
process.on('SIGTERM', () => {
    logger('Received SIGTERM');
    // Perform cleanup
    deviceDiscovery.stop();
    airplayManager.cleanupAll();
    pcmManager.cleanupAll();
    inputManager.cleanup();
    process.exit(0);
});
process.on('SIGINT', () => {
    logger('Received SIGINT');
    // Perform cleanup
    deviceDiscovery.stop();
    airplayManager.cleanupAll();
    pcmManager.cleanupAll();
    inputManager.cleanup();
    process.exit(0);
});
// Start server
http.listen(config.server.port, config.server.host, () => {
    logger(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    logger(`Server listening at http://${config.server.host}:${config.server.port}/`);
});
// Export for testing
export { app, io, deviceManagers, deviceDiscovery };
