const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const debug = require('debug')('babelpod');

// Import configuration
const { config } = require('./src/config');

// Import managers and handlers
const AirplayManager = require('./src/devices/airplay');
const PCMManager = require('./src/devices/pcm');
const InputStreamManager = require('./src/streams/inputStream');
const DeviceDiscovery = require('./src/discovery/deviceDiscovery');
const setupRoutes = require('./src/server/routes');
const SocketHandler = require('./src/server/socketHandlers');

// Create instances of managers
const airplayManager = new AirplayManager();
const pcmManager = new PCMManager();
const inputManager = new InputStreamManager();
const deviceDiscovery = new DeviceDiscovery();

// Bundle managers for dependency injection
const deviceManagers = {
  airplayManager,
  pcmManager,
  inputManager
};

// Set up express middleware
app.use(express.json());
app.use(express.static('public'));

// Set up routes
setupRoutes(app, deviceManagers);

// Set up socket handlers
const socketHandler = new SocketHandler(io, deviceManagers, deviceDiscovery);
socketHandler.setup();

// Start device discovery
deviceDiscovery.start();

// Error handling
process.on('uncaughtException', (err) => {
  debug('Uncaught Exception:', err);
  // Perform cleanup
  deviceDiscovery.stop();
  airplayManager.cleanupAll();
  pcmManager.cleanupAll();
  inputManager.cleanup();
});

process.on('SIGTERM', () => {
  debug('Received SIGTERM');
  // Perform cleanup
  deviceDiscovery.stop();
  airplayManager.cleanupAll();
  pcmManager.cleanupAll();
  inputManager.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  debug('Received SIGINT');
  // Perform cleanup
  deviceDiscovery.stop();
  airplayManager.cleanupAll();
  pcmManager.cleanupAll();
  inputManager.cleanup();
  process.exit(0);
});

// Start server
http.listen(config.server.port, config.server.host, () => {
  debug(`Server running at http://${config.server.host}:${config.server.port}/`);
});

// Export for testing
module.exports = {
  app,
  io,
  deviceManagers,
  deviceDiscovery
};