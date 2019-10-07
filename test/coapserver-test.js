const assert = require('assert');
const coap = require('coap');

const singleThingServer = require('./lib/single-thing-server');
const multipleThingsServer = require('./lib/multiple-things-server');

const {
  singleThingDescription,
  singleThingCore,
  multipleThingsDescription,
  multipleThingsCore,
} = require('./resources/coapserver-test-assert-values');

describe('singleThingServer', () => {
  before(() => {
    singleThingServer.start();
  });

  after(() => {
    singleThingServer.stop(true);
  });

  describe('GET /', () => {
    it('should return code 205', (done) => {
      const req = coap.request('coap://localhost/');
      req.on('response', (res) => {
        assert.equal('2.05', res.code);
        done();
      });
      req.end();
    });

    it('should contain defined payload', (done) => {
      const req = coap.request('coap://localhost/');
      req.on('response', (res) => {
        assert.equal(singleThingDescription, res.payload.toString());
        done();
      });
      req.end();
    });
  });

  describe('GET /.well-known/core', () => {
    it('should return code 205', (done) => {
      const req = coap.request('coap://localhost/.well-known/core');
      req.on('response', (res) => {
        assert.equal('2.05', res.code);
        done();
      });
      req.end();
    });

    it('should contain defined payload', (done) => {
      const req = coap.request('coap://localhost/.well-known/core');
      req.on('response', (res) => {
        assert.equal(singleThingCore, res.payload.toString());
        done();
      });
      req.end();
    });
  });
});

describe('multipleThingsServer', () => {
  before(() => {
    multipleThingsServer.start();
  });

  after(() => {
    multipleThingsServer.stop(true);
  });

  describe('GET /', () => {
    it('should return code 205', (done) => {
      const req = coap.request('coap://localhost/');
      req.on('response', (res) => {
        assert.equal('2.05', res.code);
        done();
      });
      req.end();
    });

    it('should contain defined payload', (done) => {
      const req = coap.request('coap://localhost/');
      req.on('response', (res) => {
        assert.equal(multipleThingsDescription, res.payload.toString());
        done();
      });
      req.end();
    });
  });

  describe('GET /.well-known/core', () => {
    it('should return code 205', (done) => {
      const req = coap.request('coap://localhost/.well-known/core');
      req.on('response', (res) => {
        assert.equal('2.05', res.code);
        done();
      });
      req.end();
    });

    it('should contain defined payload', (done) => {
      const req = coap.request('coap://localhost/.well-known/core');
      req.on('response', (res) => {
        assert.equal(multipleThingsCore, res.payload.toString());
        done();
      });
      req.end();
    });
  });
});


