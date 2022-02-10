import Eventful from './eventful';

// Constants
import { events, selectors, strategies } from './constants';

// Utils
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
} from './dom';

import { sanitizeURL } from './utils';

class BoltRouter extends EventTarget {
  #_locked;
  #_mode;
  #_cache;
  #_intercept;
  #_interceptResolve;
  #_currentURL;
  #_links;
  #_action;
  #_handlePopState;
  #_popTimeout;

  constructor() {
    super();

    // Expose Internals
    this.prefetch = e => this._prefetch(e);
    this.preflight = e => this._preflight(e);

    // Private Methods
    this.#_handlePopState = e => this._handlePopState(e);

    // Private Properties
    this.#_locked = false;
    this.#_mode = strategies.AGRESSIVE;
    this.#_cache = [];
    this.#_intercept = null;
    this.#_currentURL = sanitizeURL(window.location.href);
    this.#_action = window.ontouchstart === null ? 'touchstart' : 'click';

    // Kick it off
    this._setup();
    this.initialize();
  }

  // Public Methods
  pause() {
    this.#_intercept = new Promise(resolve => {
      this.#_interceptResolve = resolve;
    });
  }

  resume() {
    if (this.#_interceptResolve) this.#_interceptResolve();
    this.#_intercept = null;
  }

  initialize() {
    this._dispose();
    this._observe();
  }

  lock() {
    this.#_locked = true;
  }

  unlock() {
    this.#_locked = false;
  }

  // Internals
  _setup() {
    this._createEventSystem();
    window.addEventListener('popstate', this.#_handlePopState);
  }

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

  _observe() {
    // Empty Links & Query
    this.#_links = [];
    this.#_links = [...document.querySelectorAll(`a[${selectors.BOLT_LINK}]`)].map(link => {
      return {
        element: link,
        url: link.href,
      };
    });

    // Attach listeners
    this.#_links.map(link => {
      if (!window.ontouchstart) {
        link.element.addEventListener('mouseover', this.prefetch);
      }
      link.element.addEventListener(this.#_action, this.preflight);
    });
  }

  _prefetch(event) {
    const target = typeof event === 'object' ? sanitizeURL(event.target.href) : sanitizeURL(event);

    if (this.#_cache[target]) {
      return this.#_cache[target];
    } else {
      return new Promise(async resolve => {
        // Emit Prefetch Event
        this._emit(events.PREFETCH_BEFORE, { url: target });

        // Remove the listener
        if (typeof event === 'object') {
          const link = this.#_links.find(link => link.url === target);
          if (link) link.element.removeEventListener('mouseover', this.prefetch);
        }

        // Fetch the page
        const payload = await fetch(target, { credentials: 'include' });
        this.#_cache[target] = await payload.text();

        if (this.#_mode === strategies.AGRESSIVE) {
          parseNewPage(this.#_cache[target]);
          prefetchAssets();
        }

        // Complete Event
        this._emit(events.PREFETCH_COMPLETE, { url: target });
        resolve(this.#_cache[target]);
      });
    }
  }

  _preflight(event) {
    // Before naviagtion determine alt keys & if we're accessing the current URL
    // Run a check for locked state as well and block if we are.
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    } else {
      const target =
        typeof event === 'object' ? sanitizeURL(event.target.href) : sanitizeURL(event);
      event.preventDefault();
      if (target === this.#_currentURL || this.#_locked) return;
      this._emit(events.NAVIGATE_BEFORE, {
        from: window.location.pathname,
        to: target,
      });
      this._navigate(target);
    }
  }

  async _navigate(url) {
    // Lock Bolt
    this.lock();
    if (this.#_intercept) await this.#_intercept;

    // Toggle ARIA
    toggleDOMBusy();

    const payload = await this._prefetch(url);
    this._emit(events.NAVIGATE_COMPLETE, {
      to: url,
      from: window.location.pathname,
    });
    this.#_currentURL = sanitizeURL(url);
    window.history.pushState(
      {
        payload: payload,
        page: url,
      },
      '',
      url
    );
    this._render(payload);
  }

  async _handlePopState(event) {
    if (history?.state?.payload) {
      this.pause();

      if (this.#_popTimeout) clearTimeout(this.#_popTimeout);
      this.#_popTimeout = setTimeout(() => {
        console.log('resume');
        this.resume();
      }, 500);

      this.lock();
      this._emit(events.NAVIGATE_BEFORE, {
        to: history.state.page,
        from: this.#_currentURL,
      });
      this.#_currentURL = sanitizeURL(window.location.href);

      if (this.#_intercept) {
        console.log('waiting....');
        await this.#_intercept;
      }
      this._render(history.state.payload);
    } else {
      history.back();
    }
  }

  async _render(html) {
    this._emit(events.RENDER_BEFORE);
    if (this.#_intercept) await this.#_intercept;

    parseNewPage(html);
    cacheCurrentPage();
    mergeMeta();

    this._emit(events.LOADING);
    if (this.#_intercept) await this.#_intercept;

    mergeLinks();
    mergeModules();

    this._emit(events.RENDER_COMPLETE);
    if (this.#_intercept) await this.#_intercept;
    mergeAttributes();
    replace();

    this.initialize();
    await mergeScripts({
      onLoadProgress: (total, complete) => {
        this._emit(events.LOAD_PROGRESS, { total: total, complete: complete });
      },
    });

    this.unlock();
    this.resume();

    this._emit(events.LOAD_COMPLETE);
    toggleDOMBusy();
  }

  _dispose() {
    this.#_links?.forEach(link => {
      link.element.removeEventListener('mouseover', this.prefetch);
      link.element.removeEventListener(this.#_action, this.preflight);
    });
  }
}

export default new BoltRouter();
