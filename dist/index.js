"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceDiscovery = exports.deviceManagers = exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const debug_1 = __importDefault(require("debug"));
const path_1 = require("path");
// Import configuration
const config_1 = require("./config");
// Import managers and handlers
const airplay_1 = require("./devices/airplay");
const pcm_1 = require("./devices/pcm");
const inputStream_1 = require("./streams/inputStream");
const deviceDiscovery_1 = require("./discovery/deviceDiscovery");
const routes_1 = require("./server/routes");
const socketHandlers_1 = require("./server/socketHandlers");
const logger = (0, debug_1.default)('babelpod');
// Create express app and http server
const app = (0, express_1.default)();
exports.app = app;
const http = (0, http_1.createServer)(app);
// Initialize Socket.IO with CORS and other options
const io = new socket_io_1.Server(http, {
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
exports.io = io;
// Create instances of managers
const airplayManager = new airplay_1.AirplayManager();
const pcmManager = new pcm_1.PCMManager();
const inputManager = new inputStream_1.InputStreamManager(config_1.config.audio);
const deviceDiscovery = new deviceDiscovery_1.DeviceDiscovery();
exports.deviceDiscovery = deviceDiscovery;
// Bundle managers for dependency injection
const deviceManagers = {
    airplayManager,
    pcmManager,
    inputManager
};
exports.deviceManagers = deviceManagers;
// Set up express middleware
app.use(express_1.default.json());
// Handle static files and routing based on environment
if (process.env.NODE_ENV === 'production') {
    logger('Serving static files from dist directory');
    app.use(express_1.default.static((0, path_1.join)(__dirname, '../dist')));
    // Serve index.html for any unknown paths (for client-side routing)
    app.get('*', (_req, res) => {
        res.sendFile((0, path_1.join)(__dirname, '../dist/index.html'));
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
(0, routes_1.setupRoutes)(app, deviceManagers);
// Set up socket handlers
const socketHandler = new socketHandlers_1.SocketHandler(io, deviceManagers, deviceDiscovery);
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
http.listen(config_1.config.server.port, config_1.config.server.host, () => {
    logger(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    logger(`Server listening at http://${config_1.config.server.host}:${config_1.config.server.port}/`);
});
