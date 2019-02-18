'use strict';
/* global describe, it, after, afterEach, beforeEach */
const bluebirdChecks = require('./bluebirdChecks');
const bufferEqual = require('buffer-equal');
const chai = require('chai');
const chaiAsPromised = require(`chai-as-promised`);
const dirtyChai = require('dirty-chai');
const expect = chai.expect;
const should = chai.should(); // eslint-disable-line no-unused-vars
const OpenBCISimulator = require('../openBCISimulator');
const openBCIUtilities = require('@openbci/utilities/dist/utilities');
const k = require('@openbci/utilities/dist/constants');
const _ = require('lodash');

chai.use(chaiAsPromised);
chai.use(dirtyChai);

describe('openBCISimulator', function () {
  this.timeout(4000);
  let portName = k.OBCISimulatorPortName;
  afterEach(() => bluebirdChecks.noPendingPromises(200));
  describe('#constructor', function () {
    let simulator;
    afterEach(() => {
      simulator = null;
    });
    after(done => {
      setTimeout(() => {
        // Since there is a conditional timeout, it's important to wait to start the next test till this ends for sure
        done();
      }, 200); // The same amount of time in the simulator
    });
    it('constructs with the correct default options', function () {
      simulator = new OpenBCISimulator();
      expect(simulator.options.accel).to.be.true();
      expect(simulator.options.alpha).to.be.true();
      expect(simulator.options.boardFailure).to.be.false();
      expect(simulator.options.daisy).to.be.false();
      expect(simulator.options.daisyCanBeAttached).to.be.true();
      expect(simulator.options.drift).to.equal(0);
      expect(simulator.options.firmwareVersion).to.equal(k.OBCIFirmwareV1);
      expect(simulator.options.lineNoise).to.equal(k.OBCISimulatorLineNoiseHz60);
      expect(simulator.options.sampleRate).to.equal(k.OBCISampleRate250);
      expect(simulator.options.serialPortFailure).to.be.false();
      expect(simulator.options.verbose).to.be.false();
      expect(simulator.options.fragmentation).to.equal(k.OBCISimulatorFragmentationNone);
      expect(simulator.options.latencyTime).to.equal(16);
      expect(simulator.options.bufferSize).to.equal(4096);
    });
    it('should be able to get into daisy mode', function () {
      simulator = new OpenBCISimulator(portName, {
        daisy: true
      });
      expect(simulator.options.daisy).to.be.true();
    });
    it('should set the correct sample rate in daisy mode, if no sampleRate is provided', function () {
      simulator = new OpenBCISimulator(portName, {
        daisy: true
      });
      expect(simulator.options.sampleRate).to.equal(250); // produce samples at same rate
    });
    it('should use provided sample rate even if daisy is true', function () {
      simulator = new OpenBCISimulator(portName, {
        daisy: true,
        sampleRate: 20
      });
      expect(simulator.options.daisy).to.be.true();
      expect(simulator.options.sampleRate).to.equal(20);
    });
    it('should be able to put into firmware version 2', function () {
      simulator = new OpenBCISimulator(portName, {
        firmwareVersion: 'v2'
      });
      expect(simulator.options.firmwareVersion).to.equal(k.OBCIFirmwareV2);
    });
    it('should be able to simulate board failure', function () {
      simulator = new OpenBCISimulator(portName, {
        boardFailure: true
      });
      expect(simulator.options.boardFailure).to.be.true();
    });
    it('should be able to simulate serial port failure', function () {
      simulator = new OpenBCISimulator(portName, {
        serialPortFailure: true
      });
      expect(simulator.options.serialPortFailure).to.be.true();
    });
    it('can turn 50Hz line noise on', function () {
      simulator = new OpenBCISimulator(portName, {
        lineNoise: '50Hz'
      });
      (simulator.options.lineNoise).should.equal(k.OBCISimulatorLineNoiseHz50);
    });
    it('can turn no line noise on', function () {
      simulator = new OpenBCISimulator(portName, {
        lineNoise: 'none'
      });
      (simulator.options.lineNoise).should.equal(k.OBCISimulatorLineNoiseNone);
    });
    it('should not inject alpha if desired', function () {
      simulator = new OpenBCISimulator(portName, {
        alpha: false
      });
      expect(simulator.options.alpha).to.be.false();
    });
    it('should be able to not use the accel', function () {
      simulator = new OpenBCISimulator(portName, {
        accel: false
      });
      expect(simulator.options.accel).to.be.false();
    });
    it('should be able to set positive drift', function () {
      simulator = new OpenBCISimulator(portName, {
        drift: 1
      });
      expect(simulator.options.drift).to.be.greaterThan(0);
    });
    it('should be able to set negative drift', function () {
      simulator = new OpenBCISimulator(portName, {
        drift: -1
      });
      expect(simulator.options.drift).to.be.lessThan(0);
    });
    it('should throw if passed an invalid option', function (done) {
      try {
        simulator = new OpenBCISimulator(portName, {
          foo: 'bar'
        });
        done('did not throw');
      } catch (e) { done(); }
    });
  });
  describe('#write', function () {
    it('should refuse to write when not connected', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName);
      try {
        simulator.write('q');
        done('did not throw on disconnected write');
      } catch (e) {
        simulator.write('q', err => {
          if (err) {
            done();
          } else {
            done('did not provide error on disconnected write');
          }
        });
      }
    });
  });
  describe('#close', function () {
    it('should provide an error closing when already closed', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName);
      simulator.close(err => {
        if (err) {
          done();
        } else {
          done('closed successfully but had no time to open');
        }
      });
    });
  });
  describe('query register settings', function () {
    it('should send back the register query settings firmware version 1 cyton', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName, {
        firmwareVersion: 'v1'
      });
      simulator.once('data', function (data) {
        console.log(data.toString());
        expect(data.toString()).to.equal(k.OBCIRegisterQueryCyton + k.OBCIRegisterQueryAccelerometerFirmwareV1);
        done();
      });

      simulator.once('open', () => {
        simulator.write('?');
      });
    });
    it('should send back the register query settings firmware version 3 cyton', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName, {
        firmwareVersion: 'v3'
      });
      simulator.once('data', function (data) {
        console.log(data.toString());
        expect(data.toString()).to.equal(k.OBCIRegisterQueryCyton + k.OBCIRegisterQueryAccelerometerFirmwareV3);
        done();
      });

      simulator.once('open', () => {
        simulator.write('?');
      });
    });
    it('should send back the register query settings firmware version 1 cyton daisy', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName, {
        firmwareVersion: 'v1',
        daisy: true
      });
      simulator.once('data', function (data) {
        console.log(data.toString());
        expect(data.toString()).to.equal(k.OBCIRegisterQueryCyton + k.OBCIRegisterQueryCytonDaisy + k.OBCIRegisterQueryAccelerometerFirmwareV1);
        done();
      });

      simulator.once('open', () => {
        simulator.write('?');
      });
    });
    it('should send back the register query settings firmware version 3 cyton daisy', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName, {
        firmwareVersion: 'v3',
        daisy: true
      });
      simulator.once('data', function (data) {
        console.log(data.toString());
        expect(data.toString()).to.equal(k.OBCIRegisterQueryCyton + k.OBCIRegisterQueryCytonDaisy + k.OBCIRegisterQueryAccelerometerFirmwareV3);
        done();
      });

      simulator.once('open', () => {
        simulator.write('?');
      });
    });
  });
  describe(`_startStream`, function () {
    it('should return a packet with sample data in it', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName);
      let sampleCounter = 0;
      let sampleTestSize = 5;

      let newDataFunc = data => {
        if (sampleCounter > sampleTestSize) {
          simulator.write(k.OBCIStreamStop);
          simulator.removeListener('data', newDataFunc);
          const inputObj = {
            rawDataPacket: data,
            channelSettings: k.channelSettingsArrayInit(k.OBCINumberOfChannelsCyton),
            scale: true
          };
          let sample = openBCIUtilities.parsePacketStandardAccel(inputObj);
          expect(sample.channelData).to.not.all.equal(0);
          done();
          simulator = null;
        } else {
          sampleCounter++;
        }
      };
      simulator.on('data', newDataFunc);
      simulator.once('open', () => simulator._startStream());
    });
    it('should return a sync set packet with accel', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName);
      let sampleCounter = 0;
      let sampleTestSize = 5;

      let newDataFunc = data => {
        if (sampleCounter === 0) {
          // Ensure everything is switched on for this test
          simulator.options.accel = true;
          simulator.synced = true;
          simulator.sendSyncSetPacket = true;
          expect(data[k.OBCIPacketPositionStopByte]).to.equal(openBCIUtilities.makeTailByteFromPacketType(k.OBCIStreamPacketStandardAccel));
        } else if (sampleCounter === 1) {
          // Now this data should be the time sync up packet
          expect(data[k.OBCIPacketPositionStopByte]).to.equal(openBCIUtilities.makeTailByteFromPacketType(k.OBCIStreamPacketAccelTimeSyncSet));
          // Expect flag to be down
          expect(simulator.sendSyncSetPacket).to.be.false();
        } else if (sampleCounter >= sampleTestSize) {
          simulator.write(k.OBCIStreamStop);
          simulator.removeListener('data', newDataFunc);
          simulator = null;
          done();
        } else {
          // Now this data should be the time sync up packet
          expect(data[k.OBCIPacketPositionStopByte]).to.equal(openBCIUtilities.makeTailByteFromPacketType(k.OBCIStreamPacketAccelTimeSynced));
        }
        sampleCounter++;
      };

      simulator.on('data', newDataFunc);
      simulator.once('open', () => simulator.write(k.OBCIStreamStart));
    });
    it('should return a sync set packet with raw aux', function (done) {
      let simulator = new OpenBCISimulator(k.OBCISimulatorPortName, {
        accel: false
      });
      let sampleCounter = 0;
      let sampleTestSize = 5;

      let newDataFunc = data => {
        if (sampleCounter === 0) {
          // Ensure everything is switched on for this test
          simulator.synced = true;
          simulator.sendSyncSetPacket = true;
          expect(data[k.OBCIPacketPositionStopByte]).to.equal(openBCIUtilities.makeTailByteFromPacketType(k.OBCIStreamPacketStandardRawAux));
        } else if (sampleCounter === 1) {
          // Now this data should be the time sync up packet
          expect(data[k.OBCIPacketPositionStopByte]).to.equal(openBCIUtilities.makeTailByteFromPacketType(k.OBCIStreamPacketRawAuxTimeSyncSet));
          // Expect flag to be down
          expect(simulator.sendSyncSetPacket).to.be.false();
        } else if (sampleCounter >= sampleTestSize) {
          simulator.write(k.OBCIStreamStop);
          simulator.removeListener('data', newDataFunc);
          simulator = null;
          done();
        } else {
          // Now this data should be the time sync up packet
          expect(data[k.OBCIPacketPositionStopByte]).to.equal(openBCIUtilities.makeTailByteFromPacketType(k.OBCIStreamPacketRawAuxTimeSynced));
        }
        sampleCounter++;
      };

      simulator.on('data', newDataFunc);
      simulator.once('open', () => simulator.write(k.OBCIStreamStart));
    });
  });
  describe(`firmwareVersion1`, function () {
    let simulator;
    beforeEach((done) => {
      simulator = new OpenBCISimulator(k.OBCISimulatorPortName, {
        firmwareVersion: 'v1'
      });
      simulator.once('open', done);
    });
    afterEach(() => {
      simulator = null;
    });
    describe('reset', function () {
      it('should not be v2', function (done) {
        simulator.on('data', function (data) {
          console.log(data.toString());
          expect(data.toString().match('v2')).to.equal(null);
          done();
        });
        simulator.write(k.OBCIMiscSoftReset);
      });
    });
  });
  describe(`firmwareVersion2`, function () {
    let simulator;
    beforeEach((done) => {
      simulator = new OpenBCISimulator(k.OBCISimulatorPortName, {
        firmwareVersion: 'v2'
      });
      simulator.once('open', done);
    });
    afterEach(() => {
      simulator.removeAllListeners('data');
      simulator = null;
    });
    describe('set max channels', function () {
      this.timeout(100);
      it('should send nothing if no daisy attached', function (done) {
        simulator.options.daisy = false;
        simulator.on('data', function (data) {
          expect(data.toString().match(k.OBCIParseEOT)).to.not.equal(null);
          if (data.toString().match(k.OBCIParseEOT)) {
            simulator.removeAllListeners('data');
            done();
          }
        });
        simulator.write(k.OBCIChannelMaxNumber8);
      });
      it('should send daisy removed if daisy attached', function (done) {
        simulator.options.daisy = true;
        simulator.on('data', function (data) {
          expect(_.eq(data.toString(), 'daisy removed')).to.not.equal(null);
          if (data.toString().match(k.OBCIParseEOT)) {
            expect(simulator.options.daisy).to.equal(false);
            simulator.removeAllListeners('data');
            done();
          }
        });
        simulator.write(k.OBCIChannelMaxNumber8);
      });
      it('should send just 16 if daisy already attached', function (done) {
        simulator.options.daisy = true;
        simulator.on('data', function (data) {
          expect(data.toString().match(`16${k.OBCIParseEOT}`)).to.not.equal(null);
          if (data.toString().match(k.OBCIParseEOT)) {
            simulator.removeAllListeners('data');
            done();
          }
        });
        simulator.write(k.OBCIChannelMaxNumber16);
      });
      it('should send daisy attached if able to attach', function (done) {
        simulator.options.daisy = false;
        simulator.options.daisyCanBeAttached = true;
        simulator.on('data', function (data) {
          expect(data.toString().match(/daisy attached16/)).to.not.equal(null);
          if (data.toString().match(k.OBCIParseEOT)) {
            expect(simulator.options.daisy).to.equal(true);
            simulator.removeAllListeners('data');
            done();
          }
        });
        simulator.write(k.OBCIChannelMaxNumber16);
      });
      it('should send daisy attached if not able to attach', function (done) {
        simulator.options.daisy = false;
        simulator.options.daisyCanBeAttached = false;
        simulator.on('data', function (data) {
          expect(data.toString().match(/no daisy to attach!/)).to.not.equal(null);
          if (data.toString().match(k.OBCIParseEOT)) {
            simulator.removeAllListeners('data');
            done();
          }
        });
        simulator.write(k.OBCIChannelMaxNumber16);
      });
    });
    describe('reset', function () {
      it('should be v2', function (done) {
        simulator.on('data', function (data) {
          expect(data.toString().match(/v2/)).to.not.equal(null);
          done();
        });
        simulator.write(k.OBCIMiscSoftReset);
      });
    });
    describe('_processPrivateRadioMessage', function () {
      describe('OBCIRadioCmdChannelGet', function () {
        it('should emit success if firmware version 2', done => {
          simulator.channelNumber = 0;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              expect(buf[buf.length - 4]).to.equal(0);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdChannelGet]));
        });
        it('should emit failure if board failure and host channel number', done => {
          // Turn board failure mode
          simulator.options.boardFailure = true;
          simulator.channelNumber = 9;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.false();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.true();
              expect(buf[buf.length - 4]).to.equal(9);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdChannelGet]));
        });
      });
      describe('OBCIRadioCmdChannelSet', function () {
        it('should set the channel number if in bounds', done => {
          let newChanNum = 20;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              expect(buf[buf.length - 4]).to.equal(newChanNum);
              expect(simulator.channelNumber).to.equal(newChanNum);
              expect(simulator.hostChannelNumber).to.equal(newChanNum);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdChannelSet, newChanNum]));
        });
        it('should not set the channel number if out of bounds', done => {
          let newChanNum = 26;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.false();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.true();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdChannelSet, newChanNum]));
        });
        it('should emit failure if board failure', done => {
          // Turn board failure mode
          simulator.options.boardFailure = true;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.false();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.true();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);
          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdChannelSet, 7]));
        });
      });
      describe('OBCIRadioCmdChannelSetOverride', function () {
        it('should change just the hosts channel number and not the systems channel number and force a board comms failure', done => {
          let systemChannelNumber = 0;
          let newHostChannelNumber = 1;
          simulator.channelNumber = systemChannelNumber;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              expect(buf[buf.length - 4]).to.equal(newHostChannelNumber);
              expect(simulator.options.boardFailure).to.be.true();
              expect(simulator.channelNumber).to.equal(systemChannelNumber);
              expect(simulator.hostChannelNumber).to.equal(newHostChannelNumber);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdChannelSetOverride, newHostChannelNumber]));
        });
        it('should change just the hosts channel number and not the systems channel number and fix a board failure', done => {
          let systemChannelNumber = 0;
          let oldHostChannelNumber = 1;
          simulator.channelNumber = systemChannelNumber;
          simulator.hostChannelNumber = oldHostChannelNumber;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              expect(buf[buf.length - 4]).to.equal(systemChannelNumber);
              expect(simulator.options.boardFailure).to.be.false();
              expect(simulator.channelNumber).to.equal(systemChannelNumber);
              expect(simulator.hostChannelNumber).to.equal(systemChannelNumber);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdChannelSetOverride, systemChannelNumber]));
        });
        it('should not set the channel number if out of bounds', done => {
          let newChanNum = 26;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.false();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.true();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdChannelSetOverride, newChanNum]));
        });
      });
      describe('OBCIRadioCmdPollTimeGet', function () {
        it('should emit success if firmware version 2 with poll time', done => {
          let expectedPollTime = 80;
          simulator.pollTime = expectedPollTime;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              expect(buf[buf.length - 4]).to.equal(expectedPollTime);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdPollTimeGet]));
        });
        it('should emit failure if board failure', done => {
          // Turn board failure mode
          simulator.options.boardFailure = true;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.false();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.true();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdPollTimeGet]));
        });
      });
      describe('OBCIRadioCmdPollTimeSet', function () {
        it('should set the poll time if in bounds', done => {
          let newPollTime = 20;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              expect(buf[buf.length - 4]).to.equal(newPollTime);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdPollTimeSet, newPollTime]));
        });
        it('should emit failure if board failure', done => {
          // Turn board failure mode
          simulator.options.boardFailure = true;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.false();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.true();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);
          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdPollTimeSet, 7]));
        });
      });
      describe('OBCIRadioCmdBaudRateSetDefault', function () {
        it('should emit success if firmware version 2 with proper baud rate', done => {
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              let eotBuf = Buffer.from('$$$');
              let newBaudRateBuf;
              for (let i = buf.length; i > 3; i--) {
                if (bufferEqual(buf.slice(i - 3, i), eotBuf)) {
                  newBaudRateBuf = buf.slice(i - 9, i - 3);
                  break;
                }
              }
              let newBaudRateNum = Number(newBaudRateBuf.toString());
              expect(newBaudRateNum).to.equal(k.OBCIRadioBaudRateDefault);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdBaudRateSetDefault]));
        });
        it('should emit success if board failure', done => {
          // Turn board failure mode
          simulator.options.boardFailure = true;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdBaudRateSetDefault]));
        });
      });
      describe('OBCIRadioCmdBaudRateSetFast', function () {
        it('should emit success if firmware version 2 with proper baud rate', done => {
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              let eotBuf = Buffer.from(`$$$`);
              let newBaudRateBuf;
              for (let i = buf.length; i > 3; i--) {
                if (bufferEqual(buf.slice(i - 3, i), eotBuf)) {
                  newBaudRateBuf = buf.slice(i - 9, i - 3);
                  break;
                }
              }
              let newBaudRateNum = Number(newBaudRateBuf.toString());
              expect(newBaudRateNum).to.equal(k.OBCIRadioBaudRateFast);
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdBaudRateSetFast]));
        });
        it('should emit success if board failure', done => {
          // Turn board failure mode
          simulator.options.boardFailure = true;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdBaudRateSetFast]));
        });
      });
      describe('OBCIRadioCmdSystemStatus', function () {
        it('should emit success if firmware version 2', done => {
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.true();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.false();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdSystemStatus]));
        });
        it('should emit failure if board failure', done => {
          // Turn board failure mode
          simulator.options.boardFailure = true;
          let buf = Buffer.alloc(0);
          let dataEmit = data => {
            buf = Buffer.concat([buf, data]);
            if (openBCIUtilities.doesBufferHaveEOT(buf)) {
              expect(openBCIUtilities.isSuccessInBuffer(buf)).to.be.false();
              expect(openBCIUtilities.isFailureInBuffer(buf)).to.be.true();
              simulator.removeListener('data', dataEmit);
              done();
            }
          };

          simulator.on('data', dataEmit);

          simulator._processPrivateRadioMessage(Buffer.from([k.OBCIRadioKey, k.OBCIRadioCmdSystemStatus]));
        });
      });
    });
  });
  describe('fragmentation', function () {
    let simulator;
    afterEach(done => {
      simulator.removeAllListeners();
      simulator.write(k.OBCIStreamStop);
      simulator.close(done);
    });
    it('Should accumulate packets if set to FullBuffers', function (done) {
      let bufferSize = 64;
      simulator = new OpenBCISimulator(portName, {
        fragmentation: k.OBCISimulatorFragmentationFullBuffers,
        bufferSize: bufferSize,
        latencyTime: 1000
      });
      simulator.once('data', function (buffer) {
        expect(buffer.length).to.equal(bufferSize);
        done();
      });
      simulator.once('open', () => simulator.write(k.OBCIStreamStart));
    });
    it('Should emit partial packets after latencyTime', function (done) {
      let bufferSize = 4096;
      simulator = new OpenBCISimulator(portName, {
        fragmentation: k.OBCISimulatorFragmentationFullBuffers,
        bufferSize: 4096,
        latencyTime: 0
      });
      simulator.once('data', function (buffer) {
        expect(buffer.length).to.be.lessThan(bufferSize);
        done();
      });
      simulator.once('open', () => simulator.write(k.OBCIStreamStart));
    });
    it('Should emit single bytes if set to OneByOne', function (done) {
      simulator = new OpenBCISimulator(portName, {
        fragmentation: k.OBCISimulatorFragmentationOneByOne
      });
      let counter = 0;
      simulator.on('data', function (buffer) {
        expect(buffer.length).to.equal(1);
        ++counter;

        if (counter === 5) done();
      });
      simulator.once('open', () => simulator.write(k.OBCIStreamStart));
    });
    it('should properly split packets, retaining valid packets', function (done) {
      simulator = new OpenBCISimulator(portName, {
        fragmentation: k.OBCISimulatorFragmentationRandom
      });
      let buffer = Buffer.alloc(0);
      let counter = 0;
      simulator.on('data', function (data) {
        buffer = Buffer.concat([buffer, data], buffer.length + data.length);
        if (buffer.length >= 33) {
          const inputObj = {
            rawDataPacket: buffer.slice(0, 33),
            channelSettings: k.channelSettingsArrayInit(k.OBCINumberOfChannelsCyton),
            scale: true
          };
          openBCIUtilities.parsePacketStandardAccel(inputObj);
          buffer = buffer.slice(33);
          ++counter;
          if (counter === 5) done();
        }
      });
      simulator.once('open', () => simulator.write(k.OBCIStreamStart));
    });
  });
  describe(`boardFailure`, function () {});

  describe(`#sync`, function () {
    this.timeout(2000);
    let simulator;
    beforeEach(function (done) {
      simulator = new OpenBCISimulator(portName, {
        firmwareVersion: 'v2'
      });
      simulator.once('open', () => {
        done();
      });
    });
    afterEach(function () {
      simulator = null;
    });
    it(`should emit the time sync sent command`, function (done) {
      simulator.once('data', data => {
        expect(openBCIUtilities.isTimeSyncSetConfirmationInBuffer(data)).to.be.true();
        done();
      });
      simulator.write(k.OBCISyncTimeSet, (err, msg) => {
        if (err) {
          done(err);
        }
      });
    });
    it(`should set synced to true`, function (done) {
      simulator.synced = false;
      let newData = data => {
        expect(simulator.synced).to.be.true();
        simulator.removeListener('data', newData);
        done();
      };

      simulator.on('data', data => {
        newData(data);
      });

      simulator.write(k.OBCISyncTimeSet, (err, msg) => {
        if (err) {
          done(err);
        }
      });
    });
    it(`should emit a time sync set packet followed by a time synced accel packet after sync up call`, function (done) {
      simulator.synced = false;
      let emitCounter = 0;
      let maxPacketsBetweenSetPacket = 5;
      let newData = data => {
        if (emitCounter === 0) { // the time sync packet is emitted here
          // Make a call to start streaming
          simulator.write(k.OBCIStreamStart, err => {
            if (err) done(err);
          });
        } else if (emitCounter < maxPacketsBetweenSetPacket) {
          if (openBCIUtilities.getRawPacketType(data[k.OBCIPacketPositionStopByte]) === k.OBCIStreamPacketAccelTimeSyncSet) {
            simulator.removeListener('data', newData);
            simulator.write(k.OBCIStreamStop, err => {
              if (err) done(err);
              done();
            });
          } else {
            expect(openBCIUtilities.getRawPacketType(data[k.OBCIPacketPositionStopByte])).to.equal(k.OBCIStreamPacketAccelTimeSynced);
          }
        } else {
          done(`Failed to get set packet in time`);
        }
        emitCounter++;
      };

      simulator.on('data', newData);

      simulator.write(k.OBCISyncTimeSet, (err, msg) => {
        if (err) {
          done(err);
        }
      });
    });
    it(`should emit a time sync set raw aux, then time synced raw aux packet after sync up call`, function (done) {
      simulator.synced = false;
      simulator.options.accel = false;
      let emitCounter = 0;
      let maxPacketsBetweenSetPacket = 5;
      let newData = data => {
        if (emitCounter === 0) { // the time sync packet is emitted here
          // Make a call to start streaming
          simulator.write(k.OBCIStreamStart, err => {
            if (err) done(err);
          });
        } else if (emitCounter < maxPacketsBetweenSetPacket) {
          if (openBCIUtilities.getRawPacketType(data[k.OBCIPacketPositionStopByte]) === k.OBCIStreamPacketRawAuxTimeSyncSet) {
            simulator.removeListener('data', newData);
            simulator.write(k.OBCIStreamStop, err => {
              if (err) done(err);
              done();
            });
          } else {
            expect(openBCIUtilities.getRawPacketType(data[k.OBCIPacketPositionStopByte])).to.equal(k.OBCIStreamPacketRawAuxTimeSynced);
          }
        } else {
          done(`Failed to get set packet in time`);
        }

        emitCounter++;
      };

      simulator.on('data', newData);

      simulator.write(k.OBCISyncTimeSet, (err, msg) => {
        if (err) {
          done(err);
        }
      });
    });
  });
});
