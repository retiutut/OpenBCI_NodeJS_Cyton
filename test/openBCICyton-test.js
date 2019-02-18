'use strict';
const bluebirdChecks = require('./bluebirdChecks');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const should = chai.should(); // eslint-disable-line no-unused-vars
const Cyton = require('../openBCICyton');
const openBCIUtilities = require('@openbci/utilities/dist/utilities');
const k = require('@openbci/utilities/dist/constants');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const bufferEqual = require('buffer-equal');
const fs = require('fs');
const math = require('mathjs');
const dirtyChai = require('dirty-chai');
const Buffer = require('safe-buffer').Buffer;

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(dirtyChai);

describe('openbci-sdk', function () {
  this.timeout(2000);
  let ourBoard, masterPortName, realBoard, spy;

  before(function (done) {
    ourBoard = new Cyton();
    ourBoard.autoFindOpenBCIBoard()
      .then(portName => {
        ourBoard = null;
        realBoard = true;
        masterPortName = portName;
        done();
      })
      .catch(() => {
        ourBoard = null;
        realBoard = false;
        masterPortName = k.OBCISimulatorPortName;
        done();
      });
  });
  after(done => {
    if (ourBoard) {
      if (ourBoard['connected']) {
        ourBoard.disconnect()
          .then(() => {
            done();
          })
          .catch(err => {
            done(err);
          });
      } else {
        done();
      }
    } else {
      done();
    }
  });
  describe('#constructor', function () {
    afterEach(() => {
      ourBoard = null;
      return bluebirdChecks.noPendingPromises();
    });
    it('constructs with require', function () {
      let OpenBCICyton = require('../openBCICyton');
      ourBoard = new OpenBCICyton({
        verbose: true
      });
      expect(ourBoard.numberOfChannels()).to.equal(8);
    });
    it('constructs with the correct default options', () => {
      let board = new Cyton();
      expect(board.options.boardType).to.equal(k.OBCIBoardCyton);
      expect(board.options.baudRate).to.equal(115200);
      expect(board.options.hardSet).to.be.false();
      expect(board.options.sendCounts).to.be.false();
      expect(board.options.simulate).to.be.false();
      expect(board.options.simulatorBoardFailure).to.be.false();
      expect(board.options.simulatorDaisyModuleAttached).to.be.false();
      expect(board.options.simulatorDaisyModuleCanBeAttached).to.be.true();
      expect(board.options.simulatorFirmwareVersion).to.equal(k.OBCIFirmwareV1);
      expect(board.options.simulatorHasAccelerometer).to.be.true();
      expect(board.options.simulatorInternalClockDrift).to.equal(0);
      expect(board.options.simulatorInjectAlpha).to.be.true();
      expect(board.options.simulatorInjectLineNoise).to.equal(k.OBCISimulatorLineNoiseHz60);
      expect(board.options.simulatorSampleRate).to.equal(k.OBCISampleRate250);
      expect(board.options.simulatorSerialPortFailure).to.be.false();
      expect(board.options.sntpTimeSync).to.be.false();
      expect(board.options.sntpTimeSyncHost).to.equal('pool.ntp.org');
      expect(board.options.verbose).to.be.false();
      expect(board.sampleRate()).to.equal(250);
      expect(board.numberOfChannels()).to.equal(8);
      expect(board.isConnected()).to.be.false();
      expect(board.isStreaming()).to.be.false();
      it('should still get proper values if no info object', function () {
        board.info = null;
        expect(board.sampleRate()).to.equal(250);
        expect(board.numberOfChannels()).to.equal(8);
      });
    });
    it('should be able to set ganglion mode', () => {
      let board = new Cyton({
        boardType: 'ganglion'
      });
      (board.options.boardType).should.equal('ganglion');
    });
    it('should be able to set set daisy mode', () => {
      let ourBoard1 = new Cyton({
        boardType: 'daisy'
      });
      let ourBoard2 = new Cyton({
        boardtype: 'daisy'
      });
      (ourBoard1.options.boardType).should.equal('daisy');
      (ourBoard2.options.boardType).should.equal('daisy');
      ourBoard1.info = null;
      it('should get value for daisy', () => {
        ourBoard1.sampleRate().should.equal(125);
      });
      it('should get value for daisy', () => {
        ourBoard1.numberOfChannels().should.equal(16);
      });
    });
    it('should be able to change baud rate', () => {
      let ourBoard1 = new Cyton({
        baudRate: 9600
      });
      (ourBoard1.options.baudRate).should.equal(9600);
      let ourBoard2 = new Cyton({
        baudrate: 9600
      });
      (ourBoard2.options.baudRate).should.equal(9600);
    });
    it('should be able to enter simulate mode from the constructor', () => {
      let board = new Cyton({
        simulate: true
      });
      expect(board.options.simulate).to.be.true();
    });
    it('should be able to set the simulator to board failure mode', () => {
      let ourBoard1 = new Cyton({
        simulatorBoardFailure: true
      });
      expect(ourBoard1.options.simulatorBoardFailure).to.be.true();
      let ourBoard2 = new Cyton({
        simulatorboardfailure: true
      });
      expect(ourBoard2.options.simulatorBoardFailure).to.be.true();
    });
    it('should be able to attach the daisy board in the simulator', () => {
      let ourBoard1 = new Cyton({
        simulatorDaisyModuleAttached: true
      });
      expect(ourBoard1.options.simulatorDaisyModuleAttached).to.be.true();
      // Verify multi case support
      let ourBoard2 = new Cyton({
        simulatordaisymoduleattached: true
      });
      expect(ourBoard2.options.simulatorDaisyModuleAttached).to.be.true();
    });
    it('should be able to start the simulator with firmware version 2', () => {
      let ourBoard1 = new Cyton({
        simulatorFirmwareVersion: 'v2'
      });
      (ourBoard1.options.simulatorFirmwareVersion).should.equal(k.OBCIFirmwareV2);
      // Verify multi case support
      let ourBoard2 = new Cyton({
        simulatorfirmwareversion: 'v2'
      });
      (ourBoard2.options.simulatorFirmwareVersion).should.equal(k.OBCIFirmwareV2);
    });
    it('should be able to put the simulator in raw aux mode', () => {
      let ourBoard1 = new Cyton({
        simulatorHasAccelerometer: false
      });
      expect(ourBoard1.options.simulatorHasAccelerometer).to.be.false();
      // Verify multi case support
      let ourBoard2 = new Cyton({
        simulatorhasaccelerometer: false
      });
      expect(ourBoard2.options.simulatorHasAccelerometer).to.be.false();
    });
    it('should be able to make the internal clock of the simulator run slow', () => {
      let ourBoard1 = new Cyton({
        simulatorInternalClockDrift: -1
      });
      expect(ourBoard1.options.simulatorInternalClockDrift).to.be.lessThan(0);
      // Verify multi case support
      let ourBoard2 = new Cyton({
        simulatorinternalclockdrift: -1
      });
      expect(ourBoard2.options.simulatorInternalClockDrift).to.be.lessThan(0);
    });
    it('should be able to make the internal clock of the simulator run fast', () => {
      let ourBoard1 = new Cyton({
        simulatorInternalClockDrift: 1
      });
      expect(ourBoard1.options.simulatorInternalClockDrift).to.be.greaterThan(0);
      // Verify multi case support
      let ourBoard2 = new Cyton({
        simulatorinternalclockdrift: 1
      });
      expect(ourBoard2.options.simulatorInternalClockDrift).to.be.greaterThan(0);
    });
    it('should be able to not inject alpha waves into the simulator', function () {
      let ourBoard1 = new Cyton({
        simulatorInjectAlpha: false
      });
      expect(ourBoard1.options.simulatorInjectAlpha).to.be.false();
      // Verify multi case support
      let ourBoard2 = new Cyton({
        simulatorinjectalpha: false
      });
      expect(ourBoard2.options.simulatorInjectAlpha).to.be.false();
    });
    it('can turn 50Hz line noise on', function () {
      let ourBoard1 = new Cyton({
        simulatorInjectLineNoise: '50Hz'
      });
      expect(ourBoard1.options.simulatorInjectLineNoise).to.equal(k.OBCISimulatorLineNoiseHz50);
      // Verify multi case support
      let ourBoard2 = new Cyton({
        simulatorinjectlinenoise: '50Hz'
      });
      expect(ourBoard2.options.simulatorInjectLineNoise).to.equal(k.OBCISimulatorLineNoiseHz50);
    });
    it('can turn no line noise on', function () {
      ourBoard = new Cyton({
        simulatorInjectLineNoise: 'none'
      });
      (ourBoard.options.simulatorInjectLineNoise).should.equal(k.OBCISimulatorLineNoiseNone);
    });
    it('defaults to 60Hz line noise when bad input', function () {
      ourBoard = new Cyton({
        simulatorInjectLineNoise: '20Hz'
      });
      (ourBoard.options.simulatorInjectLineNoise).should.equal(k.OBCISimulatorLineNoiseHz60);
    });
    it('can enter simulate mode with different sample rate', function () {
      ourBoard = new Cyton({
        simulate: true,
        simulatorSampleRate: 69
      });
      (ourBoard.options.simulate).should.equal(true);
      (ourBoard.options.simulatorSampleRate).should.equal(69);
      (ourBoard.sampleRate()).should.equal(69);
    });
    it('should be able to attach the daisy board in the simulator', () => {
      let ourBoard1 = new Cyton({
        simulatorSerialPortFailure: true
      });
      expect(ourBoard1.options.simulatorSerialPortFailure).to.be.true();
      // Verify multi case support
      let ourBoard2 = new Cyton({
        simulatorserialportfailure: true
      });
      expect(ourBoard2.options.simulatorSerialPortFailure).to.be.true();
    });
    it('should be able to enter sync mode', function () {
      let ourBoard = new Cyton({
        sntpTimeSync: true
      });
      expect(ourBoard.options.sntpTimeSync).to.be.true();

      return new Promise((resolve, reject) => {
        ourBoard.once('sntpTimeLock', resolve);
        ourBoard.once('error', reject);
      }).then(() => {
        ourBoard.sntpStop();
      }, err => {
        ourBoard.sntpStop();
        return Promise.reject(err);
      });
    });
    it('should be able to change the ntp pool host', function () {
      let expectedPoolName = 'time.apple.com';
      let ourBoard1 = new Cyton({
        sntpTimeSyncHost: expectedPoolName
      });
      expect(ourBoard1.options.sntpTimeSyncHost).to.equal(expectedPoolName);
      // Verify multi case support
      let ourBoard2 = new Cyton({
        sntptimesynchost: expectedPoolName
      });
      expect(ourBoard2.options.sntpTimeSyncHost).to.equal(expectedPoolName);
    });
    it('should be able to change the ntp pool port', function () {
      let expectedPortNumber = 73;
      let ourBoard1 = new Cyton({
        sntpTimeSyncPort: expectedPortNumber
      });
      expect(ourBoard1.options.sntpTimeSyncPort).to.equal(expectedPortNumber);
      // Verify multi case support
      let ourBoard2 = new Cyton({
        sntptimesyncport: expectedPortNumber
      });
      expect(ourBoard2.options.sntpTimeSyncPort).to.equal(expectedPortNumber);
    });
    it('should report when sntp fails', function (done) {
      let ourBoard = new Cyton({
        sntpTimeSync: true,
        sntpTimeSyncHost: 'no\'where'
      });
      ourBoard.once('error', () => {
        done();
      });
      ourBoard.once('sntpTimeLock', () => {
        ourBoard.sntpStop();
        done('got a time lock with nowhere');
      });
    });
    it('can enter verbose mode', function () {
      ourBoard = new Cyton({
        verbose: true
      });
      (ourBoard.options.verbose).should.equal(true);
    });
    it('should start in current stream state in the init mode', () => {
      ourBoard = new Cyton();

      ourBoard.curParsingMode.should.equal(k.OBCIParsingReset);
    });
    it('configures impedance testing letiables correctly', function () {
      ourBoard = new Cyton();
      (ourBoard.impedanceTest.active).should.equal(false);
      (ourBoard.impedanceTest.isTestingNInput).should.equal(false);
      (ourBoard.impedanceTest.isTestingPInput).should.equal(false);
      (ourBoard.impedanceTest.onChannel).should.equal(0);
      (ourBoard.impedanceTest.sampleNumber).should.equal(0);
    });
    it('configures sync object correctly', function () {
      ourBoard = new Cyton();
      expect(ourBoard.sync.curSyncObj).to.be.null();
      expect(ourBoard.sync.eventEmitter).to.be.null();
      expect(ourBoard.sync.objArray.length).to.equal(0);
      (ourBoard.sync.sntpActive).should.equal(false);
      (ourBoard.sync.timeOffsetMaster).should.equal(0);
      (ourBoard.sync.timeOffsetAvg).should.equal(0);
      expect(ourBoard.sync.timeOffsetArray.length).to.equal(0);
    });
    it('configures impedance array with the correct amount of channels for default', function () {
      ourBoard = new Cyton();
      (ourBoard.impedanceArray.length).should.equal(8);
    });
    it('configures impedance array with the correct amount of channels for daisy', function () {
      ourBoard = new Cyton({
        boardType: 'daisy'
      });
      (ourBoard.impedanceArray.length).should.equal(16);
    });
    it('configures impedance array with the correct amount of channels for ganglion', function () {
      ourBoard = new Cyton({
        boardType: 'ganglion'
      });
      (ourBoard.impedanceArray.length).should.equal(4);
    });
    it('should throw if passed an invalid option', function (done) {
      try {
        ourBoard = new Cyton({
          foo: 'bar'
        });
        done('did not throw');
      } catch (e) { done(); }
    });
  });
  describe('#simulator', function () {
    after(() => bluebirdChecks.noPendingPromises());
    it('can enable simulator after constructor', function (done) {
      ourBoard = new Cyton({
        verbose: true
      });
      ourBoard.simulatorEnable().should.be.fulfilled.and.notify(done);
    });
    it('should start sim and call disconnected', function (done) {
      ourBoard = new Cyton({
        verbose: true
      });
      let disconnectStub = sinon.stub(ourBoard, 'disconnect').returns(Promise.resolve());
      let isConnectedStub = sinon.stub(ourBoard, 'isConnected').returns(true);
      ourBoard.options.simulate.should.equal(false);
      ourBoard.simulatorEnable().then(() => {
        disconnectStub.should.have.been.calledOnce();
        disconnectStub.restore();
        isConnectedStub.restore();
        ourBoard.options.simulate.should.equal(true);
        done();
      }, done);
    });
    it('should not enable the simulator if already simulating', function (done) {
      ourBoard = new Cyton({
        verbose: true,
        simulate: true
      });
      ourBoard.simulatorEnable().should.be.rejected.and.notify(done);
    });
    it('can disable simulator', function (done) {
      ourBoard = new Cyton({
        verbose: true,
        simulate: true
      });
      ourBoard.simulatorDisable().should.be.fulfilled.and.notify(done);
    });
    it('should not disable simulator if not in simulate mode', function (done) {
      ourBoard = new Cyton({
        verbose: true
      });
      ourBoard.simulatorDisable().should.be.rejected.and.notify(done);
    });
    it('should disable sim and call disconnected', function (done) {
      ourBoard = new Cyton({
        verbose: true,
        simulate: true
      });
      ourBoard.connect(k.OBCISimulatorPortName).catch(done);
      ourBoard.on('ready', function () {
        expect(ourBoard.isSimulating()).to.equal(true);
        let disconnectSpy = sinon.spy(ourBoard, 'disconnect');
        ourBoard.options.simulate.should.equal(true);
        ourBoard.simulatorDisable().then(() => {
          disconnectSpy.should.have.been.calledOnce();
          disconnectSpy.restore();
          ourBoard.options.simulate.should.equal(false);
          done();
        }, done);
      });
    });
    it('should be able to propagate constructor options to simulator', function (done) {
      ourBoard = new Cyton({
        verbose: true,
        simulate: true,
        simulatorBoardFailure: true,
        simulatorDaisyModuleAttached: true,
        simulatorDaisyModuleCanBeAttached: false,
        simulatorFirmwareVersion: k.OBCIFirmwareV2,
        simulatorHasAccelerometer: false,
        simulatorInternalClockDrift: -1,
        simulatorInjectAlpha: false,
        simulatorFragmentation: k.OBCISimulatorFragmentationFullBuffers,
        simulatorLatencyTime: 314,
        simulatorBufferSize: 2718,
        simulatorInjectLineNoise: k.OBCISimulatorLineNoiseNone,
        simulatorSampleRate: 16,
        simulatorSerialPortFailure: true
      });
      ourBoard.once('ready', () => {
        let simOptions = ourBoard.serial.options;
        expect(simOptions).to.be.an('object');
        expect(simOptions.accel).to.be.false();
        expect(simOptions.alpha).to.be.false();
        expect(simOptions.boardFailure).to.be.true();
        expect(simOptions.daisy).to.be.true();
        expect(simOptions.daisyCanBeAttached).to.be.false();
        expect(simOptions.drift).to.be.below(0);
        expect(simOptions.firmwareVersion).to.be.equal(k.OBCIFirmwareV2);
        expect(simOptions.fragmentation).to.be.equal(k.OBCISimulatorFragmentationFullBuffers);
        expect(simOptions.latencyTime).to.be.equal(314);
        expect(simOptions.bufferSize).to.be.equal(2718);
        expect(simOptions.lineNoise).to.be.equal(k.OBCISimulatorLineNoiseNone);
        expect(simOptions.sampleRate).to.be.equal(16);
        expect(simOptions.serialPortFailure).to.be.true();
        expect(simOptions.verbose).to.be.true();
      });
      ourBoard.connect(k.OBCISimulatorPortName)
        .then(() => {
          return ourBoard.disconnect();
        })
        .then(() => {
          done();
        }).catch(err => done(err));
    });
    it('should be able to set info for cyton board', function (done) {
      ourBoard.simulatorDisable()
        .then(() => {
          ourBoard.overrideInfoForBoardType('cyton');
          expect(ourBoard.getBoardType()).to.be.equal(k.OBCIBoardCyton);
          expect(ourBoard.numberOfChannels()).to.be.equal(k.OBCINumberOfChannelsCyton);
          expect(ourBoard.sampleRate()).to.be.equal(k.OBCISampleRate250);
          done();
        })
        .catch((err) => {
          if (err.message === 'Not simulating') {
            ourBoard.overrideInfoForBoardType('cyton');
            expect(ourBoard.getBoardType()).to.be.equal(k.OBCIBoardCyton);
            expect(ourBoard.numberOfChannels()).to.be.equal(k.OBCINumberOfChannelsCyton);
            expect(ourBoard.sampleRate()).to.be.equal(k.OBCISampleRate250);
            done();
          } else {
            done(err);
          }
        });
    });
    it('should be able to set info for daisy board', function (done) {
      ourBoard.simulatorDisable()
        .then(() => {
          ourBoard.overrideInfoForBoardType('daisy');
          expect(ourBoard.getBoardType()).to.be.equal(k.OBCIBoardDaisy);
          expect(ourBoard.numberOfChannels()).to.be.equal(k.OBCINumberOfChannelsDaisy);
          expect(ourBoard.sampleRate()).to.be.equal(k.OBCISampleRate125);
          done();
        })
        .catch((err) => {
          if (err.message === 'Not simulating') {
            ourBoard.overrideInfoForBoardType('daisy');
            expect(ourBoard.getBoardType()).to.be.equal(k.OBCIBoardDaisy);
            expect(ourBoard.numberOfChannels()).to.be.equal(k.OBCINumberOfChannelsDaisy);
            expect(ourBoard.sampleRate()).to.be.equal(k.OBCISampleRate125);
            done();
          } else {
            done(err);
          }
        });
    });
    it('should set info to default on bad input string', function (done) {
      ourBoard.simulatorDisable()
        .then(() => {
          ourBoard.overrideInfoForBoardType('taco');
          expect(ourBoard.getBoardType()).to.be.equal(k.OBCIBoardCyton);
          expect(ourBoard.numberOfChannels()).to.be.equal(k.OBCINumberOfChannelsCyton);
          expect(ourBoard.sampleRate()).to.be.equal(k.OBCISampleRate250);
          done();
        })
        .catch((err) => {
          if (err.message === 'Not simulating') {
            ourBoard.overrideInfoForBoardType('cyton');
            expect(ourBoard.getBoardType()).to.be.equal(k.OBCIBoardCyton);
            expect(ourBoard.numberOfChannels()).to.be.equal(k.OBCINumberOfChannelsCyton);
            expect(ourBoard.sampleRate()).to.be.equal(k.OBCISampleRate250);
            done();
          } else {
            done(err);
          }
        });
    });
  });
  describe('#debug', function () {
    before(function (done) {
      ourBoard = new Cyton({
        debug: true
      });
      ourBoard.once('ready', () => {
        sinon.spy(console, 'log');
        done();
      });
      ourBoard.connect(k.OBCISimulatorPortName).catch(done);
    });
    after(function (done) {
      console.log.restore();
      ourBoard.disconnect().then(done, done);
    });
    after(() => bluebirdChecks.noPendingPromises());
    it('outputs a packet when written', done => {
      console.log.reset();
      ourBoard.write(k.OBCIStreamStop).catch(done);
      setTimeout(() => {
        console.log.should.have.been.calledWithMatch(k.OBCIStreamStop);
        done();
      }, k.OBCIWriteIntervalDelayMSLong * 2);
    });
    it('outputs a packet when received', done => {
      console.log.reset();
      ourBoard.sdStop().catch(done);
      ourBoard.once('eot', () => {
        console.log.should.have.been.calledWithMatch('$');
        done();
      });
    });
  });
  describe('#boardTests', function () {
    this.timeout(3000);
    before(function () {
      ourBoard = new Cyton({
        simulate: !realBoard,
        verbose: false,
        simulatorFragmentation: k.OBCISimulatorFragmentationRandom
      });
      spy = sinon.spy(ourBoard, '_writeAndDrain');
    });
    after(function (done) {
      if (ourBoard.isConnected()) {
        ourBoard.disconnect().then(() => {
          done();
        });
      } else {
        done();
      }
    });
    after(() => bluebirdChecks.noPendingPromises());
    afterEach(function () {
      if (spy) spy.reset();
      ourBoard.removeAllListeners('sample');
      ourBoard.removeAllListeners('ready');
      ourBoard.removeAllListeners('rawDataPacket');
    });
    describe('#connect/disconnect/streamStart/streamStop', function () {
      it('rejects if already disconnected', function () {
        return ourBoard.disconnect().should.be.rejected;
      });
      it('rejects if already connected', function (done) {
        ourBoard.connect(masterPortName).catch(err => done(err));

        ourBoard.once('ready', () => {
          ourBoard.connect(masterPortName)
            .then(() => {
              return ourBoard.disconnect();
            })
            .then(() => {
              done('should have failed to connect');
            })
            .catch((err) => {
              if (err.message === 'already connected!') {
                return ourBoard.disconnect();
              } else {
                return Promise.reject(err);
              }
            })
            .then(() => {
              done();
            })
            .catch((err) => {
              done(err);
            });
        });
      });
      it('gets the ready signal from the board and sends a stop streaming command before disconnecting', function (done) {
        // spy = sinon.spy(ourBoard,"_writeAndDrain")

        ourBoard.connect(masterPortName).catch(err => done(err));

        ourBoard.once('ready', function () {
          ourBoard.streamStart().catch(err => done(err)); // start streaming

          ourBoard.once('sample', (sample) => { // wait till we get a sample
            ourBoard.disconnect().then(() => { // call disconnect
              // console.log('Device is streaming: ' + ourBoard.isStreaming() ? 'true' : 'false')
              setTimeout(() => {
                spy.should.have.been.calledWithMatch(k.OBCIStreamStop);
                let conditionalTimeout = realBoard ? 300 : 0;
                setTimeout(() => {
                  done();
                }, conditionalTimeout);
              }, 4 * k.OBCIWriteIntervalDelayMSShort); // give plenty of time
            }).catch(err => done(err));
          });
        });
      });
      it('rawDataPacket is emitted', function (done) {
        ourBoard.connect(masterPortName).catch(err => done(err));
        // for the ready signal test
        ourBoard.once('ready', function () {
          ourBoard.streamStart().catch(err => done(err)); // start streaming

          ourBoard.once('rawDataPacket', (rawDataPacket) => { // wait till we get a raw data packet
            ourBoard.disconnect().then(() => { // call disconnect
              done();
            }).catch(err => done(err));
          });
        });
      });
      it('daisy not attached in soft reset, daisy requested by user in options, module tries to attach and is successful', function (done) {
        if (ourBoard.isSimulating()) {
          // Turn hardSet on
          ourBoard.options.hardSet = true;
          // Set the options to daisy boardType
          ourBoard.options.boardType = k.OBCIBoardDaisy;
          // The simulator does not have a daisy
          ourBoard.options.simulatorDaisyModuleAttached = false;
          // The simulator is able to attach daisy
          ourBoard.options.simulatorDaisyModuleCanBeAttached = true;
          const failTestWithErr = (err) => {
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done(err);
            }).catch(() => {
              done(err);
            });
          };
          const hardSetFuncOnTime = () => {
            // Verify the module is still default
            expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
            // Remove the premature ready function because it won't fire
            ourBoard.removeListener('ready', readyFuncPreMature);
            // If the board was able to attach the daisy
            ourBoard.once('ready', readyFuncSuccess);
            // If the board was unable to attach the daisy.
            ourBoard.once('error', errorFuncTestFailure); // should not happen
          };
          const errorFuncTestFailure = () => {
            ourBoard.removeListener('ready', readyFuncSuccess);
            failTestWithErr('failed to attach daisy, should emit error');
          };
          const readyFuncPreMature = () => {
            ourBoard.removeListener('hardSet', hardSetFuncOnTime);
            failTestWithErr('the board should not have been ready yet');
          };
          const readyFuncSuccess = () => {
            // Verify the module is still default
            expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardDaisy);
            // Remove because it won't fire
            ourBoard.removeListener('error', errorFuncTestFailure);
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done();
            }).catch(() => {
              done();
            });
          };

          ourBoard.once('ready', readyFuncPreMature);
          ourBoard.once('hardSet', hardSetFuncOnTime);
          ourBoard.connect(masterPortName).catch(err => done(err));
        } else {
          done();
        }
      });
      it('daisy not attached in soft reset, daisy requested by user in options, module tries to attach and fails', function (done) {
        if (ourBoard.isSimulating()) {
          // Turn hardSet on
          ourBoard.options.hardSet = true;
          // Set the options to daisy boardType
          ourBoard.options.boardType = k.OBCIBoardDaisy;
          // The simulator does NOT have a daisy
          ourBoard.options.simulatorDaisyModuleAttached = false;
          // The simulator is NOT able to attach daisy
          ourBoard.options.simulatorDaisyModuleCanBeAttached = false;
          const failTestWithErr = (err) => {
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done(err);
            }).catch(() => {
              done(err);
            });
          };
          const errorFuncTestSuccess = () => {
            // Verify the module is still default
            expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              ourBoard.removeListener('ready', readyFuncTestFailure);
              done();
            }).catch(() => {
              ourBoard.removeListener('ready', readyFuncTestFailure);
              done();
            });
          };
          const readyFuncTestFailure = () => {
            failTestWithErr('failed to attach daisy when requested, ready should not be emitted');
          };
          const readyFuncPreMature = () => {
            ourBoard.removeListener('hardSet', hardSetFuncOnTime);
            failTestWithErr('the board should not have been ready yet');
          };
          const hardSetFuncOnTime = () => {
            // Verify the module is still default
            expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
            // Remove the premature ready function because it won't fire
            ourBoard.removeListener('ready', readyFuncPreMature);
            // If the board was able to attach the daisy
            ourBoard.once('ready', readyFuncTestFailure);
            // If the board was unable to attach the daisy.
            ourBoard.once('error', errorFuncTestSuccess); // should not happen
          };
          ourBoard.once('ready', readyFuncPreMature);
          ourBoard.once('hardSet', hardSetFuncOnTime);
          ourBoard.connect(masterPortName)
            .then(() => {
              readyFuncPreMature();
            })
            .catch(err => {
              expect(err).to.equal('Error: unable to attach daisy');
              ourBoard.removeListener('ready', readyFuncTestFailure);
              done();
            });
        } else {
          done();
        }
      });
      it('daisy attached in soft reset, default board (not daisy) requested by user in options, module tries to remove and succeeds', function (done) {
        if (ourBoard.isSimulating()) {
          // Turn hardSet on
          ourBoard.options.hardSet = true;
          // Set the options to daisy boardType
          ourBoard.options.boardType = k.OBCIBoardCyton;
          // The simulator has a daisy attached
          ourBoard.options.simulatorDaisyModuleAttached = true;

          const failTestWithErr = (err) => {
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done(err);
            }).catch(() => {
              done(err);
            });
          };
          const hardSetFuncOnTime = () => {
            // Verify the module is set to daisy mode
            expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardDaisy);
            // Remove the premature ready function because it won't fire
            ourBoard.removeListener('ready', readyFuncPreMature);
            // If the board was able to remove the daisy
            ourBoard.once('ready', readyFuncSuccess); // intended
            // If the board was unable to remove the daisy.
            ourBoard.once('error', errorFuncTestFailure); // should not happen
          };
          const errorFuncTestFailure = () => {
            ourBoard.removeListener('ready', readyFuncSuccess);
            failTestWithErr('failed to attach daisy, should emit error');
          };
          const readyFuncPreMature = () => {
            ourBoard.removeListener('hardSet', hardSetFuncOnTime);
            failTestWithErr('the board should not have been ready yet');
          };
          const readyFuncSuccess = () => {
            // Verify the module switched to default type
            expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
            // Remove because it won't fire
            ourBoard.removeListener('error', errorFuncTestFailure);
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done();
            }).catch(() => {
              done();
            });
          };

          ourBoard.once('ready', readyFuncPreMature);
          ourBoard.once('hardSet', hardSetFuncOnTime);
          ourBoard.connect(masterPortName).catch(err => done(err));
        } else {
          done();
        }
      });
      it('daisy attached in soft reset, daisy requested by user in options, module is successful', function (done) {
        if (ourBoard.isSimulating()) {
          // Turn hardSet on
          ourBoard.options.hardSet = true;
          // Set the options to daisy boardType
          ourBoard.options.boardType = k.OBCIBoardDaisy;
          // The simulator does have a daisy
          ourBoard.options.simulatorDaisyModuleAttached = true;
          // The simulator is able to attach daisy
          ourBoard.options.simulatorDaisyModuleCanBeAttached = true;
          const failTestWithErr = (err) => {
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done(err);
            }).catch(() => {
              done(err);
            });
          };
          let hardSetFuncFailure = () => {
            ourBoard.removeListener('ready', readyFuncSuccess);
            ourBoard.removeListener('hardSet', hardSetFuncFailure);
            failTestWithErr('should not hardSet');
          };
          let errorFuncTestFailure = () => {
            ourBoard.removeListener('ready', readyFuncSuccess);
            ourBoard.removeListener('hardSet', hardSetFuncFailure);
            failTestWithErr('should not error');
          };
          let readyFuncSuccess = () => {
            ourBoard.removeListener('error', errorFuncTestFailure);
            ourBoard.removeListener('hardSet', hardSetFuncFailure);
            // Verify the module is still default
            expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardDaisy);
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done();
            }).catch(() => {
              done();
            });
          };

          ourBoard.once('error', errorFuncTestFailure);
          ourBoard.once('ready', readyFuncSuccess);
          ourBoard.once('hardSet', hardSetFuncFailure);
          ourBoard.connect(masterPortName).catch(err => done(err));
        } else {
          done();
        }
      });
      it('no daisy attached in soft reset, default requested by user in options, module is successful', function (done) {
        if (ourBoard.isSimulating()) {
          // Turn hardSet on
          ourBoard.options.hardSet = true;
          // Set the options to default boardType
          ourBoard.options.boardType = k.OBCIBoardCyton;
          // The simulator does not have a daisy
          ourBoard.options.simulatorDaisyModuleAttached = false;
          // The simulator is able to attach daisy
          ourBoard.options.simulatorDaisyModuleCanBeAttached = false;
          const failTestWithErr = (err) => {
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done(err);
            }).catch(() => {
              done(err);
            });
          };
          let hardSetFuncFailure = () => {
            ourBoard.removeListener('ready', readyFuncSuccess);
            ourBoard.removeListener('hardSet', hardSetFuncFailure);
            failTestWithErr('should not hard set');
          };
          let errorFuncTestFailure = () => {
            ourBoard.removeListener('ready', readyFuncSuccess);
            ourBoard.removeListener('hardSet', hardSetFuncFailure);
            failTestWithErr('should not emit error');
          };
          let readyFuncSuccess = () => {
            ourBoard.removeListener('error', errorFuncTestFailure);
            ourBoard.removeListener('hardSet', hardSetFuncFailure);
            // Verify the module is still default
            expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
            ourBoard.options.hardSet = false;
            ourBoard.disconnect().then(() => { // call disconnect
              done();
            }).catch(() => {
              done();
            });
          };

          ourBoard.once('error', errorFuncTestFailure);
          ourBoard.once('ready', readyFuncSuccess);
          ourBoard.once('hardSet', hardSetFuncFailure);
          ourBoard.connect(masterPortName).catch(err => done(err));
        } else {
          done();
        }
      });
    });
    describe('#connected', function () {
      beforeEach(function (done) {
        ourBoard.connect(masterPortName).catch(done);

        ourBoard.once('ready', done);
      });
      afterEach(function (done) {
        if (ourBoard.isConnected()) {
          ourBoard.disconnect().then(done, () => done());
        } else {
          done();
        }
      });
      it('is connected after connection', function () {
        expect(ourBoard.isConnected()).to.be.true();
      });
      it('is no longer connected after clean disconnection', function (done) {
        ourBoard.disconnect().then(() => {
          expect(ourBoard.isConnected()).to.be.false();
          done();
        }, done);
      });
      it('is no longer connected if stream closes itself', function (done) {
        ourBoard.serial.close(() => {
          expect(ourBoard.isConnected()).to.be.false();
          done();
        });
      });
      it('is no longer connected after a stream error', function () {
        let errorDamper = () => true;
        ourBoard.on('error', errorDamper);
        ourBoard.serial.emit('error', new Error('test error'));
        expect(ourBoard.isConnected()).to.be.false();
        ourBoard.removeListener('error', errorDamper);
      });
    });
    describe('#write', function () {
      beforeEach(function (done) {
        ourBoard.connect(masterPortName).catch(done);

        ourBoard.once('ready', done);
      });
      afterEach(function (done) {
        if (ourBoard.isConnected()) {
          ourBoard.disconnect()
            .then(() => {
              done();
            })
            .catch(() => {
              done();
            });
        } else {
          done();
        }
      });
      it('rejects after clean disconnection', function (done) {
        ourBoard.disconnect().then(() => {
          ourBoard.write(k.OBCIMiscSoftReset).should.be.rejected.and.notify(done);
        }, done);
      });
      it('rejects if stream closes itself', function (done) {
        ourBoard.serial.close(() => {
          ourBoard.write(k.OBCIMiscSoftReset).should.be.rejected.and.notify(done);
        });
      });
      it('rejects after a stream error', function (done) {
        let errorDamper = () => true;
        ourBoard.on('error', errorDamper);
        ourBoard.serial.emit('error', new Error('test error'));
        ourBoard.write(k.OBCIMiscSoftReset).should.be.rejected.and.notify(done);
        ourBoard.removeListener('error', errorDamper);
      });
      it('does not allow data to be sent after clean disconnection', function (done) {
        let writeSpy1 = sinon.spy(ourBoard.serial, 'write');
        let byteToWrite = k.OBCISDLogStop;
        let writeWhileConnected = function () {
          ourBoard.write(byteToWrite).then(() => {
            if (ourBoard.isConnected()) {
              writeSpy1.reset();
              writeWhileConnected();
            } else {
              done('wrote when not connected');
            }
          }, err => {
            if (ourBoard.isConnected()) {
              done(err);
            } else {
              process.nextTick(() => {
                ourBoard.connect(masterPortName).catch(done);
                let writeSpy2 = sinon.spy(ourBoard.serial, 'write');
                ourBoard.once('ready', () => {
                  writeSpy2.should.equal(ourBoard.serial.write);
                  writeSpy1.should.have.not.been.called();
                  writeSpy2.should.have.not.been.calledWith(byteToWrite);
                  writeSpy1.restore();
                  writeSpy2.restore();
                  done();
                });
              });
            }
          });
        };
        writeWhileConnected();
        ourBoard.disconnect().catch(done);
      });
      it('disconnects immediately, rejecting all buffered writes', function (done) {
        let writeSpy = sinon.spy(ourBoard.serial, 'write');
        ourBoard.write(k.OBCISDLogStop).should.have.been.rejected();
        ourBoard.write(k.OBCISDLogStop).should.have.been.rejected();
        ourBoard.write(k.OBCISDLogStop).should.have.been.rejected();
        ourBoard.write(k.OBCISDLogStop).should.have.been.rejected();

        ourBoard.disconnect()
          .then(() => {
            writeSpy.should.have.not.been.called();
            writeSpy.restore();
            done();
          })
          .catch((err) => {
            done(err);
          });
      });
    });
    describe('#listPorts', function () {
      it('returns a list of ports', function (done) {
        ourBoard.listPorts().then(ports => {
          if (ports.some(port => {
            if (port.comName === masterPortName) {
              return true;
            }
          })) {
            done();
          } else {
            done();
          }
        });
      });
    });
    describe('#sdStart', function () {
      before(function (done) {
        ourBoard.connect(k.OBCISimulatorPortName)
          .then(() => {
            done();
          })
          .catch(err => done(err));
      });
      afterEach(function (done) {
        ourBoard.sdStop()
          .catch(done);
        ourBoard.once('eot', () => {
          done();
        });
      });
      after(function (done) {
        ourBoard.disconnect()
          .then(done)
          .catch(err => done(err));
      });
      it('can start 14 seconds of logging with sd', function (done) {
        ourBoard.sdStart('14sec')
          .catch(err => done(err));
        ourBoard.once('eot', () => {
          done();
        });
      });
      it('can start 5 minutes of logging with sd', function (done) {
        ourBoard.sdStart('5min')
          .catch(err => done(err));
        ourBoard.once('eot', () => {
          done();
        });
      });
      it('can start 15 minutes of logging with sd', function (done) {
        ourBoard.sdStart('15min')
          .catch(err => done(err));
        ourBoard.once('eot', () => {
          done();
        });
      });
      it('can start 30 minutes of logging with sd', function (done) {
        ourBoard.sdStart('30min')
          .catch(err => done(err));
        ourBoard.once('eot', () => {
          done();
        });
      });
      it('can start 1 hour of logging with sd', function (done) {
        ourBoard.sdStart('1hour')
          .catch(err => done(err));
        ourBoard.once('eot', () => {
          done();
        });
      });
      it('can start 2 hours of logging with sd', function (done) {
        ourBoard.sdStart('2hour')
          .catch(err => done(err));
        ourBoard.once('eot', () => {
          done();
        });
      });
      it('can start 4 hours of logging with sd', function (done) {
        ourBoard.sdStart('4hour')
          .catch(err => done(err));
        ourBoard.once('eot', () => {
          done();
        });
      });
      it('can start 12 hours of logging with sd', function (done) {
        ourBoard.sdStart('12hour')
          .catch(err => done(err));
        ourBoard.once('eot', () => {
          done();
        });
      });
      it('can start 24 hours of logging with sd', function (done) {
        ourBoard.sdStart('24hour')
          .catch(done);
        ourBoard.once('eot', () => {
          done();
        });
      });
    });
    describe('#sdStop', function () {
      before(function (done) {
        ourBoard.connect(k.OBCISimulatorPortName).catch(err => done(err));
        ourBoard.once('ready', done);
      });
      it('can stop logging with sd', function (done) {
        // console.log('yoyoyo')
        ourBoard.sdStop().catch(err => done(err));
        ourBoard.once('eot', () => {
          // check here in case write was delayed
          spy.should.have.been.calledWith('j');
          done();
        });
      });
    });
    describe('#setBoardType', function () {
      before(function (done) {
        if (!ourBoard.isConnected()) {
          ourBoard.connect(masterPortName)
            .then(() => {
              done();
            })
            .catch(done);
        } else {
          done();
        }
      });
      after(function (done) {
        ourBoard.disconnect()
          .then(done)
          .catch(done);
      });
      it('should resolve for setting max channels to 8 when already 8', function (done) {
        if (ourBoard.isSimulating()) {
          ourBoard.serial.options.daisy = false;
          ourBoard.hardSetBoardType('default')
            .then((res) => {
              expect(res).to.equal('no daisy to remove');
              expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
              done();
            }).catch(done);
        } else {
          done();
        }
      });
      it('should resolve for setting max channels to 8', function (done) {
        if (ourBoard.isSimulating()) {
          ourBoard.serial.options.daisy = true;
          ourBoard.hardSetBoardType('default')
            .then((res) => {
              expect(res).to.equal('daisy removed');
              expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
              done();
            }).catch(done);
        } else {
          done();
        }
      });
      it('should resolve for setting max channels to 16 if daisy already attached', function (done) {
        if (ourBoard.isSimulating()) {
          ourBoard.serial.options.daisy = true;
          ourBoard.hardSetBoardType('daisy')
            .then((res) => {
              expect(res).to.equal('daisy already attached');
              expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardDaisy);
              done();
            }).catch(done);
        } else {
          done();
        }
      });
      it('should resolve for setting max channels to 16 if daisy able to be attached', function (done) {
        if (ourBoard.isSimulating()) {
          ourBoard.serial.options.daisy = false;
          ourBoard.serial.options.daisyCanBeAttached = true;
          ourBoard.hardSetBoardType('daisy')
            .then((res) => {
              expect(res).to.equal('daisy attached');
              expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardDaisy);
              done();
            }).catch(done);
        } else {
          done();
        }
      });
      it('should reject when setting max channels to 16 if daisy not able to be attached', function (done) {
        if (ourBoard.isSimulating()) {
          ourBoard.serial.options.daisy = false;
          ourBoard.serial.options.daisyCanBeAttached = false;
          ourBoard.hardSetBoardType('daisy')
            .then(done)
            .catch((err) => {
              expect(err.message).to.equal('unable to attach daisy');
              expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
              done();
            });
        } else {
          done();
        }
      });
      it('should not write a command if invalid channel number', function (done) {
        ourBoard.hardSetBoardType(0).should.be.rejected.and.notify(done);
      });
    });
    describe('#channelOff', function () {
      before(function (done) {
        if (!ourBoard.isConnected()) {
          ourBoard.connect(masterPortName)
            .then(done)
            .catch(err => done(err));
        } else {
          done();
        }
      });

      it('should call the write function with proper command for channel 1', function (done) {
        ourBoard.channelOff(1).then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCIChannelOff1);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should call the write function with proper command for channel 16', function (done) {
        // spy = sinon.spy(ourBoard,"_writeAndDrain")

        ourBoard.channelOff(16).then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCIChannelOff16);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should reject with invalid channel', function (done) {
        ourBoard.channelOff(0).should.be.rejected.and.notify(done);
      });
      it('should turn the realBoard channel off', function (done) {
        ourBoard.channelOff(1).then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCIChannelOff1);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
    });
    describe('#channelOn', function () {
      before(function (done) {
        if (!ourBoard.isConnected()) {
          ourBoard.connect(masterPortName)
            .then(done)
            .catch(err => done(err));
        } else {
          done();
        }
      });

      it('should call the write function with proper command for channel 2', function (done) {
        ourBoard.channelOn(2).then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCIChannelOn2);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should call the write function with proper command for channel 16', function (done) {
        ourBoard.channelOn(16).then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCIChannelOn16);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should reject with invalid channel', function (done) {
        ourBoard.channelOn(0).should.be.rejected.and.notify(done);
      });
    });
    describe('#channelSet', function () {
      this.timeout(6000);
      before(function (done) {
        if (!ourBoard.isConnected()) {
          ourBoard.connect(masterPortName)
            .then(done)
            .catch(err => done(err));
        } else {
          done();
        }
      });
      it('should call the writeAndDrain function array of commands 9 times', function (done) {
        setTimeout(() => {
          spy.reset();
          ourBoard.channelSet(1, true, 24, 'normal', true, true, true)
            .then(() => {
              setTimeout(() => {
                spy.callCount.should.equal(9);
                done();
              }, 15 * k.OBCIWriteIntervalDelayMSShort);
            })
            .catch(err => done(err));
        }, 10 * k.OBCIWriteIntervalDelayMSShort); // give some time for writer to finish
      });

      it('should be rejected', function (done) {
        ourBoard.channelSet(1, true, 24, 'normal', 'taco', true, true).should.be.rejected.and.notify(done);
      });
    });
    describe('#impedanceSet', function () {
      this.timeout(6000);
      let firmwareVersion;
      before(function (done) {
        if (!ourBoard.isConnected()) {
          firmwareVersion = ourBoard.options.simulatorFirmwareVersion;
          ourBoard.connect(masterPortName)
            .then((done) => {

            })
            .catch(err => done(err));
        } else {
          done();
        }
      });
      after(() => {
        ourBoard.options.simulatorFirmwareVersion = firmwareVersion;
      });
      it('should call the writeAndDrain function with single string for firmware v2+', function (done) {
        spy.reset();
        ourBoard.options.simulatorFirmwareVersion = 'v2';
        ourBoard.impedanceSet(4, false, true)
          .then(() => {
            setTimeout(() => {
              spy.should.have.been.calledWith(Buffer.from('z401Z'));
              done();
            }, 15 * k.OBCIWriteIntervalDelayMSShort);
          })
          .catch(err => done(err));
      });
      it('should call the writeAndDrain function array of commands 9 times for firmware v1', function (done) {
        ourBoard.options.simulatorFirmwareVersion = 'v1';
        setTimeout(() => {
          spy.reset();
          ourBoard.impedanceSet(1, true, true)
            .then(() => {
              setTimeout(() => {
                spy.callCount.should.equal(5);
                done();
              }, 15 * k.OBCIWriteIntervalDelayMSShort);
            })
            .catch(err => done(err));
        }, 10 * k.OBCIWriteIntervalDelayMSShort); // give some time for writer to finish
      });

      it('should be rejected', function (done) {
        ourBoard.impedanceSet(1, true, 'taco').should.be.rejected.and.notify(done);
      });
    });
    describe('#syncRegisterSettings', function () {
      this.timeout(6000);
      before(function (done) {
        if (!ourBoard.isConnected()) {
          ourBoard.connect(masterPortName)
            .then(done)
            .catch(err => done(err));
        } else {
          done();
        }
      });
      it('should send the correct register setting', function (done) {
        ourBoard.syncRegisterSettings()
          .then((channelSettings) => {
            expect(channelSettings).to.not.equal(null);
            done();
          }).catch(done);
      });
    });
    describe('#testSignal', function () {
      it('should call the write function with proper command for dc test signal', function (done) {
        ourBoard.testSignal('dc').then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCITestSignalConnectToDC);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should call the write function with proper command for dc test signal', function (done) {
        ourBoard.testSignal('ground').then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCITestSignalConnectToGround);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should call the write function with proper command for dc test signal', function (done) {
        ourBoard.testSignal('pulse1xFast').then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCITestSignalConnectToPulse1xFast);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should call the write function with proper command for dc test signal', function (done) {
        ourBoard.testSignal('pulse1xSlow').then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCITestSignalConnectToPulse1xSlow);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should call the write function with proper command for dc test signal', function (done) {
        ourBoard.testSignal('pulse2xFast').then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCITestSignalConnectToPulse2xFast);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should call the write function with proper command for dc test signal', function (done) {
        ourBoard.testSignal('pulse2xSlow').then(() => {
          setTimeout(() => {
            spy.should.have.been.calledWith(k.OBCITestSignalConnectToPulse2xSlow);
            done();
          }, 5 * k.OBCIWriteIntervalDelayMSShort);
        });
      });
      it('should reject with invalid test signal', function (done) {
        ourBoard.testSignal('taco').should.be.rejected.and.notify(done);
      });
    });
    describe('#impedanceTest Not Connected Rejects ', function () {
      it('rejects all channeles when not streaming', function (done) {
        ourBoard.impedanceTestAllChannels().should.be.rejected.and.notify(done);
      });
      it('rejects array channels when not streaming', function (done) {
        ourBoard.impedanceTestChannels(['-', 'N', 'n', 'p', 'P', '-', 'b', 'b']).should.be.rejected.and.notify(done);
      });
    });
    describe('#impedancePrivates', function () {
      describe('disconnected', function () {
        before(function (done) {
          if (ourBoard.isConnected()) {
            ourBoard.disconnect()
              .then(done)
              .catch(err => done(err));
          } else {
            done();
          }
        });
        describe('#_impedanceTestSetChannel', function () {
          it('should reject because not connected', function (done) {
            ourBoard._impedanceTestSetChannel(0, false, false).should.be.rejected.and.notify(done);
          });
        });
      });
    });
  });

  /**
  * Test the function that parses an incoming data buffer for packets
  */
  describe('#_processDataBuffer', function () {
    let _processQualifiedPacketSpy;
    before(() => {
      ourBoard = new Cyton({
        verbose: true
      });
      _processQualifiedPacketSpy = sinon.spy(ourBoard, '_processQualifiedPacket');
    });
    after(() => {
      ourBoard = null;
      return bluebirdChecks.noPendingPromises();
    });

    it('should do nothing when empty buffer inserted', () => {
      let buffer = null;

      // Test the function
      buffer = ourBoard._processDataBuffer(buffer);

      expect(buffer).to.be.null();
    });
    it('should return an unaltered buffer if there is less than a packets worth of data in it', () => {
      let expectedString = 'AJ';
      let buffer = new Buffer(expectedString);

      // Reset the spy if it exists
      if (_processQualifiedPacketSpy) _processQualifiedPacketSpy.reset();

      // Test the function
      buffer = ourBoard._processDataBuffer(buffer);

      // Convert the buffer to a string and ensure that it equals the expected string
      buffer.toString().should.equal(expectedString);

      // Make sure that the spy was not infact called.
      _processQualifiedPacketSpy.should.not.have.been.called();
    });
    it('should identify a packet', () => {
      let buffer = openBCIUtilities.samplePacketReal(0);

      // Reset the spy if it exists
      if (_processQualifiedPacketSpy) _processQualifiedPacketSpy.reset();

      // Call the function under test
      buffer = ourBoard._processDataBuffer(buffer);

      // Ensure that we extracted only one buffer
      _processQualifiedPacketSpy.should.have.been.calledOnce();

      // The buffer should not have anything in it any more
      expect(buffer).to.be.null();
    });
    it('should extract a buffer and preserve the remaining data in the buffer', () => {
      let expectedString = 'AJ';
      let extraBuffer = new Buffer(expectedString);
      // declare the big buffer
      let buffer = new Buffer(k.OBCIPacketSize + extraBuffer.length);
      // Fill that new big buffer with buffers
      openBCIUtilities.samplePacketReal(0).copy(buffer, 0);
      extraBuffer.copy(buffer, k.OBCIPacketSize);
      // Reset the spy if it exists
      if (_processQualifiedPacketSpy) _processQualifiedPacketSpy.reset();
      // Call the function under test
      buffer = ourBoard._processDataBuffer(buffer);
      // Ensure that we extracted only one buffer
      _processQualifiedPacketSpy.should.have.been.called();
      // The buffer should have the epxected number of bytes left
      buffer.length.should.equal(expectedString.length);
      // Convert the buffer to a string and ensure that it equals the expected string
      buffer.toString().should.equal(expectedString);
    });

    it('should be able to extract multiple packets from a single buffer', () => {
      // We are going to extract multiple buffers
      let expectedNumberOfBuffers = 3;
      // declare the big buffer
      let buffer = new Buffer(k.OBCIPacketSize * expectedNumberOfBuffers);
      // Fill that new big buffer with buffers
      openBCIUtilities.samplePacketReal(0).copy(buffer, 0);
      openBCIUtilities.samplePacketReal(1).copy(buffer, k.OBCIPacketSize);
      openBCIUtilities.samplePacketReal(2).copy(buffer, k.OBCIPacketSize * 2);
      // Reset the spy if it exists
      if (_processQualifiedPacketSpy) _processQualifiedPacketSpy.reset();
      // Call the function under test
      buffer = ourBoard._processDataBuffer(buffer);
      // Ensure that we extracted only one buffer
      _processQualifiedPacketSpy.should.have.been.calledThrice();
      // The buffer should not have anything in it any more
      expect(buffer).to.be.null();
    });

    it('should be able to get multiple packets and keep extra data on the end', () => {
      let expectedString = 'AJ';
      let extraBuffer = new Buffer(expectedString);
      // We are going to extract multiple buffers
      let expectedNumberOfBuffers = 2;
      // declare the big buffer
      let buffer = new Buffer(k.OBCIPacketSize * expectedNumberOfBuffers + extraBuffer.length);
      // Fill that new big buffer with buffers
      openBCIUtilities.samplePacketReal(0).copy(buffer, 0);
      openBCIUtilities.samplePacketReal(1).copy(buffer, k.OBCIPacketSize);
      extraBuffer.copy(buffer, k.OBCIPacketSize * 2);
      // Reset the spy if it exists
      if (_processQualifiedPacketSpy) _processQualifiedPacketSpy.reset();
      // Call the function under test
      buffer = ourBoard._processDataBuffer(buffer);
      // Ensure that we extracted only one buffer
      _processQualifiedPacketSpy.should.have.been.calledTwice();
      // The buffer should not have anything in it any more
      buffer.length.should.equal(extraBuffer.length);
    });

    it('should be able to get multiple packets with junk in the middle', () => {
      let expectedString = ',';
      let extraBuffer = new Buffer(expectedString);
      // We are going to extract multiple buffers
      let expectedNumberOfBuffers = 2;
      // declare the big buffer
      let buffer = new Buffer(k.OBCIPacketSize * expectedNumberOfBuffers + extraBuffer.length);
      // Fill that new big buffer with buffers
      openBCIUtilities.samplePacketReal(0).copy(buffer, 0);
      extraBuffer.copy(buffer, k.OBCIPacketSize);
      openBCIUtilities.samplePacketReal(1).copy(buffer, k.OBCIPacketSize + extraBuffer.byteLength);

      // Reset the spy if it exists
      if (_processQualifiedPacketSpy) _processQualifiedPacketSpy.reset();
      // Call the function under test
      buffer = ourBoard._processDataBuffer(buffer);
      // Ensure that we extracted only one buffer
      _processQualifiedPacketSpy.should.have.been.calledTwice();
      // The buffer should not have anything in it any more
      bufferEqual(extraBuffer, buffer).should.be.true();
      buffer.length.should.equal(extraBuffer.length);
    });

    it('should be able to get multiple packets with junk in the middle and end', () => {
      let expectedString = ',';
      let extraBuffer = new Buffer(expectedString);
      // We are going to extract multiple buffers
      let expectedNumberOfBuffers = 2;
      // declare the big buffer
      let buffer = new Buffer(k.OBCIPacketSize * expectedNumberOfBuffers + extraBuffer.length * 2);
      // Fill that new big buffer with buffers
      openBCIUtilities.samplePacketReal(0).copy(buffer, 0);
      extraBuffer.copy(buffer, k.OBCIPacketSize);
      openBCIUtilities.samplePacketReal(1).copy(buffer, k.OBCIPacketSize + extraBuffer.byteLength);
      extraBuffer.copy(buffer, k.OBCIPacketSize * 2 + extraBuffer.byteLength);
      // Reset the spy if it exists
      if (_processQualifiedPacketSpy) _processQualifiedPacketSpy.reset();
      // Call the function under test
      buffer = ourBoard._processDataBuffer(buffer);
      // Ensure that we extracted only one buffer
      _processQualifiedPacketSpy.should.have.been.calledTwice();
      // The buffer should not have anything in it any more
      expect(bufferEqual(Buffer.concat([extraBuffer, extraBuffer], 2), buffer)).to.be.true();
      buffer.length.should.equal(extraBuffer.length * 2);
    });
  });

  /**
  * Test the function that routes raw packets for processing
  */
  describe('#_processQualifiedPacket', function () {
    let ourBoard;
    let funcSpyTimeSyncSet;

    before(function () {
      ourBoard = new Cyton({
        verbose: true
      });
      // Put watchers on all functions
      funcSpyTimeSyncSet = sinon.spy(ourBoard, '_processPacketTimeSyncSet');
    });
    beforeEach(function () {
      funcSpyTimeSyncSet.reset();

      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
    });
    after(function () {
      // ourBoard = null
    });
    after(() => bluebirdChecks.noPendingPromises());

    it('should process a time sync set packet with accel', function () {
      let buffer = openBCIUtilities.samplePacketAccelTimeSyncSet();

      // Call the function under test
      ourBoard._processQualifiedPacket(buffer);

      // We should call to sync up
      funcSpyTimeSyncSet.should.have.been.calledOnce();
      funcSpyTimeSyncSet.should.have.been.calledWith(buffer);
    });
    it('should process a time sync set packet with raw aux', function () {
      let buffer = openBCIUtilities.samplePacketRawAuxTimeSyncSet(0);

      // Call the function under test
      ourBoard._processQualifiedPacket(buffer);

      // We should call to sync up
      funcSpyTimeSyncSet.should.have.been.calledOnce();
      funcSpyTimeSyncSet.should.have.been.calledWith(buffer);
    });
    it('should not identify any packet', function () {
      let buffer = openBCIUtilities.samplePacket(0);

      // Set the stop byte to some number not yet defined
      buffer[k.OBCIPacketPositionStopByte] = 0xCF;

      // Call the function under test
      ourBoard._processDataBuffer(buffer);

      // Nothing should be called
      funcSpyTimeSyncSet.should.not.have.been.called();
    });
    it('should emit a dropped packet on dropped packet', function (done) {
      // Set to default state
      ourBoard.previousSampleNumber = -1;
      let sampleNumber0 = openBCIUtilities.samplePacket(0);
      ourBoard.once('droppedPacket', () => {
        done();
      });
      let sampleNumber2 = openBCIUtilities.samplePacket(2);
      // Call the function under test
      ourBoard._processDataBuffer(sampleNumber0);
      ourBoard._processDataBuffer(sampleNumber2);
    });
    it('should emit a dropped packet on dropped packet with edge', function (done) {
      // Set to default state
      let count = 0;
      ourBoard.previousSampleNumber = 253;
      let buf1 = openBCIUtilities.samplePacket(254);
      let countFunc = arr => {
        count++;
      };
      ourBoard.on('droppedPacket', countFunc);
      let buf2 = openBCIUtilities.samplePacket(0);
      let buf3 = openBCIUtilities.samplePacket(1);
      // Call the function under test
      ourBoard._processDataBuffer(buf1);
      ourBoard._processDataBuffer(buf2);
      ourBoard._processDataBuffer(buf3);
      setTimeout(() => {
        ourBoard.removeListener('droppedPacket', countFunc);
        expect(count).to.equal(1);
        done();
      }, 10);
    });
  });

  describe('#_processPacketTimeSyncSet', function () {
    let timeSyncSetPacket;
    let ourBoard;
    before(() => {
      ourBoard = new Cyton({
        verbose: false
      });
    });
    beforeEach(() => {
      timeSyncSetPacket = openBCIUtilities.samplePacketRawAuxTimeSyncSet();
      ourBoard.sync.timeOffsetArray = [];
    });
    afterEach(() => {
      ourBoard.sync.curSyncObj = null;
    });
    after(() => bluebirdChecks.noPendingPromises());
    it('should emit and return bad object if no sync in progress', function () {
      let timeSetPacketArrived = ourBoard.time();
      let expectedTimeSyncOffsetMaster = 72;
      ourBoard.sync.timeOffsetMaster = expectedTimeSyncOffsetMaster;
      ourBoard.curParsingMode = k.OBCIParsingTimeSyncSent;
      ourBoard.once('synced', (syncObj) => {
        expect(syncObj).to.have.property('valid', false);
        expect(syncObj).to.have.property('error', k.OBCIErrorTimeSyncIsNull);
        expect(syncObj).to.have.property('timeOffsetMaster', expectedTimeSyncOffsetMaster);
      });
      let syncObject = ourBoard._processPacketTimeSyncSet(timeSyncSetPacket, timeSetPacketArrived);
      expect(ourBoard.curParsingMode).to.equal(k.OBCIParsingNormal);
      expect(syncObject).to.have.property('valid', false);
      expect(syncObject).to.have.property('error', k.OBCIErrorTimeSyncIsNull);
      expect(syncObject).to.have.property('timeOffsetMaster', expectedTimeSyncOffsetMaster);
    });
    it('should emit and return bad synced object if no sent confirmation found', function () {
      let timeSetPacketArrived = ourBoard.time();
      let expectedTimeSyncOffsetMaster = 72;
      ourBoard.once('synced', (syncObj) => {
        expect(syncObj).to.have.property('valid', false);
        expect(syncObj).to.have.property('error', k.OBCIErrorTimeSyncNoComma);
        expect(syncObj).to.have.property('timeOffsetMaster', expectedTimeSyncOffsetMaster);
      });
      ourBoard.sync.timeOffsetMaster = expectedTimeSyncOffsetMaster;
      ourBoard.curParsingMode = k.OBCIParsingTimeSyncSent;
      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
      let syncObject = ourBoard._processPacketTimeSyncSet(timeSyncSetPacket, timeSetPacketArrived);
      expect(ourBoard.curParsingMode).to.equal(k.OBCIParsingNormal);
      expect(syncObject).to.have.property('valid', false);
      expect(syncObject).to.have.property('error', k.OBCIErrorTimeSyncNoComma);
      expect(syncObject).to.have.property('timeOffsetMaster', expectedTimeSyncOffsetMaster);
    });
    it('should emit and return bad synced object with invalid raw packet', function () {
      let timeSetPacketArrived = ourBoard.time();
      let expectedTimeSyncOffsetMaster = 72;
      let badPacket;
      if (k.getVersionNumber(process.version) >= 6) {
        // from introduced in node version 6.x.x
        badPacket = Buffer.from(timeSyncSetPacket.slice(0, 30));
      } else {
        badPacket = new Buffer(timeSyncSetPacket.slice(0, 30));
      }
      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
      ourBoard.sync.timeOffsetMaster = expectedTimeSyncOffsetMaster;
      ourBoard.once('synced', (syncObj) => {
        expect(syncObj).to.have.property('valid', false);
        expect(syncObj.error).to.have.property('message', k.OBCIErrorInvalidByteLength);
        expect(syncObj).to.have.property('timeOffsetMaster', expectedTimeSyncOffsetMaster);
      });
      let syncObject = ourBoard._processPacketTimeSyncSet(badPacket, timeSetPacketArrived);
      expect(ourBoard.curParsingMode).to.equal(k.OBCIParsingNormal);
      expect(syncObject).to.have.property('valid', false);
      expect(syncObject.error).to.have.property('message', k.OBCIErrorInvalidByteLength);
      expect(syncObject).to.have.property('timeOffsetMaster', expectedTimeSyncOffsetMaster);
    });
    it('should calculate round trip time as the difference between time sent and time set packet arrived', function (done) {
      let timeSetPacketArrived = ourBoard.time();
      let expectedRoundTripTime = 20; // ms
      ourBoard.curParsingMode = k.OBCIParsingNormal; // indicates the sent conf was found
      // Make a new object!
      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
      // Set the sent time
      ourBoard.sync.curSyncObj.timeSyncSent = timeSetPacketArrived - expectedRoundTripTime;

      ourBoard.once('synced', obj => {
        expect(obj.timeRoundTrip).to.equal(expectedRoundTripTime);
        done();
      });
      ourBoard._processPacketTimeSyncSet(timeSyncSetPacket, timeSetPacketArrived);
    });
    it('should calculate transmission time as the difference between round trip time and (sentConf - sent) when set arrived - sent conf is larger than threshold', function (done) {
      let timeSetPacketArrived = ourBoard.time();
      let expectedRoundTripTime = 20; // ms
      let expectedTimeTillSentConf = expectedRoundTripTime - k.OBCITimeSyncThresholdTransFailureMS - 1; // 9 ms
      // Setup
      ourBoard.curParsingMode = k.OBCIParsingNormal; // indicates the sent conf was found
      // Make a new object!
      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
      // Set the sent time
      ourBoard.sync.curSyncObj.timeSyncSent = timeSetPacketArrived - expectedRoundTripTime;
      ourBoard.sync.curSyncObj.timeSyncSentConfirmation = ourBoard.sync.curSyncObj.timeSyncSent + expectedTimeTillSentConf;

      ourBoard.once('synced', obj => {
        expect(obj.timeTransmission).to.equal(obj.timeRoundTrip - (obj.timeSyncSentConfirmation - obj.timeSyncSent));
        done();
      });
      ourBoard._processPacketTimeSyncSet(timeSyncSetPacket, timeSetPacketArrived);
    });
    it('should calculate transmission time as a percentage of round trip time when set arrived - sent conf is smaller than threshold', function (done) {
      let timeSetPacketArrived = ourBoard.time();
      let expectedRoundTripTime = 20; // ms
      let expectedTimeTillSentConf = expectedRoundTripTime - k.OBCITimeSyncThresholdTransFailureMS + 1; // 11 ms
      // Setup
      ourBoard.curParsingMode = k.OBCIParsingNormal; // indicates the sent conf was found
      // Make a new object!
      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
      // Set the sent time
      ourBoard.sync.curSyncObj.timeSyncSent = timeSetPacketArrived - expectedRoundTripTime;
      ourBoard.sync.curSyncObj.timeSyncSentConfirmation = ourBoard.sync.curSyncObj.timeSyncSent + expectedTimeTillSentConf;

      ourBoard.once('synced', obj => {
        expect(obj.timeTransmission).to.equal(obj.timeRoundTrip * k.OBCITimeSyncMultiplierWithSyncConf);
        done();
      });
      ourBoard._processPacketTimeSyncSet(timeSyncSetPacket, timeSetPacketArrived);
    });
    it('should calculate offset time as a time packet arrived - transmission time - board time', function (done) {
      let timeSetPacketArrived = ourBoard.time();
      let expectedRoundTripTime = 20; // ms
      let expectedTimeTillSentConf = expectedRoundTripTime - k.OBCITimeSyncThresholdTransFailureMS - 2; // 8 ms
      // Set the board time
      let boardTime = 5000;
      timeSyncSetPacket.writeInt32BE(boardTime, k.OBCIPacketPositionTimeSyncTimeStart);

      // Setup
      ourBoard.curParsingMode = k.OBCIParsingNormal; // indicates the sent conf was found
      // Make a new object!
      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
      // Set the sent time
      ourBoard.sync.curSyncObj.timeSyncSent = timeSetPacketArrived - expectedRoundTripTime;
      ourBoard.sync.curSyncObj.timeSyncSentConfirmation = ourBoard.sync.curSyncObj.timeSyncSent + expectedTimeTillSentConf;

      let expectedTransmissionTime = expectedRoundTripTime - (ourBoard.sync.curSyncObj.timeSyncSentConfirmation - ourBoard.sync.curSyncObj.timeSyncSent);

      let expectedTimeOffset = timeSetPacketArrived - expectedTransmissionTime - boardTime;

      ourBoard.once('synced', obj => {
        expect(obj.timeOffset, 'object timeOffset').to.equal(expectedTimeOffset);
        expect(ourBoard.sync.timeOffsetMaster, 'master time offset').to.equal(expectedTimeOffset);
        expect(ourBoard._rawDataPacketToSample).to.have.property('timeOffset', expectedTimeOffset);
        done();
      });
      ourBoard._processPacketTimeSyncSet(timeSyncSetPacket, timeSetPacketArrived);
    });
    it('should calculate offset time as an average of previous offset times', function (done) {
      let timeSetPacketArrived = ourBoard.time();
      let expectedRoundTripTime = 20; // ms
      let expectedTimeTillSentConf = expectedRoundTripTime - k.OBCITimeSyncThresholdTransFailureMS - 2; // 8 ms
      // Set the board time
      let boardTime = 5000;
      timeSyncSetPacket.writeInt32BE(boardTime, k.OBCIPacketPositionTimeSyncTimeStart);

      // Setup
      ourBoard.curParsingMode = k.OBCIParsingNormal; // indicates the sent conf was found
      // Make a new object!
      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
      // Set the sent time
      ourBoard.sync.curSyncObj.timeSyncSent = timeSetPacketArrived - expectedRoundTripTime;
      ourBoard.sync.curSyncObj.timeSyncSentConfirmation = ourBoard.sync.curSyncObj.timeSyncSent + expectedTimeTillSentConf;

      let expectedTransmissionTime = expectedRoundTripTime - (ourBoard.sync.curSyncObj.timeSyncSentConfirmation - ourBoard.sync.curSyncObj.timeSyncSent);

      let expectedTimeOffset = timeSetPacketArrived - expectedTransmissionTime - boardTime;

      let dif1 = 3;
      ourBoard.sync.timeOffsetArray.push(expectedTimeOffset + dif1);
      let dif2 = 1;
      ourBoard.sync.timeOffsetArray.push(expectedTimeOffset + dif2);

      ourBoard.once('synced', obj => {
        expect(obj.timeOffset, 'object timeOffset').to.equal(expectedTimeOffset);

        let expectedMasterTimeoffset = math.floor((obj.timeOffset + (obj.timeOffset + dif1) + (obj.timeOffset + dif2)) / 3);
        expect(ourBoard.sync.timeOffsetMaster, 'master time offset').to.equal(expectedMasterTimeoffset);
        done();
      });
      ourBoard._processPacketTimeSyncSet(timeSyncSetPacket, timeSetPacketArrived);
    });
  });

  describe('#time', function () {
    after(() => bluebirdChecks.noPendingPromises());
    it('should use sntp time when sntpTimeSync specified in options', function (done) {
      let board = new Cyton({
        verbose: true,
        sntpTimeSync: true
      });
      board.on('sntpTimeLock', function () {
        let funcSpySntpNow = sinon.spy(board, '_sntpNow');
        board.time();
        funcSpySntpNow.should.have.been.calledOnce();
        funcSpySntpNow.restore();
        board.sntpStop();
        done();
      });
    });
    it('should use Date.now() for time when sntpTimeSync is not specified in options', function () {
      let board = new Cyton({
        verbose: true
      });
      let funcSpySntpNow = sinon.spy(board, '_sntpNow');

      board.time();

      funcSpySntpNow.should.not.have.been.called();

      funcSpySntpNow.reset();

      funcSpySntpNow = null;
    });
    it('should emit sntpTimeLock event after sycned with ntp server', function (done) {
      let board = new Cyton({
        verbose: true,
        sntpTimeSync: true
      });

      board.once('sntpTimeLock', () => {
        board.sntpStop();
        done();
      });
    });
  });
  describe('#sntpStart', function () {
    after(() => bluebirdChecks.noPendingPromises());
    it('should be able to start ntp server', () => {
      let board = new Cyton();
      expect(board.sntp.isLive()).to.be.false();
      return Promise.all([
        board.sntpStart()
          .then(() => {
            expect(board.sntp.isLive()).to.be.true();
          }),
        new Promise(resolve => {
          board.once('sntpTimeLock', resolve);
        })
      ]).then(() => {
        board.sntpStop();
      });
    });
  });
  describe('#sntpStop', function () {
    this.timeout(5000);
    let board;
    before(done => {
      board = new Cyton({
        sntpTimeSync: true
      });
      board.once('sntpTimeLock', () => {
        done();
      });
    });
    after(() => {
      board.sntpStop();
    });
    after(() => bluebirdChecks.noPendingPromises());
    it('should be able to stop the ntp server and set the globals correctly', function () {
      // Verify the before condition is correct
      expect(board.options.sntpTimeSync).to.be.true();
      expect(board.sync.sntpActive).to.be.true();
      expect(board.sntp.isLive()).to.be.true();

      // Call the function under test
      board.sntpStop();

      // Ensure the globals were set off
      expect(board.options.sntpTimeSync).to.be.false();
      expect(board.sync.sntpActive).to.be.false();
      expect(board.sntp.isLive()).to.be.false();
    });
  });
  describe('#sntpGetOffset', function () {
    after(() => bluebirdChecks.noPendingPromises());
    it('should get the sntp offset', function (done) {
      let board = new Cyton({
        sntpTimeSync: true
      });
      board.once('sntpTimeLock', () => {
        board.sntpGetOffset().then(offset => {
          board.sntpStop();
          done();
        }, done);
      });
    });
  });
  describe('#_processParseBufferForReset', function () {
    let ourBoard;

    before(() => {
      ourBoard = new Cyton({
        verbose: true
      });
    });
    beforeEach(() => {
      ourBoard.info = {
        boardType: 'burrito',
        sampleRate: 60,
        firmware: 'taco',
        numberOfChannels: 200
      };
    });

    after(() => {
      ourBoard = null;
    });
    after(() => bluebirdChecks.noPendingPromises());

    it('should recognize firmware version 1 with no daisy', () => {
      let buf = new Buffer(`OpenBCI V3 Simulator
On Board ADS1299 Device ID: 0x12345
LIS3DH Device ID: 0x38422$$$`);

      ourBoard._processParseBufferForReset(buf);

      ourBoard.info.firmware.should.deep.equal({
        major: 1,
        minor: 0,
        patch: 0,
        raw: 'v1.0.0'
      });
      expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
      expect(ourBoard.sampleRate()).to.equal(k.OBCISampleRate250);
      expect(ourBoard.numberOfChannels()).to.equal(k.OBCINumberOfChannelsCyton);
    });
    it('should recognize firmware version 1 with daisy', () => {
      let buf = new Buffer(`OpenBCI V3 Simulator
On Board ADS1299 Device ID: 0x12345
On Daisy ADS1299 Device ID: 0xFFFFF
LIS3DH Device ID: 0x38422
$$$`);

      ourBoard._processParseBufferForReset(buf);

      ourBoard.info.firmware.should.deep.equal({
        major: 1,
        minor: 0,
        patch: 0,
        raw: 'v1.0.0'
      });
      expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardDaisy);
      expect(ourBoard.sampleRate()).to.equal(k.OBCISampleRate125);
      expect(ourBoard.numberOfChannels()).to.equal(k.OBCINumberOfChannelsDaisy);
    });
    it('should recognize firmware version 2 with no daisy', () => {
      let buf = new Buffer(`OpenBCI V3 Simulator
On Board ADS1299 Device ID: 0x12345
LIS3DH Device ID: 0x38422
Firmware: v2.1.3
$$$`);

      ourBoard._processParseBufferForReset(buf);

      ourBoard.info.firmware.should.deep.equal({
        major: 2,
        minor: 1,
        patch: 3,
        raw: 'v2.1.3'
      });
      expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
      expect(ourBoard.sampleRate()).to.equal(k.OBCISampleRate250);
      expect(ourBoard.numberOfChannels()).to.equal(k.OBCINumberOfChannelsCyton);
    });
    it('should recognize firmware version 3 with no daisy', () => {
      let buf = new Buffer(`OpenBCI V3 Simulator
On Board ADS1299 Device ID: 0x12345
LIS3DH Device ID: 0x38422
Firmware: v3.0.1
$$$`);

      ourBoard._processParseBufferForReset(buf);

      ourBoard.info.firmware.should.deep.equal({
        major: 3,
        minor: 0,
        patch: 1,
        raw: 'v3.0.1'
      });
      expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardCyton);
      expect(ourBoard.sampleRate()).to.equal(k.OBCISampleRate250);
      expect(ourBoard.numberOfChannels()).to.equal(k.OBCINumberOfChannelsCyton);
    });
    it('should recognize firmware version 2 with daisy', () => {
      let buf = new Buffer(`OpenBCI V3 Simulator
On Board ADS1299 Device ID: 0x12345
On Daisy ADS1299 Device ID: 0xFFFFF
LIS3DH Device ID: 0x38422
Firmware: v2.0.0
$$$`);

      ourBoard._processParseBufferForReset(buf);

      ourBoard.info.firmware.should.deep.equal({
        major: 2,
        minor: 0,
        patch: 0,
        raw: 'v2.0.0'
      });
      expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardDaisy);
      expect(ourBoard.sampleRate()).to.equal(k.OBCISampleRate125);
      expect(ourBoard.numberOfChannels()).to.equal(k.OBCINumberOfChannelsDaisy);
    });
    it('should recognize firmware version 3 with daisy', () => {
      let buf = new Buffer(`OpenBCI V3 Simulator
On Board ADS1299 Device ID: 0x12345
On Daisy ADS1299 Device ID: 0xFFFFF
LIS3DH Device ID: 0x38422
Firmware: v3.1.60
$$$`);

      ourBoard._processParseBufferForReset(buf);

      ourBoard.info.firmware.should.deep.equal({
        major: 3,
        minor: 1,
        patch: 60,
        raw: 'v3.1.60'
      });
      expect(ourBoard.getBoardType()).to.equal(k.OBCIBoardDaisy);
      expect(ourBoard.sampleRate()).to.equal(k.OBCISampleRate125);
      expect(ourBoard.numberOfChannels()).to.equal(k.OBCINumberOfChannelsDaisy);
    });
  });

  describe('#_processBytes', function () {
    before(() => {
      ourBoard = new Cyton({
        verbose: true
      });
    });
    beforeEach(() => {
      ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
    });
    afterEach(() => {
      ourBoard.buffer = null;
    });
    after(() => bluebirdChecks.noPendingPromises());

    describe('#OBCIParsingReset', function () {
      let _processParseBufferForResetSpy;
      before(() => {
        _processParseBufferForResetSpy = sinon.spy(ourBoard, '_processParseBufferForReset');
      });
      beforeEach(() => {
        _processParseBufferForResetSpy.reset();
      });
      it('should wait till EOT ($$$) before starting parse', function () {
        let buf1 = new Buffer(`OpenBCI V3 Simulator
On Board ADS1299 Device ID: 0x12345
`);
        let buf2 = new Buffer(`LIS3DH Device ID: `);
        let buf3 = new Buffer(`0x38422
$$$`);

        // Fake a soft reset send
        ourBoard.curParsingMode = k.OBCIParsingReset;

        // Send the first buffer
        ourBoard._processBytes(buf1);
        // Verify the parse function was not called
        _processParseBufferForResetSpy.should.not.have.been.called();
        // Verify the global buffer has the first buf in it
        expect(bufferEqual(ourBoard.buffer, buf1)).to.be.true();
        // Send another buffer without EOT
        ourBoard._processBytes(buf2);
        // Verify the parse function was not called
        _processParseBufferForResetSpy.should.not.have.been.called();
        // Verify the global buffer has the first and second buf in it
        expect(bufferEqual(ourBoard.buffer, Buffer.concat([buf1, buf2]))).to.be.true();
        // Send another buffer without EOT
        ourBoard._processBytes(buf3);
        // Verify the parse function was called
        _processParseBufferForResetSpy.should.have.been.calledOnce();
        // Verify the global buffer is empty
        expect(ourBoard.buffer).to.be.null();
      });
    });

    describe('#OBCIParsingTimeSyncSent', function () {
      // let spy
      before(() => {
        // spy = sinon.spy(ourBoard.openBCIUtilities,"isTimeSyncSetConfirmationInBuffer")
      });
      beforeEach(() => {
        ourBoard.curParsingMode = k.OBCIParsingTimeSyncSent;
        ourBoard.sync.curSyncObj = openBCIUtilities.newSyncObject();
      // spy.reset()
      });
      it('should call to find the time sync set character in the buffer', function () {
        // Verify the log event is called
        let buf = new Buffer(',');
        // Call the processBytes function
        ourBoard._processBytes(buf);
        // Verify the function was called
        expect(ourBoard.curParsingMode).to.equal(k.OBCIParsingNormal);

        let emitted = false;
        // Listen for the sample event
        ourBoard.once('sample', () => {
          emitted = true;
        });
        // Make a new buffer
        let buf1 = openBCIUtilities.samplePacketReal(1);
        // Send the buffer in
        ourBoard._processBytes(buf1);
        expect(ourBoard.buffer).to.be.null();
        expect(emitted).to.be.true();
      });
      it('should clear the buffer after a time sync set packet', function () {
        let emitted = false;
        // Verify the log event is called
        let buf = new Buffer(',');
        // Call the processBytes function
        ourBoard._processBytes(buf);
        // Verify the function was called
        expect(ourBoard.curParsingMode).to.equal(k.OBCIParsingNormal);

        // Listen for the sample event
        ourBoard.once('synced', () => {
          // Verify the buffer is cleared
          emitted = true;
        });
        // Make a new buffer
        let buf1 = openBCIUtilities.samplePacketAccelTimeSyncSet(1);
        // Send the buffer in
        ourBoard._processBytes(buf1);
        expect(ourBoard.buffer).to.be.null();
        expect(emitted).to.be.true();
      });
      it('should call to find the time sync set character in the buffer after packet', function () {
        let buf1 = Buffer.from(openBCIUtilities.samplePacket());
        let buf2 = new Buffer(',');

        // Call the processBytes function
        ourBoard._processBytes(Buffer.concat([buf1, buf2], buf1.length + 1));
        // Verify the function was called
        expect(ourBoard.curParsingMode).to.equal(k.OBCIParsingNormal);
      // Verify the buffer is empty
      // expect(ourBoard.buffer).to.be.null
      // ourBoard.buffer.length.should.equal(0)
      });
      it('should find time sync and emit two samples', function (done) {
        let buf1 = Buffer.from(openBCIUtilities.samplePacket(250));
        let buf2 = new Buffer([0x2C]);
        let buf3 = Buffer.from(openBCIUtilities.samplePacket(251));

        let inputBuf = Buffer.concat([buf1, buf2, buf3], buf1.byteLength + 1 + buf3.byteLength);

        let sampleCounter = 0;

        let newSample = sample => {
          // console.log(`sample ${JSON.stringify(sample)}`)
          if (sampleCounter === 0) {
            sample.sampleNumber.should.equal(250);
          } else if (sampleCounter === 1) {
            sample.sampleNumber.should.equal(251);
            // bufferEqual(buf1, buffer).should.be.true
            // ourBoard.buffer.length.should.equal(buf1.length)
            ourBoard.removeListener('sample', newSample);
            expect(ourBoard.curParsingMode).to.equal(k.OBCIParsingNormal);
            done();
          }
          sampleCounter++;
        };

        ourBoard.on('sample', newSample);

        // Call the processBytes function
        ourBoard._processBytes(inputBuf);
      });
      it('should not find the packet if in packet', () => {
        let buf1 = Buffer.from(openBCIUtilities.samplePacket(250));
        buf1[4] = 0x2C; // Inject a false packet
        let buf2 = Buffer.from(openBCIUtilities.samplePacket(251));

        // Call the processBytes function
        ourBoard._processBytes(Buffer.concat([buf1, buf2], buf1.length + buf2.length));
        // Verify the time sync set was NOT called
        expect(ourBoard.curParsingMode).to.equal(k.OBCIParsingTimeSyncSent);
      });
    });

    describe('#OBCIParsingNormal', function () {
      before(() => {
        ourBoard.curParsingMode = k.OBCIParsingNormal;
      });
      it('should emit a sample when inserted', function (done) {
        let expectedSampleNumber = 0;
        let buf1 = openBCIUtilities.samplePacketReal(expectedSampleNumber);

        // Declare the event emitter prior to calling function
        ourBoard.once('sample', sample => {
          sample.sampleNumber.should.equal(expectedSampleNumber);
        });

        // Now call the function which should call the "sample" event
        ourBoard._processBytes(buf1);
        expect(ourBoard.buffer).to.be.null();
        done();
      });
      it('should get three packets even if one was sent in the last data emit', function () {
        let expectedSampleNumber = 0;
        let buf1 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber));
        let buf2 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber + 1));
        let buf3 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber + 2));
        // Pretend that half of buf1 got sent in the first serial flush
        //  and that the last half of it will arrive a lil later
        let splitPoint = 15;
        if (k.getVersionNumber(process.version) >= 6) {
          // from introduced in node version 6.x.x
          ourBoard.buffer = Buffer.from(buf1.slice(0, splitPoint));
        } else {
          ourBoard.buffer = new Buffer(buf1.slice(0, splitPoint));
        }
        let dataBuf = Buffer.concat([buf1.slice(splitPoint), buf2, buf3]);

        let sampleCounter = 0;
        let newSample = sample => {
          if (sampleCounter === expectedSampleNumber) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber);
          } else if (sampleCounter === expectedSampleNumber + 1) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber + 1);
          } else if (sampleCounter === expectedSampleNumber + 2) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber + 2);
            ourBoard.removeListener('sample', newSample);
          }
          sampleCounter++;
        };
        ourBoard.on('sample', newSample);
        // Now call the function which should call the "sample" event
        ourBoard._processBytes(dataBuf);
        expect(ourBoard.buffer).to.be.null();
      });
      it('should keep extra data in the buffer', function () {
        let expectedSampleNumber = 0;
        let buf1 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber));
        let buf2 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber + 1));
        let buf3 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber + 2));
        // Pretend that half of buf1 got sent in the first serial flush
        //  and that the last half of it will arrive a lil later
        let splitPoint = 15;

        ourBoard['buffer'] = null;
        let bufFirstHalf, bufLastHalf;
        if (k.getVersionNumber(process.version) >= 6) {
          // from introduced in node version 6.x.x
          bufFirstHalf = Buffer.from(buf3.slice(0, splitPoint));
          bufLastHalf = Buffer.from(buf3.slice(splitPoint));
        } else {
          bufFirstHalf = new Buffer(buf3.slice(0, splitPoint));
          bufLastHalf = new Buffer(buf3.slice(splitPoint));
        }

        let sampleCounter = 0;
        let newSample = sample => {
          if (sampleCounter === expectedSampleNumber) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber);
          } else if (sampleCounter === expectedSampleNumber + 1) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber + 1);
          } else if (sampleCounter === expectedSampleNumber + 2) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber + 2);
            ourBoard.removeListener('sample', newSample);
          }
          sampleCounter++;
        };
        ourBoard.on('sample', newSample);
        // Now call the function which should call the "sample" event
        ourBoard._processBytes(Buffer.concat([buf1, buf2, bufFirstHalf]));
        // Now verify there is data still in the global buffer by calling _processBytes on the last half
        ourBoard._processBytes(bufLastHalf);
        expect(ourBoard.buffer).to.be.null();
      });
      it('should throw out old data if it is incomplete and add to badPackets count', function () {
        // Some how this packet go messed up and lodged in... This is the worst case, that the buffer has
        //  an incomplete packet.
        ourBoard.buffer = new Buffer([0xA0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xC0]);

        // New buffer incoming
        let expectedSampleNumber = 1;
        let buf1 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber));
        let buf2 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber + 1));
        let buf3 = Buffer.from(openBCIUtilities.samplePacketReal(expectedSampleNumber + 2));

        // New data incoming!
        let dataBuf = Buffer.concat([buf1, buf2, buf3]);

        let sampleCounter = expectedSampleNumber;
        let newSample = sample => {
          if (sampleCounter === expectedSampleNumber) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber);
          } else if (sampleCounter === expectedSampleNumber + 1) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber + 1);
          } else if (sampleCounter === expectedSampleNumber + 2) {
            expect(sample.sampleNumber).to.equal(expectedSampleNumber + 2);
            ourBoard.removeListener('sample', newSample);
          }
          sampleCounter++;
        };
        ourBoard.on('sample', newSample);
        // Now call the function which should call the "sample" event
        ourBoard._processBytes(dataBuf);
        // Verify that the old data was rejected
        expect(ourBoard.buffer).to.be.null();
      });
    });

    describe('#OBCIParsingEOT', function () {
      beforeEach(() => {
        ourBoard.curParsingMode = k.OBCIParsingEOT;
      });
      it("should emit the 'eot' event", function (done) {
        let buf = new Buffer('Tacos are amazing af$$$');

        let eotEvent = data => {
          expect(bufferEqual(data, buf)).to.be.true();
          ourBoard.curParsingMode.should.be.equal(k.OBCIParsingNormal);
          done();
        };

        ourBoard.once('eot', eotEvent);

        ourBoard._processBytes(buf);
      });
      it("should emit the 'eot' event even if stuff comes in two serial flushes", function (done) {
        let buf1 = new Buffer('Tacos are ');
        let buf2 = new Buffer('amazing af$$$');

        let eotEvent = data => {
          bufferEqual(data, Buffer.concat([buf1, buf2], buf1.length + buf2.length)).should.be.true();
          ourBoard.curParsingMode.should.be.equal(k.OBCIParsingNormal);
          done();
        };

        ourBoard.once('eot', eotEvent);

        ourBoard._processBytes(buf1);
        ourBoard._processBytes(buf2);
      });
    });
  });

  describe('#_finalizeNewSampleForDaisy', function () {
    let ourBoard, randomSampleGenerator, sampleEvent, failTimeout;
    before(() => {
      ourBoard = new Cyton({
        verbose: true
      });
      randomSampleGenerator = openBCIUtilities.randomSample(k.OBCINumberOfChannelsCyton, k.OBCISampleRate250, false, 'none');
    });
    beforeEach(() => {
      // Clear the global let
      ourBoard._lowerChannelsSampleObject = null;
      ourBoard.info.missedPackets = 0;
    });
    afterEach(() => {
      if (sampleEvent) {
        ourBoard.removeListener('sample', sampleEvent);
        sampleEvent = null;
      }
      if (failTimeout) {
        clearTimeout(failTimeout);
        failTimeout = null;
      }
    });
    after(() => bluebirdChecks.noPendingPromises());
    it('should store the sample to a global letiable for next time', () => {
      let oddSample = randomSampleGenerator(0); // Previous was 0, so the next one will be 1 (odd)

      // Call the function under test
      ourBoard._finalizeNewSampleForDaisy(oddSample);

      // Check to make sure the letiable is stored
      expect(ourBoard._lowerChannelsSampleObject).to.equal(oddSample);
    });
    it('should emit a sample on even sample if odd was before', function (done) {
      let oddSample = randomSampleGenerator(0); // Previous was 0, so the next one will be 1 (odd)
      let evenSample = randomSampleGenerator(1); // Previous was 1, so the next one will be 2 (even)

      // The function to be called when sample event is fired
      let sampleEvent = (sample) => {
        // test pass here
        done();
      };

      // Subscribe to the sample event
      ourBoard.once('sample', sampleEvent);

      // Call the function under test twice
      ourBoard._finalizeNewSampleForDaisy(oddSample);
      ourBoard._finalizeNewSampleForDaisy(evenSample);

      // Set a timeout to end the function, after giving enough time for the sample to be emitted if were going to
      //  be
      failTimeout = setTimeout(() => {
        // Fail condition
        done("didn't emit a sample");
      }, 5); // 5ms should be plenty of time
    });
    it('should not emit a sample if there is no lower sample object and this is an even sample number', function (done) {
      let evenSample = randomSampleGenerator(1); // Previous was 1, so the next one will be 2 (even)

      // The function to be called when sample event is fired
      sampleEvent = (sample) => {
        // test fail condition
        done('emitted a sample');
      };

      console.log('_lowerChannelsSampleObject', ourBoard._lowerChannelsSampleObject);

      // Subscribe to the sample event
      ourBoard.once('sample', sampleEvent);

      // Call the function under test
      ourBoard._finalizeNewSampleForDaisy(evenSample);

      // Set a timeout to end the function, after giving enough time for the sample to be emitted if were going to
      //  be
      failTimeout = setTimeout(() => {
        // This is the condition where an odd was skipped so need to keep track of this as a missed packet
        expect(ourBoard.info.missedPackets).to.equal(1);
        done(); // Test pass here
      }, 5); // 5ms should be plenty of time
    });
    it('should not emit a sample if back to back odd samples', function (done) {
      let oddSample1 = randomSampleGenerator(0); // Previous was 0, so the next one will be 1 (odd)
      let oddSample2 = randomSampleGenerator(2); // Previous was 0, so the next one will be 1 (odd)

      // The function to be called when sample event is fired
      sampleEvent = (sample) => {
        // test fail condition
        done('emitted a sample');
      };

      // Subscribe to the sample event
      ourBoard.once('sample', sampleEvent);

      // Call the function under test twice
      ourBoard._finalizeNewSampleForDaisy(oddSample1);
      ourBoard._finalizeNewSampleForDaisy(oddSample2);

      // Set a timeout to end the function, after giving enough time for the sample to be emitted if were going to
      //  be
      failTimeout = setTimeout(() => {
        // This is the condition where an even was skipped so need to keep track of this as a missed packet
        expect(ourBoard.info.missedPackets).to.equal(1);
        ourBoard.removeListener('sample', sampleEvent);
        done(); // Test pass here
      }, 5); // 5ms should be plenty of time
    });
  });

  describe('#usingVersionTwoFirmware', function () {
    after(() => bluebirdChecks.noPendingPromises());
    it('should return true if firmware is version 2', () => {
      ourBoard = new Cyton();
      ourBoard.info.firmware.major = 2;

      expect(ourBoard.usingVersionTwoFirmware()).to.be.true();
    });
    it('should return false if not firmware version 2', () => {
      ourBoard = new Cyton();

      expect(ourBoard.usingVersionTwoFirmware()).to.be.false();
    });
  });

  describe('#usingVersionThreeFirmware', function () {
    after(() => bluebirdChecks.noPendingPromises());
    it('should return true if firmware is version 3', () => {
      ourBoard = new Cyton();
      ourBoard.info.firmware.major = 3;

      expect(ourBoard.usingVersionThreeFirmware()).to.be.true();
    });
    it('should return false if not firmware version 3', () => {
      ourBoard = new Cyton();

      expect(ourBoard.usingVersionThreeFirmware()).to.be.false();
    });
  });

  describe('#usingAtLeastVersionTwoFirmware', function () {
    after(() => bluebirdChecks.noPendingPromises());
    it('should return true if firmware is version 3', () => {
      ourBoard = new Cyton();
      ourBoard.info.firmware.major = 2;

      expect(ourBoard.usingAtLeastVersionTwoFirmware()).to.be.true();
    });
    it('should return true if firmware is version 3', () => {
      ourBoard = new Cyton();
      ourBoard.info.firmware.major = 3;

      expect(ourBoard.usingAtLeastVersionTwoFirmware()).to.be.true();
    });
    it('should return false if not firmware version 3', () => {
      ourBoard = new Cyton();

      expect(ourBoard.usingAtLeastVersionTwoFirmware()).to.be.false();
    });
  });

  xdescribe('#hardwareValidation', function () {
    this.timeout(20000); // long timeout for pleanty of stream time :)
    let runHardwareValidation = true;
    let wstream;
    let board;
    before(function (done) {
      if (masterPortName === k.OBCISimulatorPortName) {
        runHardwareValidation = false;
      }
      if (runHardwareValidation) {
        board = new Cyton({
          verbose: true,
          simulatorFragmentation: k.OBCISimulatorFragmentationRandom
        });
        // Use the line below to output the
        wstream = fs.createWriteStream('hardwareVoltageOutputAll.txt');

        board.connect(masterPortName)
          .catch(err => done(err));

        board.once('ready', () => {
          done();
        });
      } else {
        done();
      }
    });
    after(function () {
      if (runHardwareValidation) {
        board.disconnect();
      }
    });
    after(() => bluebirdChecks.noPendingPromises());
    it('test all output signals', function (done) {
      if (runHardwareValidation) {
        board.streamStart()
          .then(() => {
            console.log('Started stream');
            console.log('--------');
          })
          .catch(err => done(err));

        setTimeout(() => {
          console.log('*-------');
          board.testSignal('pulse1xSlow');
        }, 3000);
        setTimeout(() => {
          console.log('**------');
          board.testSignal('pulse2xSlow');
        }, 5000);
        setTimeout(() => {
          console.log('***-----');
          board.testSignal('pulse1xFast');
        }, 7000);
        setTimeout(() => {
          console.log('****----');
          board.testSignal('pulse2xFast');
        }, 9000);
        setTimeout(() => {
          console.log('*****---');
          board.testSignal('none');
        }, 11000);
        setTimeout(() => {
          console.log('******--');
          board.testSignal('pulse1xSlow');
        }, 13000);
        setTimeout(() => {
          console.log('*******-');
          board.testSignal('none');
        }, 15000);

        board.on('sample', sample => {
          openBCIUtilities.samplePrintLine(sample)
            .then(line => {
              wstream.write(line);
            });
        });
        // This stops the test
        setTimeout(() => {
          console.log('********');
          done();
        }, 19000);
      } else {
        done();
      }
    });
  });
});

