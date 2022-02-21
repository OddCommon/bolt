// Constants
import { events, selectors, mouseEvents } from './constants';

// Utils
import { sanitizeURL } from './utils';

// DOM
import {
  mergeLinks,
  mergeAttributes,
  mergeScripts,
  mergeMeta,
  replace,
  toggleDOMBusy,
  parseNewPage,
  cacheCurrentPage,
  prefetchAssets,
  mergeModules,
  setProtectedScript,
  getRawFileName,
  cleanupPrefetch,
} from './dom';

///////////////////////////////////////////////////
//
// ⚡️ Bolt Router
//
//////////////////////////////////////////////////
class Bolt extends EventTarget {
  constructor(config) {
    super();

    // Expose Internals
    this.prefetch = e => this._prefetch(e);
    this.preflight = e => this._preflight(e);
    this.handlePopState = e => this._handlePopState(e);

    // Private Properties
    this._locked = false;
    this._cache = [];
    this._intercept = null;
    this._currentURL = sanitizeURL(window.location.href);
    this._action = 'click';
    this._scroll = [0, 0];
    this._renderTime = null;
    this._transitions = [];
    this._transition = null;

    // Register transitions
    config?.transitions?.forEach(t => {
      this.registerTransition(t);
    });

    // Kick it off
    this._setup();
    this.initialize();
  }

  /*
   * Initialize
   * Initializes the script, disposes of old listeners & creates new ones.
   */
  initialize() {
    this._dispose();
    this._observe();
  }

  /*
   * Pause
   * Creates a promise that will pause lifecycle until resumed.
   */
  pause() {
    this._intercept = new Promise(resolve => {
      this._interceptResolve = resolve;
    });
  }

  /*
   * Resume
   * Resolves the pause promise and resumes lifecycle.
   */
  resume() {
    if (this._interceptResolve) this._interceptResolve();
    this._intercept = null;
  }

  /*
   * Lock
   * If locked navigation events will be blocked.
   * This is an internal hook that prevents link spamming.
   */
  lock() {
    this._locked = true;
  }

  /*
   * Unlock
   * Unlocks the blocker for links & navigating
   */
  unlock() {
    this._locked = false;
  }

  /*
   * Disable
   * Disables Bolt
   */
  disable() {
    this._dispose();
  }

  /*
   * Register Transition
   * Dynamically register a transition
   *
   * Params:
   * transition: Object
   * - name: String
   * - to: String ( optional )
   * - from: String ( optional )
   * - transition: function ( required )
   */
  registerTransition(transition) {
    if (
      !transition.name &&
      typeof transition.name !== 'string' &&
      typeof transition.transition !== 'function'
    ) {
      console.warn('Invalid Transition Registration. Please check name and transition function');
      return;
    }
    const existingTransition = this._transitions.find(t => t.name === transition.name);
    if (!existingTransition) {
      this._transitions.push(transition);
    }
  }

  /*
   * _getFileCallerURL
   * In order to preserve bolt from page to page we need to identify the script that imported it.
   * This will be considered a long lived script that will be present on all pages.
   *
   * There isn't a great way to do this without manually specifying a script so we need to inspect
   * the stack and identify the origin script file path.
   *
   * This is a tad hacky and could be cleaned up and further optimized. Each browser has a slightly
   * different approach for dealing with stack traces so we need to account for them.
   */
  _getFileCallerURL() {
    // Create an error
    const err = new Error();

    // Prepare the stack trace
    Error.prepareStackTrace = (_, stack) => stack;

    // Get our stack
    const stack = err.stack;

    // Reset the stack trace !this is important!
    Error.prepareStackTrace = undefined;

    // Run check based on native stack trace
    if (typeof stack === 'object') {
      // Chrome is a simple array and provide the filename to us.
      return stack.pop().getFileName();
    }

    // Safari & Firefox are a bit more complicated
    if (typeof stack === 'string') {
      let path;
      let modules = stack.split('\n');

      // Safari identifies the module caller as 'module code@'
      // Firefox identifies the module caller as '@'
      //
      // Here we preform some string sanitization to remove any extra args such as cache busting
      // as well as internal line numbers from the stack trace.
      let module = modules.find(s => s.indexOf('module code') > -1);
      if (module) {
        path = `${module.replace('module code@', '').split('.js:')[0]}`.split('?')[0];
      } else {
        module = modules.find(s => s.indexOf('@') == 0).split('?')[0];
        path = `${module.replace('@', '').split('.js:')[0]}`;
        path = `${getRawFileName(path)}`;
      }

      // Ensure that we have the correct extension on our file
      path = `${path.replace(/.js/g, '')}.js`;

      // Return the path to our protected script.
      return path;
    }
  }

  /*
   * Setup
   * On first run we need to
   * - identify the protected script and set it to protected
   * - Create the event system API
   * - Listen for popstate events
   */
  _setup() {
    setProtectedScript(this._getFileCallerURL());
    this._createEventSystem();
    window.history.replaceState(
      {
        payload: new XMLSerializer().serializeToString(cacheCurrentPage()),
        page: window.location.pathname,
        scroll: this._scroll,
      },
      document.title,
      window.location.pathname
    );
    window.addEventListener('popstate', this.handlePopState);
  }

