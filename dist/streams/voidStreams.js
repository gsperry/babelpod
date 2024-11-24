"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FromVoid = exports.ToVoid = void 0;
const stream_1 = require("stream");
const debug_1 = __importDefault(require("debug"));
const logger = (0, debug_1.default)('babelpod:streams');
class ToVoid extends stream_1.Writable {
    constructor() {
        super();
        logger('Creating new ToVoid stream');
    }
    _write(chunk, encoding, callback) {
        callback();
    }
}
exports.ToVoid = ToVoid;
class FromVoid extends stream_1.Readable {
    constructor() {
        super();
        logger('Creating new FromVoid stream');
    }
    _read(size) {
        // No-op as this is a void stream
    }
}
exports.FromVoid = FromVoid;
