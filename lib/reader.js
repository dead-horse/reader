/*!
 * reader - lib/reader.js 
 * Copyright(c) 2012 Taobao.com
 * Author: dead-horse <dead_horse@qq.com>
 */


/**
 * Module dependencies.
 */

var ndir = require('ndir');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function BigFileWalker (file, options) {
  EventEmitter.call(this);
  this.lineReader = ndir.createLineReader(file);
  this._ready = false;
  this.lineReader.on('end', function () {
    this.finish = true;
    if (!this.pause) {
      this.emit('readable');
      this._ready = true;
      this.pause = true;
    }
    this.emit('end');
  }.bind(this));
  this.lineReader.on('error', this.emit.bind(this, 'error'));
  this.lineReader.on('line', this.online.bind(this));
  this.index = 0;
  this.curr = [];
  this.back = [];
  this.remain = []; //remain for data after pause
  options = options || {};
  this.piece = options.piece || 100000;
  this.offset = options.offset || 0;
  this.skipped = 0;
  this.pause = false;
  this.finish = false;
  this.got = 0;
}
util.inherits(BigFileWalker, EventEmitter);

BigFileWalker.prototype.online = function (line) {
  if (this.skipped < this.offset) {
    this.skipped++;
    return;
  }
  if (this.curr.length < this.piece) {
    return this.curr.push(line);
  }
  if (this.back.length < this.piece) {
    return this.back.push(line);
  }
  if (!this.pause) {
    this.lineReader.readstream.pause();
    this.pause = true;
    this.emit('readable');
    this._readable = true;
  }
  this.remain.push(line);
};

BigFileWalker.prototype.get = function (num) {
  if (num <= 0) {
    return [];
  }
  var index = this.index;
  if (this.curr.length - index > num) {
    this.index += num;
    this.got += num;
    return this.curr.slice(index, index + num);
  }
  var result = this.curr.slice(index);
  this.curr = this.back;
  this.back = this.remain;
  this.remain = [];
  this.pause && this.lineReader.readstream.resume();
  this.pause = false;
  this.index = num - result.length;
  this.index = this.index > this.curr.length ? this.curr.length : this.index;
  if (result.length < num) {
    result = result.concat(this.curr.slice(0, this.index));
  } 
  this.got += result.length;
  return result;
};


BigFileWalker.prototype.ready = function (fn) {
  if (!this._readable) {
    return this.once('readable', fn);
  }
  fn();
}

/**
 * Big file Line data reader
 * 
 * @example
 * ```
 * var ndir = require('ndir');
 * var walker = ndir.createBigFileWalker('/tmp/access.log');
 * walker.once('ready', function () {
 *   setInterval(function () {
 *     walker.get(1000);
 *   }, 5);
 * });
 * ```
 * 
 * @param {String|ReadStream} file, file path or a `ReadStream` object.
 */
exports.createBigFileWalker = function (file, length) {
  return new BigFileWalker(file, length);
};