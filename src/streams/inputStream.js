const spawn = require('child_process').spawn;
const debug = require('debug')('babelpod:streams');
const { FromVoid } = require('./voidStreams');

class InputStreamManager {
  constructor() {
    this.currentInput = "void";
    this.arecordInstance = null;
    this.inputStream = new FromVoid();
  }

  getCurrentInput() {
    return this.currentInput;
  }

  getCurrentStream() {
    return this.inputStream;
  }

  switchInput(deviceId) {
    debug('Creating input stream for:', deviceId);
    if (deviceId === "void") {
        debug('Creating void input');
        this.inputStream = new FromVoid();
    } else {
        debug('Starting arecord');
        this.arecordInstance = spawn("arecord", [
            '-D', deviceId,
            '-c', "2",
            '-f', "S16_LE",
            '-r', "44100",
            '-v' // Add verbose output
        ]);
        
        this.arecordInstance.stderr.on('data', (data) => {
            debug('arecord stderr:', data.toString());
        });

        this.arecordInstance.stdout.on('data', (chunk) => {
            debug('arecord data received, length:', chunk.length);
        });

        this.inputStream = this.arecordInstance.stdout;
    }
    return this.inputStream;
}

  cleanup() {
    debug('Cleaning up input stream');
    if (this.inputStream && !(this.inputStream instanceof FromVoid)) {
      // Let the caller handle unpiping from outputs
      debug('Input stream cleanup');
    }

    if (this.arecordInstance) {
      debug('Killing arecord instance');
      this.arecordInstance.kill();
      this.arecordInstance = null;
    }
  }
}

module.exports = InputStreamManager;