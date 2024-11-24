import { Readable } from 'stream';
import { spawn, ChildProcess } from 'child_process';
import debugModule from 'debug';
import { FromVoid } from './voidStreams';
import { AudioConfig } from '../../types';

const logger: debugModule.IDebugger = debugModule('babelpod:streams');

export class InputStreamManager {
  private currentInput: string;
  private arecordInstance: ChildProcess | null;
  private inputStream: Readable;
  private audioConfig: AudioConfig;

  constructor(audioConfig: AudioConfig) {
    this.currentInput = "void";
    this.arecordInstance = null;
    this.inputStream = new FromVoid();
    this.audioConfig = audioConfig;
    logger('InputStreamManager initialized');
  }

  getCurrentInput(): string {
    return this.currentInput;
  }

  getCurrentStream(): Readable {
    return this.inputStream;
  }

  switchInput(deviceId: string): Readable {
    logger('Switching input to:', deviceId);
    this.currentInput = deviceId;
    
    this.cleanup();
    
    if (deviceId === "void") {
      logger('Setting up void input');
      this.inputStream = new FromVoid();
    } else {
      logger('Starting arecord with device:', deviceId);
      this.arecordInstance = spawn("arecord", [
        '-D', deviceId,
        '-c', this.audioConfig.channels.toString(),
        '-f', this.audioConfig.format,
        '-r', this.audioConfig.sampleRate.toString()
      ]);
      
      this.arecordInstance.stderr?.on('data', (data: Buffer) => {
        logger('arecord stderr:', data.toString());
      });

      this.arecordInstance.on('error', (err: Error) => {
        logger('arecord error:', err);
      });

      this.arecordInstance.on('exit', (code: number | null) => {
        logger('arecord exited with code:', code);
      });

      if (!this.arecordInstance.stdout) {
        logger('Failed to create arecord stdout stream');
        // Fallback to void stream if stdout is null
        this.inputStream = new FromVoid();
      } else {
        this.inputStream = this.arecordInstance.stdout;
        logger('Created new input stream');
      }
    }

    return this.inputStream;
  }
  cleanup(): void {
    logger('Cleaning up input stream');
    if (this.arecordInstance) {
      logger('Killing arecord instance');
      this.arecordInstance.kill();
      this.arecordInstance = null;
    }
  }
}