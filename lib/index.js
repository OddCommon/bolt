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

  constructor() {
    super();

    // Public
    this.pause = () => this._pause();
    this.resume = () => this._resume();
    this.initialize = () => this._initialize();

    // Private
    this.#action = window.ontouchstart === null ? 'touchstart' : 'click';
    this.#links = [];
    this.#staticElements = [];
    this.#intercept = null;
    this.#locked = false;
    this.#prefetch = e => this._prefetch(e);

    // Before naviagtion determine alt keys & if we're accessing the current URL
    // Run a check for locked state as well and block if we are.
    this.#preflight = async event => {
      // Handle keys natively
      if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      } else {
        event.preventDefault();
        if (event.target.href === window.location.href || this.#locked) return;
        this.emit('before-navigate');
        this._navigate(event);
      }
    };

    const handlePopState = event => {
      if (history?.state?.payload) {
        if (this.#locked) return;
        this.#locked = true;

        this.emit('before-navigate');
        this._render(history.state.payload);
      } else {
        history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Listen
    this._initialize();
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

    const payload = await this._prefetch(event);
    const link = this.#links.find(l => l.url === event.target.href);

    this.emit('navigate-complete');
    window.history.pushState({ payload: payload }, '', link.url);
    this._render(payload);
  }

  async _render(html) {
    const parser = new DOMParser();

    // Old Page
    const routerWrapper = document.querySelector('[data-router]');
    const oldPageTitle = document.querySelector('title');
    const oldPageScripts = [...document.querySelectorAll('script')];
    const oldPageMeta = [...document.querySelectorAll('meta')];
    const oldPageLinks = [...document.querySelectorAll('link')].filter(
      l => l.rel == 'modulepreload'
    );

    // New page
    const newPage = parser.parseFromString(html, 'text/html');
    const newRouterWrapper = newPage.querySelector('[data-router]');
    const newPageTitle = newPage.querySelector('title');
    const newPageScripts = [...newPage.querySelectorAll('script')];
    const newPageMeta = [...newPage.querySelectorAll('meta')];
    const newPageLinks = [...newPage.querySelectorAll('link')].filter(
      l => l.rel == 'modulepreload'
    );

    oldPageMeta.forEach(meta => meta.remove());
    newPageMeta.forEach(meta => document.head.appendChild(meta));

    // Change the Head
    oldPageLinks.map(oldLink => {
      let oldMapHref = oldLink.href;
      const retain = newPageLinks.find(newLink => newLink.href === oldMapHref);
      if (!retain) {
        oldLink.remove();
      }
    });

    newPageLinks.map(newLink => {
      const retain = oldPageLinks.find(oldLink => oldLink.href === newLink.href);
      if (retain) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = `${newLink.href}`;
        document.head.appendChild(script);
        newLink.remove();
      }
    });

    this.emit('loading');
    if (this.#intercept) await this.#intercept;

    this.emit('before-render');
    if (this.#intercept) await this.#intercept;

    // Swap Router Content & Update Title
    routerWrapper.replaceWith(newRouterWrapper);
    oldPageTitle.innerText = newPageTitle.innerText;

    // Initialize
    this._initialize();
    this.emit('render-complete');
    if (this.#intercept) await this.#intercept;

    // Remove old Scripts
    oldPageScripts.map(oldScript => {
      let oldScriptSrc = oldScript.src;
      const retain = newPageScripts.find(newScript => newScript.src === oldScriptSrc);
      if (!retain) {
        oldScript.remove();
      }
    });

    // Inject new Scripts
    const newScripts = [];
    let scriptsLoaded = 0;
    newPageScripts.map(newScript => {
      const newScriptSrc = newScript.src;
      const retain = oldPageScripts.find(oldScript => oldScript.src === newScriptSrc);
      if (!retain) {
        newScripts.push(
          new Promise(async (resolve, reject) => {
            const script = document.createElement('script');
            script.onload = () => {
              resolve();
            };
            script.type = script.type;
            script.src = `${newScriptSrc}`;
            if (script.type == 'module') {
              document.head.appendChild(script);
            } else {
              document.body.appendChild(script);
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

    this.emit('load-complete');
    this.#locked = false;
  }

  _dispose() {
    this.#links.forEach(link => {
      link.element.removeEventListener('mouseover', this.#prefetch);
      link.element.removeEventListener(this.#action, this.#preflight);
    });
  }
}
export default BoltRouter;
