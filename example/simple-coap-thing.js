const {
  Property,
  SingleThing,
  Thing,
  Value,
  CoapWebThingServer,
} = require('../index');

function makeThing() {
  const thing = new Thing('my-coap-lamp',
                          'CoapLampExample',
                          ['OnOffSwitch'],
                          'A CoAP lamp example');

  thing.addProperty(
    new Property(thing,
                 'on',
                 new Value(true, (update) => console.log(`on property change: ${update}`)), {
                   '@type': 'OnOffProperty',
                   title: 'On/Off',
                   type: 'boolean',
                   description: 'Lamp on/off state',
                 }));
  thing.addProperty(
    new Property(thing,
                 'brightness',
                 new Value(255, (update) => console.log(`brightness property change: ${update}`)), {
                   '@type': 'BrightnessProperty',
                   title: 'Brightness',
                   type: 'number',
                   description: 'Lamp brightness level from 0 to 255',
                   minimum: 0,
                   maximum: 255,
                   unit: 'integer',
                 }
    )
  );
  return thing;
}

function runServer() {
  const port = process.argv[2] ? Number(process.argv[2]) : 5683;
  const urlOn = `coap://localhost:${port}/properties/on`;
  const urlBright = `coap://localhost:${port}/properties/brightness`;

  console.log(`Usage:\n
${process.argv[0]} ${process.argv[1]} [port]
Try (using coap-cli):
coap put ${urlOn} -O 12,2,17,2 -p "{\\"on\\": true }"
coap put ${urlBright} -O 12,2,17,2 -p "{\\"brightness\\": 0 }"
`);

  const thing = makeThing();
  const server = new CoapWebThingServer(new SingleThing(thing), port);
  process.on('SIGINT', () => {
    server.stop().then(() => process.exit()).catch(() => process.exit());
  });
  server.start().catch(console.error);
}

runServer();