describe('#daisy', function () {
  let ourBoard;
  this.timeout(4000);
  before(function (done) {
    ourBoard = new Cyton({
      verbose: true,
      simulatorFirmwareVersion: 'v2',
      simulatorDaisyModuleAttached: true,
      simulatorFragmentation: k.OBCISimulatorFragmentationRandom
    });

    let useSim = () => {
      ourBoard.simulatorEnable()
        .then(() => {
          console.log(`has daisy module: ${ourBoard.options.simulatorDaisyModuleAttached}`);
          return ourBoard.connect(k.OBCISimulatorPortName);
        })
        .catch(err => console.log(err));
    };
    ourBoard.autoFindOpenBCIBoard()
      .then(portName => {
        return setTimeout(() => {
          console.log('Issuing connect');
          ourBoard.connect(portName);
        }, 500);
      })
      .catch(() => {
        useSim();
      })
      .then(() => {
        // console.log('connected')
      })
      .catch(err => {
        console.log('Error: ' + err);
      });

    ourBoard.once('ready', () => {
      done();
    });
  });
  after(function (done) {
    if (ourBoard.isConnected()) {
      ourBoard.disconnect().then(() => {
        done();
      }).catch(() => done);
    } else {
      done();
    }
  });
  after(() => bluebirdChecks.noPendingPromises());
  it('can get samples with channel array of length 16 if daisy', function (done) {
    let numberOfSamples = 130;
    let sampleCount = 0;

    if (ourBoard.info.boardType !== k.OBCIBoardDaisy) {
      return done();
    }
    let samp = sample => {
      expect(sample.channelData.length).to.equal(k.OBCINumberOfChannelsDaisy);
      if (sampleCount <= numberOfSamples) {
        sampleCount++;
      } else {
        ourBoard.disconnect()
          .then(() => {
            done();
          });
        ourBoard.removeListener('sample', samp);
      }
    };
    ourBoard.on('sample', samp);
    ourBoard.streamStart()
      .catch(err => {
        done(err);
      });
  // Attached the emitted
  });
});

