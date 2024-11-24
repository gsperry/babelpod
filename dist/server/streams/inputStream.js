import { spawn } from 'child_process';
import debugModule from 'debug';
import { FromVoid } from './voidStreams';
const logger = debugModule('babelpod:streams');
export class InputStreamManager {
    constructor(audioConfig) {
        this.currentInput = "void";
        this.arecordInstance = null;
        this.inputStream = new FromVoid();
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
            this.inputStream = new FromVoid();
        }
        else {
            logger('Starting arecord with device:', deviceId);
            this.arecordInstance = spawn("arecord", [
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
                this.inputStream = new FromVoid();
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
