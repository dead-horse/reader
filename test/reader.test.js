/*!
 * reader - test/reader.test.js 
 * Copyright(c) 2012 Taobao.com
 * Author: dead-horse <dead_horse@qq.com>
 */


/**
 * Module dependencies.
 */

var reader = require('../');
var should = require('should');
var fs = require('fs');

var logfile = __dirname + '/access.log';
var lines = fs.readFileSync(logfile, 'utf8').split('\n');

describe('lib/reader.js', function () {  
  describe('createBigFileWalker', function () {
    var walker;
    it('should emit readable', function (done) {
      walker = reader.createBigFileWalker(logfile, {
        offset: 10,
        piece: 100
      });
      walker.pause.should.be.not.ok;
      walker.once('readable', function () {
        walker.curr.length.should.equal(100);
        walker.back.length.should.equal(100);
        walker.pause.should.be.ok;
        done();
      });
    });

    it('should get -1 return []', function () {
      var result = walker.get(-1);
      result.should.have.length(0);
    });

    it('should walk 10 ok', function () {
      var result = walker.get(10);
      for (var i = 0; i < 10; i++) {
        result[i].toString().should.equal(lines[i + 10]);
      }
      walker.index.should.equal(10);
      walker.curr.should.have.length(100);
      walker.back.should.have.length(100);
    });

    it('should walk left ok', function () {
      var remain = walker.remain;
      var left = walker.curr.length - walker.index;
      var result = walker.get(left);
      for (var i = 0; i < left; i++) {
        result[i].toString().should.equal(lines[i + 20]);
      }
      walker.curr.length.should.equal(100);
      walker.pause.should.be.not.ok;
      walker.back.should.equal(remain);
      walker.remain.length.should.equal(0);
    });

    it('should walker more ok', function (done) {
      //wait load
      setTimeout(function () {
        var remain = walker.remain;
        var back = walker.back;
        var result = walker.get(150);
        walker.index.should.equal(50);
        walker.pause.should.equal(false);
        walker.curr.should.equal(back);
        walker.back.should.equal(remain);
        walker.once('end', function () {
          process.nextTick(done);          
        });
        for (var i = 0; i < result.length; i++) {
          result[i].toString().should.equal(lines[i + 110]);
        }
      }, 100);
    });

    it('should walker end', function (done) {
      //wait load
      setTimeout(function () {
        var result = walker.get(150);
        walker.got.should.equal(lines.length - 11);
        done();
      }, 100);
    });
  });
});