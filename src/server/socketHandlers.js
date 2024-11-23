const debug = require('debug')('babelpod:socket');

class SocketHandler {
  constructor(io, deviceManagers, deviceDiscovery) {
    debug('Initializing SocketHandler');
    this.io = io;
    this.airplayManager = deviceManagers.airplayManager;
    this.pcmManager = deviceManagers.pcmManager;
    this.inputManager = deviceManagers.inputManager;
    this.deviceDiscovery = deviceDiscovery;

    this.deviceDiscovery.on('devicesUpdated', (devices) => {
      debug('Devices updated, broadcasting');
      this.broadcastDevices(devices);
    });
  }

  setup() {
    debug('Setting up socket handlers');
    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  handleConnection(socket) {
    debug('Client connected');

    // Send initial state
    const devices = this.deviceDiscovery.getDevices();
    debug('Sending initial devices state');
    socket.emit('available_inputs', devices.inputs);
    socket.emit('available_outputs', devices.outputs);
    socket.emit('switched_input', this.inputManager.getCurrentInput());
    
    const activeOutputs = [
      ...this.airplayManager.getActiveDevices(),
      ...this.pcmManager.getActiveDevices()
    ];
    debug('Sending initial active outputs:', activeOutputs);
    socket.emit('switched_outputs', activeOutputs);

    // Send current volumes
    this.sendCurrentVolumes(socket);

    // Set up event handlers
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('switch_input', (msg) => this.handleSwitchInput(socket, msg));
    socket.on('switch_outputs', (outputs) => this.handleSwitchOutputs(socket, outputs));
    socket.on('change_output_volume', (data) => this.handleVolumeChange(socket, data));
  }

  handleSwitchInput(socket, deviceId) {
    debug('Switching input to:', deviceId);
    
    const inputStream = this.inputManager.switchInput(deviceId);
    if (inputStream) {
      debug('Got new input stream, updating AirPlay devices');
      this.airplayManager.updateStreamToDevice(inputStream);

      // Handle PCM devices
      this.pcmManager.getActiveDevices().forEach(pcmDeviceId => {
        const pcmInputStream = this.pcmManager.getInputStream(pcmDeviceId);
        if (pcmInputStream) {
          inputStream.pipe(pcmInputStream);
        }
      });
    }

    this.io.emit('switched_input', deviceId);
  }

  async handleSwitchOutputs(socket, outputIds) {
    debug('Switching outputs:', outputIds);

    // Clean up removed outputs
    const currentAirplayDevices = this.airplayManager.getActiveDevices();
    const currentPcmDevices = this.pcmManager.getActiveDevices();

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

    // Setup new outputs
    for (const deviceId of outputIds) {
      if (deviceId === 'void') continue;

      try {
        if (deviceId.startsWith('airplay')) {
          const [, host, port] = deviceId.split('_');
          if (!this.airplayManager.isActive(deviceId)) {
            await this.airplayManager.setupDevice(deviceId, host, port);
          }
        } else if (deviceId.startsWith('plughw:')) {
          if (!this.pcmManager.isActive(deviceId)) {
            await this.pcmManager.setupDevice(deviceId);
          }
        }
      } catch (err) {
        debug('Failed to setup device:', deviceId, err);
      }
    }

    this.io.emit('switched_outputs', outputIds);
  }

  handleVolumeChange(socket, data) {
    const { id, volume } = data;
    debug('Changing volume for device %s to %d', id, volume);

    if (id.startsWith('airplay')) {
      this.airplayManager.setVolume(id, volume);
    } else if (id.startsWith('plughw:')) {
      this.pcmManager.setVolume(id, volume);
    }

    this.io.emit('changed_output_volume', { id, volume });
  }

  handleDisconnect(socket) {
    debug('Client disconnected');
  }

  broadcastDevices(devices) {
    debug('Broadcasting updated device list');
    this.io.emit('available_inputs', devices.inputs);
    this.io.emit('available_outputs', devices.outputs);
  }

  sendCurrentVolumes(socket) {
    debug('Sending current volumes');
    // Send AirPlay volumes
    this.airplayManager.getActiveDevices().forEach(deviceId => {
      socket.emit('changed_output_volume', {
        id: deviceId,
        volume: this.airplayManager.getVolume(deviceId)
      });
    });

    // Send PCM volumes
    this.pcmManager.getActiveDevices().forEach(deviceId => {
      socket.emit('changed_output_volume', {
        id: deviceId,
        volume: this.pcmManager.getVolume(deviceId)
      });
    });
  }
}

module.exports = SocketHandler;