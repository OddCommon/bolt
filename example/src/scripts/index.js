import Router from './lib';
import Nav from './nav';
import { whiteToBlackTransition, blackToWhiteTransition } from './transitions';

class BoltDemo {
  constructor() {
    window.BoltRouter = new Router({
      transitions: [
        {
          name: 'featuresTransition',
          transition: blackToWhiteTransition,
        },
        {
          name: 'examplesTransition',
          transition: whiteToBlackTransition,
        },
        {
          name: 'examplesToFeatures',
          from: /link-example/,
          to: /features/,
          transition: whiteToBlackTransition,
        },
        {
          name: 'featuresToExamples',
          from: /features/,
          to: /link-example/,
          transition: blackToWhiteTransition,
        },
        {
          name: 'featuresToEvents',
          from: /features/,
          to: /events/,
          transition: blackToWhiteTransition,
        },
        {
          name: 'eventsToFeatures',
          from: /events/,
          to: /features/,
          transition: whiteToBlackTransition,
        },
      ],
    });

    this.nav = new Nav();
  }
}

// Kick'r off
window.BoltDemo = new BoltDemo();
