/**
 * Helper functions
 */
 
"use strict";

const resourceTypes = ["href", "links", "properties", "actions", "events"];
const protocol = "coap";

module.exports = {
	/**
     * Create description for thing.
     *
     * @param {Object} thing The thing
     * @returns {Object} Description for thing.
     */
    getDescription(thing) {
        const description = thing.asThingDescription();
        if (thing.getHref() !== "/") {
            description.href = thing.getHref();
        }
        // Uri-Host option must be set by sender to get correct base
        description.base =`${protocol}://${req.host}${thing.getHref()}`;
        description.securityDefinitions = {
            nosec_sc: {
                scheme: "nosec",
            },
        };
        description.security = "nosec_sc";
        return description;
    }
    
    /**
     * Create link format payload for response from thing description.
     *
     * @param {Object} description The thing description
     * @returns {string} Link format payload as string.
     */
    getCoreLinkFormat(description) {
        const core = [];
    
        for (let rt of resourceTypes) {
            if (description.hasOwnProperty(rt)) {
                if (rt === "href") {
                    core.push(`<${description[rt].href}>`);
                    continue;
                }
                if (rt === "link") {
                    for (let l of description.links) {
                        core.push(`<${l.href}>;rt=\"${l.rel}\";ct=50`);
                    }
                    continue;
                }
            
                for (let r in description[rt]) {
                    if (!description[rt]hasOwnProperty(r) {
                        continue;
                    }
                    for (let l of r.links) {
                        let coreLink;
                        switch (rt) {
                            case "properties":
                                const types = Array.isArray(p["@type"]) ? p["@type"].join(" ") : p["@type"];
                                coreLink = `<${l.href}>;rt=\"${types}\";ct=50;title=\"${r.title}\"`;
                                break;
                            case "actions":
                                coreLink = `<${l.href}>;rt=\"${l.rel}\";ct=50`;
                                break;
                            case "events":
                                coreLink = `<${l.href}>;rt=\"${l.rel}\";ct=50`;
                                break;
                        }
                        core.push(coreLink);
                    }
                }
            }
        }
        core.push("</>")
        core.push("</.well-known/core>");
        
        return core.join(",");
    }
    
    /**
     * Get parsed payload Buffer from request.
     *
     * @param {Object} req The request object of type IncomingMessage
     * @returns {Object} Parsed JSON payload from IncomingMessage
     */
    getBody(req) {
        return JSON.parse(req.payload.toString());
    }
    
    /**
     * Create JSON payload for response and set Content-Format
     *
     * @param {Object} res The response object of type OutgoingMessage
     * @param {Object} object The payload object to be converted to JSON string
     * @returns {string} JSON payload as string.
     */
    getJson(res, object) {
        res.setOption("Content-Format", "application/json");
        return JSON.stringify(object);
    }
}
