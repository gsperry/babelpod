import express from 'express';
import type { Express } from 'express';
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
const isProd = process.env.NODE_ENV === 'production';

// Create express app and http server
const app: Express = express();
const http = createServer(app);

// Initialize Socket.IO with environment-specific config
const io = new SocketIOServer(http, {
  cors: isProd ? {
    // In production, specify allowed origins explicitly
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      // Add your production domain(s) here
      'http://your-domain.com',
      'https://your-domain.com'
    ],
    methods: ["GET", "POST"],
    credentials: true
  } : {
    // In development, allow localhost access
    origin: "http://localhost:5173",
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

if (isProd) {
  logger('Running in production mode');
  
  // Serve static files from the production build
  app.use(express.static(join(__dirname, '../client')));
  
  // Handle CORS for production
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      // Add your production domain(s) here
      'http://your-domain.com',
      'https://your-domain.com'
    ];
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve index.html for any unknown paths (client-side routing)
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '../client/index.html'));
  });
} else {
  logger('Running in development mode');
  
  // Development CORS settings
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
process.on('uncaughtException', (err: Error) => {
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
  cleanup();
});

process.on('SIGINT', () => {
  logger('Received SIGINT');
  cleanup();
});

function cleanup() {
  logger('Performing cleanup...');
  deviceDiscovery.stop();
  airplayManager.cleanupAll();
  pcmManager.cleanupAll();
  inputManager.cleanup();
  process.exit(0);
}

// Start server with proper host binding
const serverHost = isProd ? config.server.host : 'localhost';
http.listen(config.server.port, serverHost, () => {
  logger(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  logger(`Server listening at http://${serverHost}:${config.server.port}/`);
});

// Export for testing
export {
  app,
  io,
  deviceManagers,
  deviceDiscovery
};