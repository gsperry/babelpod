// src/server/socketHandlers.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import debugModule from 'debug';
import { DeviceManagers, Device, DeviceList } from '../types';

const logger = debugModule('babelpod:socket');

interface VolumeChangeData {
  id: string;
  volume: number;
}

interface DeviceDiscoveryEvents {
  on(event: 'devicesUpdated', listener: (devices: DeviceList) => void): this;
  getDevices(): DeviceList;
}

// Extend Socket.IO types for our custom events
interface ServerToClientEvents {
  available_inputs: (inputs: Device[]) => void;
  available_outputs: (outputs: Device[]) => void;
  switched_input: (deviceId: string) => void;
  switched_outputs: (deviceIds: string[]) => void;
  changed_output_volume: (data: VolumeChangeData) => void;
}

interface ClientToServerEvents {
  disconnect: () => void;
  switch_input: (deviceId: string) => void;
  switch_outputs: (outputs: string[]) => void;
  change_output_volume: (data: VolumeChangeData) => void;
}

interface InterServerEvents {
  // Define inter-server events if needed
}

interface SocketData {
  // Define socket data if needed
}

type TypedServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export class SocketHandler {
  private io: TypedServer;
  private airplayManager: DeviceManagers['airplayManager'];
  private pcmManager: DeviceManagers['pcmManager'];
  private inputManager: DeviceManagers['inputManager'];
  private bluetoothManager: DeviceManagers['bluetoothManager'];
  private deviceDiscovery: DeviceDiscoveryEvents;

  constructor(
    io: SocketIOServer, 
    deviceManagers: DeviceManagers, 
    deviceDiscovery: DeviceDiscoveryEvents
  ) {
    logger('Initializing SocketHandler');
    this.io = io as TypedServer;
    this.airplayManager = deviceManagers.airplayManager;
    this.pcmManager = deviceManagers.pcmManager;
    this.inputManager = deviceManagers.inputManager;
    this.bluetoothManager = deviceManagers.bluetoothManager;
    this.deviceDiscovery = deviceDiscovery;

    this.deviceDiscovery.on('devicesUpdated', (devices: DeviceList) => {
      logger('Devices updated, broadcasting');
      this.broadcastDevices(devices);
    });
  }

  setup(): void {
    logger('Setting up socket handlers');
    this.io.on('connection', (socket: TypedSocket) => this.handleConnection(socket));
  }

  private handleConnection(socket: TypedSocket): void {
    logger('Client connected');

    // Send initial state
    const devices = this.deviceDiscovery.getDevices();
    logger('Sending initial devices state');
    socket.emit('available_inputs', devices.inputs);
    socket.emit('available_outputs', devices.outputs);
    socket.emit('switched_input', this.inputManager.getCurrentInput());
    
    const activeOutputs = [
      ...this.airplayManager.getActiveDevices(),
      ...this.pcmManager.getActiveDevices(),
      ...this.bluetoothManager.getActiveDevices()
    ];
    logger('Sending initial active outputs:', activeOutputs);
    socket.emit('switched_outputs', activeOutputs);

    // Send current volumes
    this.sendCurrentVolumes(socket);

    // Set up event handlers
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('switch_input', (deviceId: string) => this.handleSwitchInput(socket, deviceId));
    socket.on('switch_outputs', (outputs: string[]) => this.handleSwitchOutputs(socket, outputs));
    socket.on('change_output_volume', (data: VolumeChangeData) => this.handleVolumeChange(socket, data));
  }

  private handleSwitchInput(_socket: TypedSocket, deviceId: string): void {
    logger('Switching input to:', deviceId);
    
    const inputStream = this.inputManager.switchInput(deviceId);
    if (inputStream) {
      logger('Got new input stream, updating outputs');
      this.airplayManager.updateStreamToDevice(inputStream);

      // Handle PCM devices
      this.pcmManager.getActiveDevices().forEach((pcmDeviceId: string) => {
        const pcmInputStream = this.pcmManager.getInputStream(pcmDeviceId);
        if (pcmInputStream) {
          inputStream.pipe(pcmInputStream);
        }
      });

      // Handle Bluetooth devices
      this.bluetoothManager.getActiveDevices().forEach((bluetoothDeviceId: string) => {
        const bluetoothInputStream = this.bluetoothManager.getInputStream(bluetoothDeviceId);
        if (bluetoothInputStream) {
          inputStream.pipe(bluetoothInputStream);
        }
      });
    }

    this.io.emit('switched_input', deviceId);
  }

  private async handleSwitchOutputs(_socket: TypedSocket, outputIds: string[]): Promise<void> {
    logger('Switching outputs:', outputIds);

    // Clean up removed outputs
    const currentAirplayDevices = this.airplayManager.getActiveDevices();
    const currentPcmDevices = this.pcmManager.getActiveDevices();
    const currentBluetoothDevices = this.bluetoothManager.getActiveDevices();

    for (const deviceId of currentAirplayDevices) {
      if (!outputIds.includes(deviceId)) {
        this.airplayManager.cleanup(deviceId);
      }
    }

    for (const deviceId of currentPcmDevices) {
      if (!outputIds.includes(deviceId)) {
        this.pcmManager.cleanup(deviceId);
      }
    }

    for (const deviceId of currentBluetoothDevices) {
      if (!outputIds.includes(deviceId)) {
        this.bluetoothManager.cleanup(deviceId);
      }
    }

    // Setup new outputs
    for (const deviceId of outputIds) {
      if (deviceId === 'void') continue;

      try {
        if (deviceId.startsWith('airplay')) {
          const [, host, port] = deviceId.split('_');
          if (!this.airplayManager.isActive(deviceId)) {
            await this.airplayManager.setupDevice(deviceId, host, parseInt(port, 10));
          }
        } else if (deviceId.startsWith('plughw:')) {
          if (!this.pcmManager.isActive(deviceId)) {
            await this.pcmManager.setupDevice(deviceId);
          }
        } else if (deviceId.startsWith('bluetooth')) {
          const [, address] = deviceId.split('_');
          if (!this.bluetoothManager.isActive(deviceId)) {
            await this.bluetoothManager.setupDevice(deviceId, address);
          }
        }
      } catch (err) {
        logger('Failed to setup device:', deviceId, err);
      }
    }

    this.io.emit('switched_outputs', outputIds);
  }

  private async handleVolumeChange(_socket: TypedSocket, data: VolumeChangeData): Promise<void> {
    const { id, volume } = data;
    logger('Changing volume for device %s to %d', id, volume);

    try {
      if (id.startsWith('airplay')) {
        await this.airplayManager.setVolume(id, volume);
      } else if (id.startsWith('plughw:')) {
        await this.pcmManager.setVolume(id, volume);
      } else if (id.startsWith('bluetooth')) {
        await this.bluetoothManager.setVolume(id, volume);
      }

      this.io.emit('changed_output_volume', { id, volume });
    } catch (err) {
      logger('Error changing volume:', err);
    }
  }

  private handleDisconnect(_socket: TypedSocket): void {
    logger('Client disconnected');
  }

  private broadcastDevices(devices: DeviceList): void {
    logger('Broadcasting updated device list');
    this.io.emit('available_inputs', devices.inputs);
    this.io.emit('available_outputs', devices.outputs);
  }

  private sendCurrentVolumes(socket: TypedSocket): void {
    logger('Sending current volumes');
    
    // Send AirPlay volumes
    this.airplayManager.getActiveDevices().forEach((deviceId: string) => {
      socket.emit('changed_output_volume', {
        id: deviceId,
        volume: this.airplayManager.getVolume(deviceId)
      });
    });

    // Send PCM volumes
    this.pcmManager.getActiveDevices().forEach((deviceId: string) => {
      socket.emit('changed_output_volume', {
        id: deviceId,
        volume: this.pcmManager.getVolume(deviceId)
      });
    });

    // Send Bluetooth volumes
    this.bluetoothManager.getActiveDevices().forEach((deviceId: string) => {
      socket.emit('changed_output_volume', {
        id: deviceId,
        volume: this.bluetoothManager.getVolume(deviceId)
      });
    });
  }
}