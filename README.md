# ⚡️🤖 Bolt

A light weight library ( 3k gzipped ) that gives you the speed and control of an SPA while keeping your site static through progressive enhancement and modern techniques.

Demo: https://bolt.oddcommon.dev

The primary goal of Bolt is to speed up page load times and give users the feel of an SPA while remaining static HTML. It's not quite a router and not quite a transition library, it's main objective is speed and progressive enhancement, it's up to you to decide how to implement.

You can use Bolt in a few different ways, out of the box it will improve load times with a few modifications to your code.

Heavily inspired by [Quicklink](https://github.com/GoogleChromeLabs/quicklink), [Turbo](https://turbo.hotwired.dev/) & [Highway](https://highway.js.org/) the goal of Bolt is to be an easy to integrate script that gives speed + flexibility to build around.

## 📦 Setup

Bolt is a long lived script and needs to run on each page and between renders. If you initialize Bolt from a script that script will be considered protected, that means it will never be disposed of.

ex: App.js

```js
import Router from "@oddcommon/bolt";

class App {
  constructor(){
    this.BoltRouter = new Router();

    this.observe();
  }

  observe(){
    this.BoltRouter.on('navigate-before', () => { .... })
  }
}
new App();
```

## Dev

- `npm run dev`
- http://localhost:8000/examples

## Basics

### Wrapper

In order for Bolt to know where updates need to be rendered you need to specify a dom element to use. This is done by adding `data-bolt` to any top level DOM element that will be changing from page to page. Typically this would be your main content.

Anything outside of `data-bolt` will be left intact between page renders. You can have multiple wrappers by specifying an ID

example:

```html
<div data-bolt="some-id">...</div>
```

### Link

To get Bolt running on your links just add `data-bolt-link` as an attribute to any links. Bolt will handle the rest.

You can optionally set `data-bolt-link="static"` and bolt will retain the current scroll position on the page between renders. This is helpful if you're paginating content and don't want to reset the user on every click. The default behavior is to scroll the user to the top of the page on every render.

### Static

Adding `data-bolt-static='static-id'` to an element will freeze that element and Bolt will not touch it between renders. These elements will never be removed or changed, you can treat them as independent sandboxes for long lived content.

## ✨ Super charge Bolt

Bolt has a predefined lifecycle and emits events throughout this lifecycle. you can tap into any of them at any time.

#### 🎟 Events

- prefetch-before
- prefetch-complete
- navigate-before
  - params: `{to: string, from: string}`
- navigate-complete
  - params: `{to: string, from: string}`
- loading
- load-event
  - params: `{total: integer, complete: integer}`
- load-complete
- render-before
- render-complete
- bolt-complete

### Merge Elements

Bolt has a concept of merging static elements that are outside the main `data-bolt` wrapper. By adding `data-bolt-merge` to an element bolt will merge attributes of those elements. This is handy if you have different classes or require a specific layout between pages on elements that are static.

example:

```html
<div data-bolt-merge="div-id">...</div>
```

### Prefetch

If you want to really go after speed and have specific assets that you want to preload before a navigation event even happens you can use `data-bolt-prefetch`. This will add `preload` tags and the browser will begin preloading those assets in the background.

🚨 - This is very agressive and must be used with caution, but it can result in dramatically faster pages loads.

### API

Bolt has a very simple API that allows you the ability to control lifecycle steps.

- `BoltRouter.pause()` - Pauses execution before the next step in lifecycle
- `BoltRouter.resume()` - Resumes execution
- `BoltRouter.initialize()` - Refreshes bindings
- `BoltRouter.disable()` - Disable Bolt

### 🚨 Danger Zone Be Very careful with these

- `BoltRouter.lock()` - Override the lock that Bolt creates during routing ( similar to pause but blocks any new routing from happening )
- `BoltRouter.unlock()` - Unlock the override

### Transitions

When you initialize Bolt you can supply a transitions object where you can define transition functions and then specify them using `data-bolt-transition="transitionName"` Your transition function will be called on `navigate-before` - it us up to you to hook into the Bolt lifecycle. In the below example we are simply adding an await to delay, it's up to you to decide what happens and when to resume Bolt lifecycle. You can also hook into any step of the lifecycle for your transition.

Example:

```js
import Router from '@oddcommon/bolt';

class App {
  constructor() {
    const exampleTransition = this.exampleTransition;

    this.BoltRouter = new Router({
      transitions: [
        {
          name: 'exampleTransition',
          transition: exampleTransition,
        },
      ],
    });
  }

  // Bolt provides the to and from in the callback
  async exampleTransition({ to, from }) {
    // Pause Bolt lifecycle
    this.BoltRouter.pause();

    // ... Fancy transition animation and logic
    await setTimeout(() => {
      new Promise(resolve => resolve());
    }, 500);

    // Resume Bolt Lifecycle
    this.BoltRouter.resume();
  }
}
new App();
```

#### Register Transitions

You can register new transitions at any time by calling `BoltRouter.registerTransition({ ...transition-object })`;

#### Transition Object Options

If you want to specify specific transitions based on pages you can define `to` and `from` in your transition object, Bolt will call the transiton whenever it's navigating to and from those specific pages.

```js
const transitionObject = {
  name: 'homeToAbout',
  to: '/about/',
  from: '/home/',
  transition: exampleTransition,
};
```