  /*
   * Create Event System
   * _emit: Emits a custom event
   * on: Attach a listener
   * off: Remove a listener
   * once: listen for an event just once
   */
  _createEventSystem() {
    this._emit = (eventName, ...args) => {
      const event = new CustomEvent(eventName);
      event._params = args;
      this.dispatchEvent(event);
    };
    this.on = (eventName, callback, options) => {
      callback._params = e => callback.apply(null, e._params);
      this.addEventListener(eventName, callback._params, options);
    };
    this.off = (eventName, callback) => {
      this.removeEventListener(eventName, callback._params);
    };
    this.once = (eventName, callback) => {
      this.on(eventName, callback, { once: true });
    };
  }

  _renderWatch() {
    if (this._renderTime) clearTimeout(this._renderTime);
    this._renderTime = setTimeout(() => {
      this._emit(events.LOAD_TIMEOUT);
    }, 1500);
  }

  /*
   * Observe
   * Grabs all data-bolt-link links and attaches a listener for clicks
   * Also adds a hover listener to prefetch our content.
   */
  _observe() {
    // Empty Links & Query
    this._links = [];
    this._links = [...document.querySelectorAll(`a[${selectors.BOLT_LINK}]`)].map(link => {
      return {
        element: link,
        url: link.href,
        transition: link.dataset.boltTransition,
      };
    });

    // Attach listeners
    this._links.map(link => {
      let options = {
        root: document,
        threshold: 1,
      };
      let observer = new IntersectionObserver(e => {
        const target = e[0];
        if (target.isIntersecting) {
          this.prefetch(e[0]);
        }
      }, options);
      observer.observe(link.element);
      link.observer = observer;

      // Listen for click
      link.element.addEventListener('click', this.preflight);
    });
  }

  /*
   * Prefetch
   * Prefetches a URL using the fetch API. It will cache the result text and index for future use.
   * After the prefetch is successful we parse the incoming DOM and grab any elements marked as 'data-bolt-prefetch'
   * These elements are then added to the head as <link rel='prefetch'> and we let the browser do it's thing.
   *
   * params:
   * @event: Ideally this is an event object but can also be a URL string.
   */
  _prefetch(event) {
    const target = typeof event === 'object' ? sanitizeURL(event.target.href) : sanitizeURL(event);

    if (this._cache[target]) {
      return this._cache[target];
    } else {
      return new Promise(async (resolve, reject) => {
        // Emit Prefetch Event
        this._emit(events.PREFETCH_BEFORE, { url: target });

        // Remove the listener
        if (typeof event === 'object') {
          const link = this._links.find(link => link.url === target);
          if (link) {
            link.element.removeEventListener('mouseover', this.prefetch);
            link.observer.unobserve(link.element);
          }
        }

        // Fetch the page
        try {
          const payload = await fetch(target, { credentials: 'include' });
          this._cache[target] = await payload.text();

          // Parse incoming DOM
          parseNewPage(this._cache[target]);

          // Preload any `data-bolt-prefetch` elements
          prefetchAssets();

          // Complete Event
          this._emit(events.PREFETCH_COMPLETE, { url: target });
          resolve(this._cache[target]);
        } catch (e) {
          console.warn('Failed to fetch...');
          reject();
        }
      });
    }
  }

