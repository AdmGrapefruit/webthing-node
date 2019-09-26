/**
 * Node Web Thing server implementation using CoAP.
 */

'use strict';

const coap = require('coap');
const coapRouter = require('coap-router');
const dnssd = require('dnssd');
const os = require('os');
const utils = require('./utils');
const helpers = require('./helpers');

/**
 * Base handler that is initialized with a list of things.
 */
class CoapBaseHandler {
  /**
     * Initialize the handler.
     *
     * @param {Object} things List of Things managed by the server
     */
  constructor(things) {
    this.things = things;
  }

  /**
     * Get the thing this request is for.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @returns {Object} The thing, or null if not found.
     */
  getThing(req) {
    return this.things.getThing(req.params.thingId);
  }
}

/**
 * Handle a request to / when the server manages multiple things.
 */
class CoapThingsHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const descriptions = (
      this.things.getThings().map((thing) => {
        return helpers.getDescription(req, thing);
      })
    );
    res.json(descriptions);
  }
}

/**
 * Handle a request to /.
 */
class CoapThingHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const description = helpers.getDescription(req, thing);
    res.json(description);
  }
}

/**
 * Handle a request to /.well-known/core when the server handles MultipleThings.
 */
class CoapCoresHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const descriptions = this.things.getThings().map((thing) => {
      return helpers.getDescription(req, thing);
    });

    const cores = [];
    for (const d of descriptions) {
      cores.push(helpers.getCoreLinkFormat(d));
    }

    cores.push('</>');
    cores.push('</.well-known/core>');

    res.setOption('Content-Format', 'application/link-format');
    res.end(cores.join(','));
  }
}

/**
 * Handle a request to /.well-known/core.
 */
class CoapCoreHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const core = `${helpers.getCoreLinkFormat(
      helpers.getDescription(req, thing)
    )},</>,</.well-known/core>`;

    res.setOption('Content-Format', 'application/link-format');
    res.end(core);
  }
}

/**
 * Handle a request to /properties.
 */
class CoapPropertiesHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    res.json(thing.getProperties());
  }
}

/**
 * Handle a request to /properties/<property>.
 */
class CoapPropertyHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const propertyName = req.params.propertyName;
    if (thing.hasProperty(propertyName)) {
      res.json({[propertyName]: thing.getProperty(propertyName)});
    } else {
      res.statusCode = 404;
      res.end();
    }
  }

  /**
     * Handle a PUT request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  put(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const propertyName = req.params.propertyName;
    const body = helpers.getBody(req);
    if (!body.hasOwnProperty(propertyName)) {
      res.statusCode = 400;
      res.end();
      return;
    }

    if (thing.hasProperty(propertyName)) {
      try {
        thing.setProperty(propertyName, body[propertyName]);
      } catch (e) {
        res.statusCode = 400;
        res.end();
        return;
      }
      res.json({[propertyName]: thing.getProperty(propertyName)});
    } else {
      res.statusCode = 404;
      res.end();
    }
  }
}

/**
 * Handle a request to /actions.
 */
class CoapActionsHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    res.json(thing.getActionDescriptions());
  }

  /**
     * Handle a POST request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  post(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    let response = {};
    const body = helpers.getBody(req);
    for (const actionName in body) {
      let input = null;
      if (body[actionName].hasOwnProperty('input')) {
        input = body[actionName].input;
      }

      const action = thing.performAction(actionName, input);
      if (action) {
        response = Object.assign(response, action.asActionDescription());
        action.start();
      }
    }

    res.statusCode = 201;
    res.json(response);
  }
}

/**
 * Handle a request to /actions/<action_name>.
 */
class CoapActionHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const actionName = req.params.actionName;

    res.json(thing.getActionDescriptions(actionName));
  }

  /**
     * Handle a POST request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  post(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const actionName = req.params.actionName;
    const body = helpers.getBody(req);

    let response = {};
    for (const name in body) {
      if (name !== actionName) {
        continue;
      }

      let input = null;
      if (body[name].hasOwnProperty('input')) {
        input = body[name].input;
      }

      const action = thing.performAction(name, input);
      if (action) {
        response = Object.assign(response, action.asActionDescription());
        action.start();
      }
    }

    res.statusCode = 201;
    res.json(response);
  }
}

/**
 * Handle a request to /actions/<action_name>/<action_id>.
 */
class CoapActionIDHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const actionName = req.params.actionName;
    const actionId = req.params.actionId;

    const action = thing.getAction(actionName, actionId);
    if (action === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    res.json(action.asActionDescription());
  }

  /**
     * Handle a PUT request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  put(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    // TODO: this is not yet defined in the spec
    res.statusCode = 200;
    res.end();
  }

  /**
     * Handle a DELETE request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  delete(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const actionName = req.params.actionName;
    const actionId = req.params.actionId;

    if (thing.removeAction(actionName, actionId)) {
      res.statusCode = 204;
      res.end();
    } else {
      res.statusCode = 404;
      res.end();
    }
  }
}

/**
 * Handle a request to /events.
 */
class CoapEventsHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    res.json(thing.getEventDescriptions());
  }
}

/**
 * Handle a request to /events/<event_name>.
 */
class CoapEventHandler extends CoapBaseHandler {
  /**
     * Handle a GET request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @param {Object} res The response object of type OutgoingMessage
     */
  get(req, res) {
    const thing = this.getThing(req);
    if (thing === null) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const eventName = req.params.eventName;

    res.json(thing.getEventDescriptions(eventName));
  }
}

/**
 * Server to represent a Web Thing over CoAP.
 */
class CoapWebThingServer {
  /**
     * Initialize the CoapWebThingServer.
     *
     *
     * @param {Object} things Things managed by this server -- should be of type
     *                        SingleThing or MultipleThings
     * @param {Number} port Port to listen on (defaults to 5683)
     * @param {String} hostname Optional host name, i.e. mything.com
     * @param {Object[]} additionalRoutes List of additional routes to add to
     *                                    server, i.e. [{path: '..', handler: ..}]
     * @param {String} basePath Base URL path to use, rather than '/'
     */
  constructor(
    things,
    port = null,
    hostname = null,
    additionalRoutes = null,
    basePath = '/'
  ) {
    this.things = things;
    this.name = things.getName();
    this.port = Number(port);
    this.hostname = hostname;
    this.basePath = basePath.replace(/\/$/, '');

    const systemHostname = os.hostname().toLowerCase();
    this.hosts = [
      'localhost',
      `localhost:${port}`,
      `${systemHostname}.local`,
      `${systemHostname}.local:${port}`,
    ];

    utils.getAddresses().forEach((address) => {
      this.hosts.push(address, `${address}:${port}`);
    });

    if (hostname) {
      hostname = hostname.toLowerCase();
      this.hosts.push(hostname, `${hostname}:${port}`);
    }

    if (this.things.constructor.name === 'MultipleThings') {
      const list = things.getThings();
      for (let i = 0; i < list.length; i++) {
        const thing = list[i];
        thing.setHrefPrefix(`${this.basePath}/${i}`);
      }
    } else {
      things.getThing().setHrefPrefix(this.basePath);
    }

    this.app = coapRouter();

    const thingsHandler = new CoapThingsHandler(this.things);
    const thingHandler = new CoapThingHandler(this.things);
    const coresHandler = new CoapCoresHandler(this.things);
    const coreHandler = new CoapCoreHandler(this.things);
    const propertiesHandler = new CoapPropertiesHandler(this.things);
    const propertyHandler = new CoapPropertyHandler(this.things);
    const actionsHandler = new CoapActionsHandler(this.things);
    const actionHandler = new CoapActionHandler(this.things);
    const actionIdHandler = new CoapActionIDHandler(this.things);
    const eventsHandler = new CoapEventsHandler(this.things);
    const eventHandler = new CoapEventHandler(this.things);

    if (Array.isArray(additionalRoutes)) {
      for (const route of additionalRoutes) {
        this.app.use(route.path, route.handler);
      }
    }
    if (this.things.constructor.name === 'MultipleThings') {
      this.app.get('/', (req, res) => thingsHandler.get(req, res));
      this.app.get('/.well-known/core', (req, res) => coresHandler.get(req, res));
      this.app.get('/:thingId', (req, res) => thingHandler.get(req, res));

      this.app.get('/:thingId/properties',
                   (req, res) => propertiesHandler.get(req, res));
      this.app.get('/:thingId/properties/:propertyName',
                   (req, res) => propertyHandler.get(req, res));
      this.app.put('/:thingId/properties/:propertyName',
                   (req, res) => propertyHandler.put(req, res));
      this.app.get('/:thingId/actions',
                   (req, res) => actionsHandler.get(req, res));
      this.app.post('/:thingId/actions',
                    (req, res) => actionsHandler.post(req, res));
      this.app.get('/:thingId/actions/:actionName',
                   (req, res) => actionHandler.get(req, res));
      this.app.post('/:thingId/actions/:actionName',
                    (req, res) => actionHandler.post(req, res));
      this.app.get('/:thingId/actions/:actionName/:actionId',
                   (req, res) => actionIdHandler.get(req, res));
      this.app.put('/:thingId/actions/:actionName/:actionId',
                   (req, res) => actionIdHandler.put(req, res));
      this.app.delete('/:thingId/actions/:actionName/:actionId',
                      (req, res) => actionIdHandler.delete(req, res));
      this.app.get('/:thingId/events',
                   (req, res) => eventsHandler.get(req, res));
      this.app.get('/:thingId/events/:eventName',
                   (req, res) => eventHandler.get(req, res));
    } else {
      this.app.get('/', (req, res) => thingHandler.get(req, res));
      this.app.get('/.well-known/core', (req, res) => coreHandler.get(req, res));

      this.app.get('/properties',
                   (req, res) => propertiesHandler.get(req, res));
      this.app.get('/properties/:propertyName',
                   (req, res) => propertyHandler.get(req, res));
      this.app.put('/properties/:propertyName',
                   (req, res) => propertyHandler.put(req, res));
      this.app.get('/actions',
                   (req, res) => actionsHandler.get(req, res));
      this.app.post('/actions',
                    (req, res) => actionsHandler.post(req, res));
      this.app.get('/actions/:actionName',
                   (req, res) => actionHandler.get(req, res));
      this.app.post('/actions/:actionName',
                    (req, res) => actionHandler.post(req, res));
      this.app.get('/actions/:actionName/:actionId',
                   (req, res) => actionIdHandler.get(req, res));
      this.app.put('/actions/:actionName/:actionId',
                   (req, res) => actionIdHandler.put(req, res));
      this.app.delete('/actions/:actionName/:actionId',
                      (req, res) => actionIdHandler.delete(req, res));
      this.app.get('/events',
                   (req, res) => eventsHandler.get(req, res));
      this.app.get('/events/:eventName',
                   (req, res) => eventHandler.get(req, res));
    }

    this.server = coap.createServer(this.app);
  }

  /**
     * Start listening for incoming connections.
     *
     * @returns {Promise} Promise which resolves once the server is started.
     */
  start() {
    this.mdns = new dnssd.Advertisement(
      new dnssd.ServiceType('_webthing._udp'),
      this.port,
      {
        name: this.name,
        txt: {
          path: '/',
        },
      });
    this.mdns.on('error', (e) => {
      console.debug(`mDNS error: ${e}`);
      setTimeout(() => {
        this.mdns.start();
      }, 10000);
    });
    this.mdns.start();

    return new Promise((resolve) => {
      this.server.listen({port: this.port}, resolve);
    });
  }

  /**
     * Stop listening.
     *
     * @param {boolean?} force - Whether or not to force shutdown immediately.
     * @returns {Promise} Promise which resolves once the server is stopped.
     */
  stop(force = false) {
    const promises = [];

    if (this.mdns) {
      promises.push(new Promise((resolve, reject) => {
        this.mdns.stop(force, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }));
    }

    promises.push(new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    }));

    return Promise.all(promises);
  }
}

module.exports = CoapWebThingServer;
