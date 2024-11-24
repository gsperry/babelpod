import { Writable, Readable } from 'stream';
import debugModule from 'debug';

const logger: debugModule.IDebugger = debugModule('babelpod:streams');

export class ToVoid extends Writable {
  constructor() {
    super();
    logger('Creating new ToVoid stream');
  }

  _write(_chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    callback();
  }
}

export class FromVoid extends Readable {
  constructor() {
    super();
    logger('Creating new FromVoid stream');
  }

  _read(_size: number): void {
    // No-op as this is a void stream
  }
}