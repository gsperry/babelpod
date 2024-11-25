import express from 'express';
import type { Express } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import debugModule from 'debug';
import { join } from 'path';

// Import configuration
import { config } from './config';

// Import managers and handlers
import { 
  AirplayManager, 
  createPCMManager,
  createBluetoothManager 
} from './devices';
import { InputStreamManager } from './streams/inputStream';
import { DeviceDiscovery } from './discovery/deviceDiscovery';
import { setupRoutes } from './routes';
import { SocketHandler } from './socketHandlers';
import { DeviceManagers } from '../types';

const logger = debugModule('babelpod');
const isProd = process.env.NODE_ENV === 'production';

// Create express app and http server
const app: Express = express();
const http = createServer(app);

// Initialize Socket.IO with environment-specific config
const io = new SocketIOServer(http, {
  cors: isProd ? {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost'],
    methods: ["GET", "POST"],
    credentials: true
  } : {
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
const pcmManager = createPCMManager();
const inputManager = new InputStreamManager(config.audio);
const bluetoothManager = createBluetoothManager();
const deviceDiscovery = new DeviceDiscovery();

// Bundle managers for dependency injection
const deviceManagers: DeviceManagers = {
  airplayManager,
  pcmManager,
  inputManager,
  bluetoothManager
};

// Request logging middleware
app.use((req, res, next) => {
  logger(`${req.method} ${req.path}`);
  next();
});

// Body parsing middleware
app.use(express.json());

if (isProd) {
  logger('Running in production mode');
  
  // Log the directory we're serving from
  const clientDir = join(__dirname, '../../dist/client');
  logger('Serving static files from:', clientDir);
  
  // Serve static files from the production build
  app.use(express.static(clientDir));
  
  // Handle CORS for production
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost'];
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

  // Set up API routes
  setupRoutes(app, deviceManagers);

  // Serve index.html for any unknown paths (client-side routing)
  app.get('*', (_req, res) => {
    logger('Serving index.html for path:', _req.path);
    res.sendFile(join(clientDir, 'index.html'));
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

  // Set up API routes
  setupRoutes(app, deviceManagers);
}

// Set up socket handlers
const socketHandler = new SocketHandler(io, deviceManagers, deviceDiscovery);
socketHandler.setup();

// Start device discovery
deviceDiscovery.start();

// Error handling
process.on('uncaughtException', (err: Error) => {
  logger('Uncaught Exception:', err);
  cleanup();
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
  bluetoothManager.cleanupAll();
  process.exit(0);
}

// Start server with proper host binding
const serverHost = isProd ? '0.0.0.0' : 'localhost';
const port = config.server.port || 3000;

http.listen(port, serverHost, () => {
  logger(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  logger(`Server listening at http://${serverHost}:${port}/`);
});

// Export for testing
export {
  app,
  io,
  deviceManagers,
  deviceDiscovery
};