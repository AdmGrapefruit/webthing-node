const {
  Action,
  Event,
  MultipleThings,
  Property,
  Thing,
  Value,
  CoapWebThingServer,
} = require('../../index');

class OverheatedEvent extends Event {
  constructor(thing, data) {
    super(thing, 'overheated', data);
  }
}

class TestTimerAction extends Action {
  constructor(thing, input) {
    super(TestTimerAction.count++, thing, 'test', input);
  }

  performAction() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.thing.setProperty('on', false);
        this.thing.addEvent(new OverheatedEvent(this.thing, 102));
        resolve();
      }, this.input.duration);
    });
  }
}

/**
 * A dimmable light that logs received commands to stdout.
 */
class Lamp extends Thing {
  constructor() {
    super(
      'Lamp',
      'Lamp',
      ['OnOffSwitch'],
      'Lamp'
    );

    this.addProperty(
      new Property(
        this,
        'on',
        new Value(true, (v) => console.log('On-State is now', v)),
        {
          '@type': 'OnOffProperty',
          title: 'On/Off',
          type: 'boolean',
          description: 'Whether the lamps is turned on',
        }));

    this.addAvailableAction(
      'SwitchOffTimer',
      {
        title: 'Switch Off Timer',
        description: 'Switch off lamp after given duration',
        input: {
          type: 'object',
          required: ['duration'],
          properties: {
            duration: {
              type: 'integer',
              minimum: 1,
              unit: 'milliseconds',
            },
          },
        },
      },
      TestTimerAction);

    this.addAvailableEvent(
      'overheated',
      {
        description: 'The lamp has exceeded its safe operating temperature',
        type: 'number',
        unit: 'degree celsius',
      });
  }
}

/**
 * A humidity sensor which updates its measurement every few seconds.
 */
class HumiditySensor extends Thing {
  constructor() {
    super(
      'HumiditySensor',
      'HumiditySensor',
      ['MultiLevelSensor'],
      'HumiditySensor'
    );

    this.level = new Value(43.0);
    this.addProperty(
      new Property(
        this,
        'level',
        this.level,
        {
          '@type': 'LevelProperty',
          title: 'Humidity',
          type: 'number',
          description: 'The current humidity in %',
          minimum: 0,
          maximum: 100,
          unit: 'percent',
          readOnly: true,
        }));
  }
}

TestTimerAction.count = 0;

const testSwitch = new Lamp();
const testSensor = new HumiditySensor();

const multipleThingsServer = new CoapWebThingServer(new MultipleThings([testSwitch, testSensor],
  // eslint-disable-next-line max-len
  'LampAndHumdDevice'),
  5683);

module.exports = multipleThingsServer;
