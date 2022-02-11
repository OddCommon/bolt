import { selectors } from './constants';

const parser = new DOMParser();

let busy = false;
let prefetch = [];
let protectedScript = '';

let newPage = {
  DOM: null,
  Routers: null,
  Title: null,
  Scripts: null,
  Meta: null,
  Links: null,
  Modules: null,
  Merge: null,
  Prefetch: null,
};

let oldPage = {
  DOM: document,
  Routers: null,
  Scripts: null,
  Meta: null,
  Links: null,
  Modules: null,
  Merge: null,
  Prefetch: null,
};

const merge = (newCollection, oldCollection, convert = false) => {
  oldCollection.map(oldLink => {
    let oldMapHref = oldLink.href;
    const retain = newCollection.find(newLink => newLink.href === oldMapHref);
    if (!retain) {
      oldLink.remove();
    }
  });

  newCollection.map(newLink => {
    const retain = oldCollection.find(oldLink => oldLink.href === newLink.href);
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
};

export const getRawFileName = path => {
  if (!path) return;
  return path
    .split(/[\\\/]/)
    .pop()
    .split('?')[0];
};

export const getRawFilePath = path => {
  return path.split('?')[0];
};

const filterProtectedScript = scripts => {
  const _scripts = scripts.filter(s => {
    if (!s.getAttribute('src')) return;
    let scriptURL = getRawFileName(s.getAttribute('src'));
    if (scriptURL !== protectedScript && scriptURL.indexOf('client') <= -1) {
      return s;
    } else {
      return false;
    }
  });
  return _scripts;
};

export const setProtectedScript = path => {
  const protectedPath = getRawFileName(path);
  const scripts = [...document.querySelectorAll('script')];
  const links = [...document.querySelectorAll('link')];
  const pageScripts = [...scripts, ...links];

  const script = pageScripts.find(s => {
    let scriptURL =
      s.tagName === 'SCRIPT'
        ? getRawFileName(s.getAttribute('src'))
        : getRawFileName(s.getAttribute('href'));

    if (scriptURL === protectedPath) {
      return s;
    }
  });
  protectedScript = protectedPath;
  script.setAttribute(selectors.BOLT_PROTECT, '');
};

// Set the DOM to busy
export const toggleDOMBusy = () => {
  busy = busy ? false : true;
  document.documentElement.ariaBusy = busy;
};

export const parseNewPage = html => {
  newPage.DOM = parser.parseFromString(html, 'text/html');
  newPage.Title = newPage.DOM.title;
  newPage.Routers = [...newPage.DOM.querySelectorAll(`[${selectors.BOLT_ROUTER}]`)];
  newPage.Scripts = filterProtectedScript([...newPage.DOM.querySelectorAll('script')]);
  newPage.Meta = [...newPage.DOM.querySelectorAll('meta')];
  newPage.Links = [...newPage.DOM.querySelectorAll('link')];
  newPage.Modules = [...newPage.DOM.querySelectorAll('link')].filter(l => {
    if (l.getAttribute('rel') === 'modulepreload' && !l.getAttribute(selectors.BOLT_PROTECT)) {
      return l;
    }
  });
  newPage.Merge = [...newPage.DOM.querySelectorAll(`[${selectors.BOLT_MERGE}]`)];
  newPage.Prefetch = [...newPage.DOM.querySelectorAll(`[${selectors.BOLT_PREFETCH}]`)];

  return newPage;
};

export const cacheCurrentPage = () => {
  oldPage.DOM = document;
  oldPage.Routers = [...oldPage.DOM.querySelectorAll(`[${selectors.BOLT_ROUTER}]`)];
  oldPage.Scripts = filterProtectedScript([...oldPage.DOM.querySelectorAll('script')]);
  oldPage.Meta = [...oldPage.DOM.querySelectorAll('meta')];
  oldPage.Links = [...oldPage.DOM.querySelectorAll('link')];
  oldPage.Modules = [...oldPage.DOM.querySelectorAll('link')].filter(l => {
    if (l.getAttribute('rel') === 'modulepreload' && !l.getAttribute(selectors.BOLT_PROTECT)) {
      return l;
    }
  });
  oldPage.Merge = [...oldPage.DOM.querySelectorAll(`[${selectors.BOLT_MERGE}]`)];
  oldPage.Prefetch = [...oldPage.DOM.querySelectorAll(`[${selectors.BOLT_PREFETCH}]`)];

  return oldPage;
};

export const mergeMeta = () => {
  oldPage.DOM.title = newPage.Title;
  oldPage.Meta.forEach(meta => meta.remove());
  newPage.Meta.forEach(meta => document.head.appendChild(meta));
};

export const mergeLinks = () => {
  merge(newPage.Links, oldPage.Links, false);
};

export const mergeModules = () => {
  merge(newPage.Modules, oldPage.Modules, true);
};

export const mergeAttributes = () => {
  newPage.Merge.forEach(newMergeElement => {
    const oldMergeElement = oldPage.Merge.find(
      oleMerge => oleMerge.dataset.boltMerge === newMergeElement.dataset.boltMerge
    );

    if (oldMergeElement) {
      const newAttributes = newMergeElement.attributes;
      const oldAttributes = oldMergeElement.attributes;

      // Wipe the Old elements attributes
      for (let i = 0; i < oldAttributes.length; i++) {
        oldMergeElement.setAttribute(oldAttributes[i].name, '');
      }

      // Merge our new attributes
      for (let i = 0; i < newAttributes.length; i++) {
        oldMergeElement.setAttribute(newAttributes[i].name, newAttributes[i].value);
      }
    } else {
      newPage.DOM.body.appendChild(newMergeElement);
    }
  });
};

export const mergeScripts = ({ onLoadProgress }) => {
  return new Promise(async (resolve, reject) => {
    // Remove old Scripts
    oldPage.Scripts.map(oldScript => {
      oldScript.remove();
    });

    // Inject new Scripts
    const newScripts = [];
    let scriptsLoaded = 0;
    newPage.Scripts.map(newScript => {
      let newScriptSrc = newScript.src;
      newScripts.push(
        new Promise(async (resolve, reject) => {
          const script = document.createElement('script');

          script.onload = () => {
            resolve();
          };

          // Always assign a type
          script.type = newScript.type ? newScript.type : 'text/javascript';

          // If the script is inline or not
          if (newScriptSrc) {
            const cache = Math.round(Math.random() * 1000);
            if (newScriptSrc.indexOf('?') > -1) {
              newScriptSrc = `${newScriptSrc}&=${cache}`;
            } else {
              newScriptSrc = `${newScriptSrc}?=${cache}`;
            }

            script.src = `${newScriptSrc}`;
          }
          if (!newScriptSrc) {
            script.text = newScript.text;
            resolve();
          }

          document.body.appendChild(script);
        }).then(() => {
          scriptsLoaded++;
          if (onLoadProgress) onLoadProgress({ total: newScripts.length, complete: scriptsLoaded });
        })
      );
    });

    if (onLoadProgress) onLoadProgress({ total: newScripts.length, complete: 0 });
    await Promise.all(newScripts).then(() => {
      resolve();
    });
  });
};

export const replace = () => {
  prefetch.forEach(element => {
    element.remove();
  });

  newPage.Routers.forEach(newRouteWrapper => {
    const oldRouterWrapper = oldPage.Routers.find(
      oldWrapper => oldWrapper.dataset.boltRouter === newRouteWrapper.dataset.boltRouter
    );

    if (oldRouterWrapper) {
      oldRouterWrapper.replaceWith(newRouteWrapper);
    }
  });

  oldPage.Routers.forEach(oldRouterWrapper => {
    const newRouterWapper = newPage.Routers.find(
      newWrapper => newWrapper.dataset.boltRouter === oldRouterWrapper.dataset.boltRouter
    );

    if (!newRouterWapper) {
      oldRouterWrapper.remove();
    }
  });
};

export const prefetchAsset = (asset, as) => {
  const prefetchAsset = document.createElement('link');
  prefetchAsset.rel = 'preload';
  prefetchAsset.href = asset;
  prefetchAsset.as = as;
  const element = document.head.appendChild(prefetchAsset);
  return element;
};

export const prefetchAssets = () => {
  prefetch = [...newPage.DOM.querySelectorAll(`[${selectors.BOLT_PREFETCH}]`)].map(element => {
    switch (element.tagName) {
      case 'DIV':
        return prefetchAsset(
          element.style['background-image'].replace(`url("`, '').replace(`")`, ''),
          'image'
        );
        break;
      case 'IMG':
        return prefetchAsset(element.src, 'image');
        break;
      case 'VIDEO':
        return prefetchAsset(element.src, 'video');
        break;
      case 'AUDIO':
        return prefetchAsset(element.src, 'audio');
        break;
      default:
        console.warn('This resource is not supported');
        break;
    }
  });
};