describe('#syncWhileStreaming', function () {
  let ourBoard;
  this.timeout(4000);
  before(function (done) {
    ourBoard = new Cyton({
      verbose: true,
      simulatorFirmwareVersion: 'v2',
      simulatorFragmentation: k.OBCISimulatorFragmentationRandom
    });
    let useSim = () => {
      ourBoard.simulatorEnable()
        .then(() => {
          console.log(`sim firmware version: ${ourBoard.options.simulatorFirmwareVersion}`);
          return ourBoard.connect(k.OBCISimulatorPortName);
        })
        .catch(err => console.log(err));
    };
    ourBoard.autoFindOpenBCIBoard()
      .then(portName => {
        return setTimeout(() => {
          console.log('Issuing connect');
          ourBoard.connect(portName);
        }, 500);
      })
      .catch(() => {
        useSim();
      })
      .then(() => {
        // console.log('connected')
      })
      .catch(err => {
        console.log('Error: ' + err);
      });

    ourBoard.once('ready', () => {
      ourBoard.streamStart()
        .then(() => {
          done();
        })
        .catch(err => {
          done(err);
        });
    });
  });
  after(function (done) {
    if (ourBoard.isConnected()) {
      ourBoard.disconnect().then(() => {
        done();
      }).catch(() => done);
    } else {
      done();
    }
  });
  after(() => bluebirdChecks.noPendingPromises());
  afterEach(() => {
    this.buffer = null;
  });
  describe('#syncClocks', function () {
    this.timeout(4000);
    it('can sync while streaming', done => {
      let syncAfterSamples = 50;
      let notSynced = true;
      let syncFunc = obj => {
        ourBoard.removeListener('sample', samp);
        done();
      };
      let samp = sample => {
        if (sample.sampleNumber >= syncAfterSamples && notSynced) {
          notSynced = false;
          // Call the first one
          ourBoard.syncClocks()
            .catch(() => {
              ourBoard.removeListener('sample', samp);
              ourBoard.removeListener('synced', syncFunc);
              done();
            });
        }
      };
      ourBoard.on('sample', samp);
      ourBoard.once('synced', syncFunc);
    });
  });
  describe('#syncClocksFull', function () {
    this.timeout(4000);
    it('can run a full clock sync', done => {
      let notSynced = true;
      let sampleFun = sample => {
        if (notSynced) {
          notSynced = false;
          // Call the first one
          ourBoard.syncClocksFull()
            .then(syncObj => {
              if (syncObj.valid) {
                ourBoard.removeListener('sample', sampleFun);
                done();
              } else {
                ourBoard.removeListener('sample', sampleFun);
                done('Not able to sync');
              }
            }).catch(() => {
              ourBoard.removeListener('sample', sampleFun);
              done();
            });
        }
      };
      ourBoard.on('sample', sampleFun);
    });
  });
});

