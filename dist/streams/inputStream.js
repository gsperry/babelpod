"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputStreamManager = void 0;
const child_process_1 = require("child_process");
const debug_1 = __importDefault(require("debug"));
const voidStreams_1 = require("./voidStreams");
const logger = (0, debug_1.default)('babelpod:streams');
class InputStreamManager {
    constructor(audioConfig) {
        this.currentInput = "void";
        this.arecordInstance = null;
        this.inputStream = new voidStreams_1.FromVoid();
        this.audioConfig = audioConfig;
        logger('InputStreamManager initialized');
    }
    getCurrentInput() {
        return this.currentInput;
    }
    getCurrentStream() {
        return this.inputStream;
    }
    switchInput(deviceId) {
        logger('Switching input to:', deviceId);
        this.currentInput = deviceId;
        this.cleanup();
        if (deviceId === "void") {
            logger('Setting up void input');
            this.inputStream = new voidStreams_1.FromVoid();
        }
        else {
            logger('Starting arecord with device:', deviceId);
            this.arecordInstance = (0, child_process_1.spawn)("arecord", [
                '-D', deviceId,
                '-c', this.audioConfig.channels.toString(),
                '-f', this.audioConfig.format,
                '-r', this.audioConfig.sampleRate.toString()
            ]);
            this.arecordInstance.stderr?.on('data', (data) => {
                logger('arecord stderr:', data.toString());
            });
            this.arecordInstance.on('error', (err) => {
                logger('arecord error:', err);
            });
            this.arecordInstance.on('exit', (code) => {
                logger('arecord exited with code:', code);
            });
            if (!this.arecordInstance.stdout) {
                logger('Failed to create arecord stdout stream');
                // Fallback to void stream if stdout is null
                this.inputStream = new voidStreams_1.FromVoid();
            }
            else {
                this.inputStream = this.arecordInstance.stdout;
                logger('Created new input stream');
            }
        }
        return this.inputStream;
    }
    cleanup() {
        logger('Cleaning up input stream');
        if (this.arecordInstance) {
            logger('Killing arecord instance');
            this.arecordInstance.kill();
            this.arecordInstance = null;
        }
    }
}
exports.InputStreamManager = InputStreamManager;
