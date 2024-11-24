import { Writable, Readable } from 'stream';
import debugModule from 'debug';
const logger = debugModule('babelpod:streams');
export class ToVoid extends Writable {
    constructor() {
        super();
        logger('Creating new ToVoid stream');
    }
    _write(_chunk, _encoding, callback) {
        callback();
    }
}
export class FromVoid extends Readable {
    constructor() {
        super();
        logger('Creating new FromVoid stream');
    }
    _read(_size) {
        // No-op as this is a void stream
    }
}
