const stream = require('stream');
const util = require('util');
const debug = require('debug')('babelpod:streams');

// Create ToVoid stream
util.inherits(ToVoid, stream.Writable);
function ToVoid () {
  if (!(this instanceof ToVoid)) return new ToVoid();
  stream.Writable.call(this);
}
ToVoid.prototype._write = function (chunk, encoding, cb) {
  cb();
}

// Create FromVoid stream
util.inherits(FromVoid, stream.Readable);
function FromVoid () {
  if (!(this instanceof FromVoid)) return new FromVoid();
  stream.Readable.call(this);
}
FromVoid.prototype._read = function (chunk, encoding, cb) {
}

module.exports = {
  ToVoid,
  FromVoid
};