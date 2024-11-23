const mdns = require('mdns-js');
const fs = require('fs');
const debug = require('debug')('babelpod:discovery');
const EventEmitter = require('events');

class DeviceDiscovery extends EventEmitter {
  constructor() {
    super();
    this.availablePcmOutputs = [];
    this.availablePcmInputs = [];
    this.availableAirplayOutputs = [];
    this.searchInterval = null;
    this.browser = null;
  }

  start() {
    debug('Starting device discovery');
    this.startPCMDiscovery();
    this.startAirplayDiscovery();
  }

  startPCMDiscovery() {
    debug('Starting PCM device discovery');
    this.searchPCMDevices();
    this.searchInterval = setInterval(() => this.searchPCMDevices(), 10000);
  }

  startAirplayDiscovery() {
    debug('Starting AirPlay device discovery');
    this.browser = mdns.createBrowser(mdns.tcp('raop'));
    
    this.browser.on('ready', () => {
      debug('MDNS browser ready');
      this.browser.discover();
    });

    this.browser.on('update', (data) => {
      if (data.fullname) {
        const splitName = /([^@]+)@(.*)\._raop\._tcp\.local/.exec(data.fullname);
        if (splitName != null && splitName.length > 1) {
          const id = `airplay_${data.addresses[0]}_${data.port}`;

          if (!this.availableAirplayOutputs.some(e => e.id === id)) {
            const device = {
              name: `AirPlay: ${splitName[2]}`,
              id: id,
              type: 'airplay',
              host: data.addresses[0],
              port: data.port
            };
            
            debug('Found new AirPlay device:', device);
            this.availableAirplayOutputs.push(device);
            this.emit('devicesUpdated', this.getDevices());
          }
        }
      }
    });
  }

  searchPCMDevices() {
    try {
      const pcmDevicesString = fs.readFileSync('/proc/asound/pcm', 'utf8');
      const pcmDevicesArray = pcmDevicesString.split("\n").filter(line => line != "");
      
      const pcmDevices = pcmDevicesArray.map(device => {
        const splitDev = device.split(":");
        return {
          id: "plughw:" + splitDev[0].split("-").map(num => parseInt(num, 10)).join(","),
          name: splitDev[2].trim(),
          output: splitDev.some(part => part.includes("playback")),
          input: splitDev.some(part => part.includes("capture")),
          type: 'pcm'
        };
      });

      this.availablePcmOutputs = pcmDevices.filter(dev => dev.output);
      this.availablePcmInputs = pcmDevices.filter(dev => dev.input);
      
      debug('Found PCM devices - Outputs:', this.availablePcmOutputs.length, 
            'Inputs:', this.availablePcmInputs.length);
      
      this.emit('devicesUpdated', this.getDevices());
    } catch (e) {
      debug("Failed to read PCM devices:", e);
    }
  }

  getDevices() {
    return {
      inputs: [
        { name: 'None', id: 'void', type: 'void' },
        ...this.availablePcmInputs
      ],
      outputs: [
        { name: 'None', id: 'void', type: 'void' },
        ...this.availablePcmOutputs,
        ...this.availableAirplayOutputs
      ]
    };
  }

  stop() {
    debug('Stopping device discovery');
    if (this.searchInterval) {
      clearInterval(this.searchInterval);
      this.searchInterval = null;
    }
    if (this.browser) {
      this.browser.stop();
      this.browser = null;
    }
  }
}

module.exports = DeviceDiscovery;