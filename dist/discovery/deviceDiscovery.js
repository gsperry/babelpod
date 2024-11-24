"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceDiscovery = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const debug_1 = __importDefault(require("debug"));
const config_1 = require("../config");
const logger = (0, debug_1.default)('babelpod:discovery');
// Use require for mdns-js as it's a CommonJS module without types
const mdns = require('mdns-js');
class DeviceDiscovery extends events_1.EventEmitter {
    constructor() {
        super();
        this.availablePcmOutputs = [];
        this.availablePcmInputs = [];
        this.availableAirplayOutputs = [];
        this.searchInterval = null;
        this.browser = null;
    }
    start() {
        logger('Starting device discovery');
        this.startPCMDiscovery();
        this.startAirplayDiscovery();
    }
    startPCMDiscovery() {
        logger('Starting PCM device discovery');
        this.searchPCMDevices();
        this.searchInterval = setInterval(() => this.searchPCMDevices(), config_1.config.discovery.pcmScanInterval);
    }
    startAirplayDiscovery() {
        logger('Starting AirPlay device discovery');
        this.browser = mdns.createBrowser(mdns.tcp(config_1.config.discovery.mdnsType));
        this.browser.on('ready', () => {
            logger('MDNS browser ready');
            this.browser?.discover();
        });
        this.browser.on('update', (data) => {
            if (data.fullname) {
                const splitName = /([^@]+)@(.*)\._raop\._tcp\.local/.exec(data.fullname);
                if (splitName != null && splitName.length > 1) {
                    const id = `airplay_${data.addresses[0]}_${data.port}`;
                    if (!this.availableAirplayOutputs.some(e => e.id === id)) {
                        const device = {
                            name: `AirPlay: ${splitName[2]}`,
                            id,
                            type: 'airplay',
                            host: data.addresses[0],
                            port: data.port
                        };
                        logger('Found new AirPlay device:', device);
                        this.availableAirplayOutputs.push(device);
                        this.emit('devicesUpdated', this.getDevices());
                    }
                }
            }
        });
    }
    searchPCMDevices() {
        try {
            const pcmDevicesString = (0, fs_1.readFileSync)('/proc/asound/pcm', 'utf8');
            const pcmDevicesArray = pcmDevicesString.split("\n").filter(line => line !== "");
            const pcmDevices = pcmDevicesArray.map(device => {
                const splitDev = device.split(":");
                const id = "plughw:" + splitDev[0].split("-").map(num => parseInt(num, 10)).join(",");
                const pcmDevice = {
                    id,
                    name: splitDev[2].trim(),
                    output: splitDev.some(part => part.includes("playback")),
                    input: splitDev.some(part => part.includes("capture")),
                    type: 'pcm'
                };
                return pcmDevice;
            });
            this.availablePcmOutputs = pcmDevices.filter(dev => dev.output);
            this.availablePcmInputs = pcmDevices.filter(dev => dev.input);
            logger('Found PCM devices - Outputs:', this.availablePcmOutputs.length, 'Inputs:', this.availablePcmInputs.length);
            this.emit('devicesUpdated', this.getDevices());
        }
        catch (err) {
            logger("Failed to read PCM devices:", err);
        }
    }
    getDevices() {
        const voidDevice = {
            name: 'None',
            id: 'void',
            type: 'void'
        };
        return {
            inputs: [
                voidDevice,
                ...this.availablePcmInputs
            ],
            outputs: [
                voidDevice,
                ...this.availablePcmOutputs,
                ...this.availableAirplayOutputs
            ]
        };
    }
    stop() {
        logger('Stopping device discovery');
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
exports.DeviceDiscovery = DeviceDiscovery;
