import Eventful from './eventful';

class BoltRouter extends Eventful {
  #prefetch;
  #links;
  #action;
  #staticElements;
  #intercept;
  #interceptResolve;
  #locked;
  #preflight;
  #currentUrl;

  constructor() {
    super();

    // Public
    this.pause = () => this._pause();
    this.resume = () => this._resume();
    this.initialize = () => this._initialize();
    this.lock = () => this._lock();
    this.unlock = () => this._unlock();

    // Private
    this.#action = window.ontouchstart === null ? 'touchstart' : 'click';
    this.#links = [];
    this.#staticElements = [];
    this.#intercept = null;
    this.#locked = false;
    this.#prefetch = e => this._prefetch(e);
    this.#currentUrl = this._sanitizeUrl(window.location.href);

    // Before naviagtion determine alt keys & if we're accessing the current URL
    // Run a check for locked state as well and block if we are.
    this.#preflight = async event => {
      // Handle keys natively
      if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      } else {
        event.preventDefault();
        if (event.target.href === window.location.href || this.#locked) return;
        this.emit('before-navigate', {
          to: this._sanitizeUrl(event.target.href),
          from: window.location.pathname,
        });
        this._navigate(event);
      }
    };

    let popTimeout = null;
    const handlePopState = async event => {
      if (history?.state?.payload) {
        // Since popState is not cancelable we need to add
        // some protections against spamming the buttons
        this._pause();

        // Clear the timeout and wait ~500ms then resume
        if (popTimeout) clearTimeout(popTimeout);
        popTimeout = setTimeout(async () => {
          this._resume();
        }, 500);

        // Lock & fire event
        this.#locked = true;
        this.emit('before-navigate', { to: history.state.page, from: this.#currentUrl });
        this.#currentUrl = this._sanitizeUrl(window.location.href);

        // Wait for our intercept to clear and proceed
        if (this.#intercept) await this.#intercept;
        this._render(history.state.payload);
      } else {
        history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initial setup
    this._setup();

    // Listen
    this._initialize();
  }

  _sanitizeUrl(url) {
    return url.replace(window.location.origin, '');
  }

  async _setup() {
    const payload = await fetch(location.href, { credentials: `include` });
    const initialPage = await payload.text();
    window.history.pushState(
      { payload: initialPage, page: window.location.pathname },
      '',
      location.href
    );
  }

  _pause() {
    this.#intercept = new Promise(resolve => {
      this.#interceptResolve = resolve;
    });
  }

  _resume() {
    if (this.#interceptResolve) this.#interceptResolve();
    this.#intercept = null;
  }

  _lock() {
    this.#locked = true;
  }

  _unlock() {
    this.#locked = false;
  }

  _initialize() {
    // Dispose of any existing listeners
    this._dispose();

    this.#staticElements = [];
    this.#staticElements = [...document.querySelectorAll('[data-Boltrouter-static]')];

    // Listen
    this._observe();
  }

  _observe() {
    // Empty links & Query
    this.#links = [];
    this.#links = [...document.querySelectorAll('a[data-router-link]')].map(link => {
      return {
        element: link,
        url: link.href,
        payload: null,
      };
    });

    // Attach listeners
    this.#links.map(link => {
      if (!window.ontouchstart) {
        link.element.addEventListener('mouseover', this.#prefetch);
      }
      link.element.addEventListener(this.#action, this.#preflight);
    });
  }

  _prefetch(event) {
    // Find the link in our list
    const link = this.#links.find(l => l.url === event.target.href);

    if (link.payload) {
      return link.payload;
    } else {
      return new Promise(async resolve => {
        this.emit('before-prefetch', { url: event.target.href });

        // Remove the listener
        event.target.removeEventListener('mouseover', this.#prefetch);

        // Fetch the page
        const payload = await fetch(event.target.href, { credentials: `include` });
        link.payload = await payload.text();

        this.emit('prefetch-complete', { url: event.target.href, payload: link.payload });
        resolve(link.payload);
      });
    }
  }

  async _navigate(event) {
    this.#locked = true;
    if (this.#intercept) await this.#intercept;
    document.documentElement.ariaBusy = 'true';

    const payload = await this._prefetch(event);
    const link = this.#links.find(l => l.url === event.target.href);

    this.emit('navigate-complete');
    this.#currentUrl = this._sanitizeUrl(this._sanitizeUrl(link.url));
    window.history.pushState({ payload: payload, page: this._sanitizeUrl(link.url) }, '', link.url);
    this._render(payload);
  }

  _mergeLinks(newLinks, oldLinks, convert = false) {
    oldLinks.map(oldLink => {
      let oldMapHref = oldLink.href;
      const retain = newLinks.find(newLink => newLink.href === oldMapHref);
      if (!retain) {
        oldLink.remove();
      }
    });

    newLinks.map(newLink => {
      const retain = oldLinks.find(oldLink => oldLink.href === newLink.href);
      if (retain && convert) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = `${newLink.href}`;
        document.head.appendChild(script);
        newLink.remove();
      }
      if (!retain && !convert) {
        newLink.remove();
      }
    });
  }

  async _render(html) {
    this.emit('before-render');
    if (this.#intercept) await this.#intercept;

    const parser = new DOMParser();

    // Old Page
    const routerWrapper = document.querySelector('[data-router]');
    const oldPageTitle = document.querySelector('title');
    const oldPageScripts = [...document.querySelectorAll('script')];
    const oldPageMeta = [...document.querySelectorAll('meta')];
    const oldPageLinks = [...document.querySelectorAll('link')].filter(
      l => l.rel != 'modulepreload'
    );
    const oldPageModules = [...document.querySelectorAll('link')].filter(
      l => l.rel == 'modulepreload'
    );

    // New page
    const newPage = parser.parseFromString(html, 'text/html');
    const newRouterWrapper = newPage.querySelector('[data-router]');
    const newPageTitle = newPage.querySelector('title');
    const newPageScripts = [...newPage.querySelectorAll('script')];
    const newPageMeta = [...newPage.querySelectorAll('meta')];
    const newPageLinks = [...newPage.querySelectorAll('link')].filter(
      l => l.rel != 'modulepreload'
    );
    const newPageModules = [...newPage.querySelectorAll('link')].filter(
      l => l.rel == 'modulepreload'
    );

    // Swap Meta
    oldPageMeta.forEach(meta => meta.remove());
    newPageMeta.forEach(meta => document.head.appendChild(meta));

    // Change the Head
    this._mergeLinks(newPageLinks, oldPageLinks, false);
    this._mergeLinks(newPageModules, oldPageModules, true);

    this.emit('loading');
    if (this.#intercept) await this.#intercept;

    // Swap Router Content & Update Title
    this.emit('render-complete');
    if (this.#intercept) await this.#intercept;
    routerWrapper.replaceWith(newRouterWrapper);
    oldPageTitle.innerText = newPageTitle.innerText;

    // Initialize
    this._initialize();

    // Remove old Scripts
    oldPageScripts.map(oldScript => {
      let oldScriptSrc = oldScript.src;
      const retain = oldScriptSrc
        ? newPageScripts.find(newScript => newScript.src === oldScriptSrc)
        : newPageScripts.find(newScript => !newScript.src && newScript.text === oldScript.text);
      if (!retain) {
        oldScript.remove();
      }
    });

    // Inject new Scripts
    const newScripts = [];
    let scriptsLoaded = 0;
    newPageScripts.map(newScript => {
      const newScriptSrc = newScript.src;
      const retain = newScriptSrc
        ? oldPageScripts.find(oldScript => oldScript.src === newScriptSrc)
        : oldPageScripts.find(oldScript => !oldScript.src && oldScript.text === newScript.text);

      if (!retain) {
        newScripts.push(
          new Promise(async (resolve, reject) => {
            const script = document.createElement('script');
            script.onload = () => {
              resolve();
            };

            // Always assign a type
            script.type = script.type ? script.type : 'text/javascript';

            // If the script is inline or not
            if (newScriptSrc) {
              script.src = `${newScriptSrc}`;
            }
            if (!newScriptSrc) {
              script.text = newScript.text;
              resolve();
            }

            // Determine where to append
            if (newScript.parentElement.toString === '[object HTMLBodyElement]') {
              document.body.appendChild(script);
            } else {
              document.head.appendChild(script);
            }
          }).then(() => {
            scriptsLoaded++;
            this.emit('load-event', { total: newScripts.length, complete: scriptsLoaded });
          })
        );
      }
    });

    this.emit('load-event', { total: newScripts.length, complete: 0 });
    await Promise.all(newScripts);

    this.#locked = false;
    this.#intercept = null;
    this.#interceptResolve = null;

    this.emit('load-complete');
    document.documentElement.ariaBusy = 'false';
  }

  _dispose() {
    this.#links.forEach(link => {
      link.element.removeEventListener('mouseover', this.#prefetch);
      link.element.removeEventListener(this.#action, this.#preflight);
    });
  }
}
export default BoltRouter;
