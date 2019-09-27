/**
 * Helper functions
 */

'use strict';

const resourceGroupKeys = ['href', 'links', 'properties', 'actions', 'events'];
const protocol = 'coap';

const helpers = {
  /**
     * Create description for thing.
     *
     * @param {Object} thing The thing
     * @returns {Object} Description for thing.
     */
  getDescription(req, thing) {
    const description = thing.asThingDescription();
    if (thing.getHref() !== '/') {
      description.href = thing.getHref();
    }
    // Uri-Host option must be set by sender to get correct base
    description.base = `${protocol}://${req.host}${thing.getHref()}`;
    description.securityDefinitions = {
      nosec_sc: {
        scheme: 'nosec',
      },
    };
    description.security = 'nosec_sc';
    return description;
  },

  /**
     * Create link format payload for response from thing description.
     *
     * @param {Object} description The thing description
     * @returns {string} Link format payload as string.
     */
  getCoreLinkFormat(description) {
    const core = [];

    for (const rgKey of resourceGroupKeys) {
      if (description.hasOwnProperty(rgKey)) {
        if (rgKey === 'href') {
          core.push(`<${description[rgKey]}>`);
          continue;
        }
        if (rgKey === 'links') {
          for (const link of description.links) {
            core.push(`<${link.href}>;rt="${link.rel}";ct=50`);
          }
          continue;
        }

        const resourceGroup = description[rgKey];
        const resourceKeys = Object.keys(resourceGroup);

        for (const rKey of resourceKeys) {
          const resource = resourceGroup[rKey];
          if (!resource.hasOwnProperty('links')) {
            continue;
          }
          for (const link of resource.links) {
            let coreLink;
            switch (rgKey) {
              case 'properties':
                const types = Array.isArray(resource['@type']) ? resource['@type'].join(' ') : resource['@type'];
                coreLink = `<${link.href}>;rt="${types}";ct=50;title="${resource.title}"`;
                break;
              case 'actions':
                coreLink = `<${link.href}>;rt="${link.rel}";ct=50`;
                break;
              case 'events':
                coreLink = `<${link.href}>;rt="${link.rel}";ct=50`;
                break;
            }
            core.push(coreLink);
          }
        }
      }
    }

    return core.join(',');
  },

  /**
     * Get parsed payload Buffer from request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @returns {Object} Parsed JSON payload from IncomingMessage
     */
  getBody(req) {
    return JSON.parse(req.payload.toString());
  },

  /**
     * Create JSON payload for response and set Content-Format
     *
     * @param {Object} res The response object of type OutgoingMessage
     * @param {Object} object The payload object to be converted to JSON string
     * @returns {string} JSON payload as string.
     */
  getJson(res, object) {
    res.setOption('Content-Format', 'application/json');
    return JSON.stringify(object);
  },
};

module.exports = helpers;