describe('#syncErrors', function () {
  let ourBoard;
  this.timeout(4000);
  before(function (done) {
    ourBoard = new Cyton({
      verbose: true,
      simulatorFirmwareVersion: 'v2'
    });
    let useSim = () => {
      ourBoard.simulatorEnable()
        .then(() => {
          return ourBoard.connect(k.OBCISimulatorPortName);
        })
        .catch(err => console.log(err));
    };
    ourBoard.autoFindOpenBCIBoard()
      .then(portName => {
        return setTimeout(() => {
          console.log('Issuing connect');
          ourBoard.connect(portName);
        }, 500);
      })
      .catch(() => {
        useSim();
      })
      .then(() => {
        // console.log('connected');
      })
      .catch(err => {
        console.log('Error: ' + err);
      });

    ourBoard.once('ready', () => {
      done();
    });
  });
  after(function (done) {
    if (ourBoard.isConnected()) {
      ourBoard.disconnect().then(() => {
        done();
      }).catch(() => done);
    } else {
      done();
    }
  });
  after(() => bluebirdChecks.noPendingPromises());
  afterEach(() => {
    this.buffer = null;
  });
  describe('#syncClocksFull', function () {
    it('should reject syncClocksFull request because of timeout', done => {
      let notSynced = true;
      let sampleFun = sample => {
        if (notSynced) {
          notSynced = false;
          // Call the first one
          ourBoard.syncClocksFull()
            .then(syncObj => {
              done('Should not be able to sync');
            }).catch(() => {
              ourBoard.removeListener('sample', sampleFun);
              done();
            });
          ourBoard.streamStop();
        }
      };
      ourBoard.streamStart()
        .catch((err) => {
          ourBoard.removeListener('sample', sampleFun);
          done(`could not start time sync with err: ${err}`);
        });
      ourBoard.on('sample', sampleFun);
    });
  });
});