  /*
   * Preflight
   * Before we navigate we need to allow any keyboard modifiers to happen so as to not block
   * the user. We also need to check that we aren't already at the incoming URL & that
   * we aren't locked - this prevents spamming the system. If all preflight checks pass then we navigate
   */
  _preflight(event) {
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    } else {
      this._transition = null;

      // Our destination
      const target =
        typeof event === 'object' ? sanitizeURL(event.target.href) : sanitizeURL(event);

      // Prevent the normal click event
      event.preventDefault();

      // Ensure our destination isn't our current URL and that we aren't locked.
      if (target === this._currentURL || this._locked) return;

      if (event.target) {
        // Check for scroll options
        this._scroll =
          event.target.dataset.boltLink == 'static' ? [window.scrollX, window.scrollY] : [0, 0];

        // Check for transition if one is found call it
        const targetTransition = event.target.dataset.boltTransition;
        if (targetTransition) {
          const transition = this._transitions.find(t => t.name === targetTransition);
          if (transition) {
            this._transition = transition;
          }
        }
      }

      // Look for any specific from - to transitions
      const transition = this._transitions.find(t => {
        if (typeof t.to === 'string' && t.from === window.location.pathname && t.to === target) {
          return t;
        }
        if (
          typeof t.to === 'object' &&
          t.to.test(target) &&
          t.from.test(window.location.pathname)
        ) {
          return t;
        }
      });
      if (transition) {
        this._transition = transition;
      }

      // Emit our navigate-before event
      this._emit(events.NAVIGATE_BEFORE, {
        from: window.location.pathname,
        to: target,
      });

      // Navigate
      this._navigate(target);
    }
  }

  /*
   * Navigate
   * Our navigation lifecycle:
   * - Lock
   * - Check for pause, if paused wait for resume
   * - Set dom aria busy for accessibility
   * - Check that we've prefetched the URL, if we haven't we load it and continue
   * - Emit a completed navigation event
   * - Push the new URL into our history along with the prefetched content and url
   * - Render the page
   */
  async _navigate(url) {
    this._renderWatch();

    // Transition if there is one
    if (this._transition) {
      this._transition.transition({
        to: url,
        from: window.location.pathname,
      });
    }

    // Lock Bolt
    this.lock();
    if (this._intercept) await this._intercept;

    // Toggle ARIA
    toggleDOMBusy();

    try {
      const payload = await this._prefetch(url);
      this._emit(events.NAVIGATE_COMPLETE, {
        to: url,
        from: window.location.pathname,
      });
      this._currentURL = sanitizeURL(url);
      window.history.pushState(
        {
          payload: payload,
          page: url,
          scroll: this._scroll,
        },
        document.title,
        url
      );
      this._render(payload);
    } catch (e) {
      console.warn('falling back to native routing');
      window.location = url;
    }
  }

  /*
   * Handle Popstate
   * Popstate cannot be canceled so we need to notify the consuming app that it's happening
   * We will lock our render process to allow for multiple popstate events, then also await a pause
   * If we can continue then we will render the final resolved URL from our popstate history.
   * If we are out of history then just let the browser do it's thing.
   */
  async _handlePopState(event) {
    if (history?.state?.payload) {
      this._emit(events.NAVIGATE_POP_BEFORE, {
        to: history.state.page,
        from: this._currentURL,
      });

      const transition = this._transitions.find(t => {
        if (
          typeof t.to === 'string' &&
          t.from === this._currentURL &&
          t.to === history.state.page
        ) {
          return t;
        }
        if (
          typeof t.to === 'object' &&
          t.to.test(history.state.page) &&
          t.from.test(this._currentURL)
        ) {
          return t;
        }
      });
      if (transition) {
        this._transition = transition;
        this._transition.transition({
          to: history.state.page,
          from: this._currentURL,
        });
      }

      this.lock();
      this._emit(events.NAVIGATE_BEFORE, {
        to: history.state.page,
        from: this._currentURL,
      });

      if (this._intercept) {
        await this._intercept;
      }

      this._currentURL = sanitizeURL(window.location.href);
      this._render(history.state.payload);
    }
  }

  /*
   * Render
   * This is where the magic happens.
   * Lifecycle:
   * - Emit Before Render event
   * - Check for pause, if so hold until resumed
   * - Parse the new page
   * - Cache the current page
   * - Merge incoming meta tags with old meta tags
   * - Emit Loading event
   * - Check for pause, if so hold until resume
   * - Merge incoming links with old links
   * - Merge any links that are JS modules
   * - Emit render complete event
   * - Check for pause, if so hold until resume
   * - Merge attributes for any elements marked as `data-bolt-merge`
   * - Replace the router dom wrappers marked as `data-bolt-router`
   * - Merge incoming script tags with outgoing scripts and append to the page
   * - Emit Load Complete event
   * - Initialize the new page listeners
   * - Unlock our navigation, note the user can override this.
   * - Call resume to clean up any intercepts
   * - Set dom aria busy to false
   * - Clean up any prefetched elements
   */
  async _render(html) {
    this._emit(events.RENDER_BEFORE);
    if (this._intercept) await this._intercept;

    parseNewPage(html);
    cacheCurrentPage();

    this._emit(events.LOADING);
    if (this._intercept) await this._intercept;
    mergeLinks();
    mergeModules();

    this._emit(events.RENDER_COMPLETE);
    if (this._intercept) await this._intercept;
    mergeMeta();
    mergeAttributes();
    await replace();

    mergeScripts({
      onLoadProgress: (total, complete) => {
        this._emit(events.LOAD_PROGRESS, { total: total, complete: complete });
      },
      onComplete: () => {
        this._emit(events.LOAD_COMPLETE);
      },
    });

    if (this._intercept) await this._intercept;
    this.initialize();

    this.unlock();
    this.resume();

    toggleDOMBusy();

    // Clean up any preloaded assets from the last pass.
    cleanupPrefetch();

    // Scroll
    const [x, y] = this._scroll;
    window.scrollTo(x, y);
    clearTimeout(this._renderTime);

    this._emit(events.BOLT_COMPLETE);
  }

  /*
   * Dispose
   * Clean up our listeners
   */
  _dispose() {
    this._links?.forEach(link => {
      mouseEvents.forEach(event => {
        link.element.removeEventListener(event, this.prefetch);
      });
      if (link.observer) link.observer.unobserve(link.element);
      if (link.element) link.element.removeEventListener(this._action, this.preflight);
    });
    this._links = [];
  }
}

export default Bolt;
