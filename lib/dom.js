import { selectors } from './constants';

const parser = new DOMParser();

let busy = false;
let prefetch = [];
let protectedScript = '';

let newPageDOM,
  newPageRouters,
  newPageTitle,
  newPageScripts,
  newPageMeta,
  newPageLinks,
  newPageModules,
  newPageMerge,
  newPagePrefetch;

let oldPageDOM,
  oldPageRouters,
  oldPageScripts,
  oldPageMeta,
  oldPageLinks,
  oldPageModules,
  oldPageMerge,
  oldPagePrefetch;

// Simple Utils
const qAll = (target, selector) => {
  return target.querySelectorAll(selector);
};
const getAttribute = (target, attr) => {
  return target.getAttribute(attr);
};
const createElement = (target, element) => {
  return target.createElement(element);
};
const appendChild = (target, element) => {
  return target.appendChild(element);
};
const setAttribute = (target, name, value) => {
  return target.setAttribute(name, value);
};

/*
 * Merge
 * Merges elements and converts from links to scripts if needed
 *
 * params:
 * @newCollection: Array of HTML elements
 * @oldCollection: Array of HTML elements
 * @convert: Boolean - if the incoming elements are links and should be converted to JS modules
 */
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
      const script = createElement(document, 'script');
      script.type = 'module';
      script.src = `${newLink.href}`;
      appendChild(document.head, script);
      newLink.remove();
    }
    if (!retain && !convert) {
      newLink.remove();
    }
  });
};

/*
 * Cleanup Prefetch
 * A cleanup method for prefetched assets
 */
export const cleanupPrefetch = () => {
  prefetch.forEach(element => {
    element.remove();
  });
};

/*
 * Get Raw File Name
 * A util to get a filename
 *
 * params:
 * @path: string - file path
 */
export const getRawFileName = path => {
  if (!path) return;
  return path
    .split(/[\\\/]/)
    .pop()
    .split('?')[0];
};

/*
 * Get Raw File Path
 * A util for files
 *
 * params:
 * @path: string - file path
 */
export const getRawFilePath = path => {
  return path.split('?')[0];
};

/*
 * Filter Protected Script
 * Filters incoming scripts and ensures that our protected script isn't brought in
 *
 * params:
 * @scripts: Array of script elements
 */
const filterProtectedScript = scripts => {
  const _scripts = scripts.filter(s => {
    if (!getAttribute(s, 'src')) return;
    let scriptURL = getRawFileName(getAttribute(s, 'src'));
    if (scriptURL !== protectedScript && scriptURL.indexOf('client') <= -1) {
      return s;
    } else {
      return false;
    }
  });
  return _scripts;
};

/*
 * Set Protected Script
 * Sets up the protected script
 *
 * params:
 * @path: string - path to protected file
 */
export const setProtectedScript = path => {
  const protectedPath = getRawFileName(path);
  const scripts = [...qAll(document, 'script')];
  const links = [...qAll(document, 'link')];
  const pageScripts = [...scripts, ...links];

  const script = pageScripts.find(s => {
    let scriptURL =
      s.tagName === 'SCRIPT'
        ? getRawFileName(getAttribute(s, 'src'))
        : getRawFileName(getAttribute(s, 'href'));

    if (scriptURL === protectedPath) {
      return s;
    }
  });
  protectedScript = protectedPath;
  if (!script) return;
  setAttribute(script, selectors.BOLT_PROTECT, '');
};

/*
 * Toggle DOM Busy
 * Sets the HTML document aria busy
 */
export const toggleDOMBusy = () => {
  busy = busy ? false : true;
  document.documentElement.ariaBusy = busy;
};

/*
 * Parse New Page
 * Parses incoming HTML
 *
 * params:
 * @html: string - HTML from incoming page
 */
export const parseNewPage = html => {
  newPageDOM = parser.parseFromString(html, 'text/html');
  newPageTitle = newPageDOM.title;
  newPageRouters = [...qAll(newPageDOM, `[${selectors.BOLT_ROUTER}]`)];
  newPageScripts = filterProtectedScript([...qAll(newPageDOM, 'script')]);
  newPageMeta = [...qAll(newPageDOM, 'meta')];
  newPageLinks = [...qAll(newPageDOM, 'link')];
  newPageModules = [...qAll(newPageDOM, 'link')].filter(l => {
    if (getAttribute(l, 'rel') === 'modulepreload' && !getAttribute(l, selectors.BOLT_PROTECT)) {
      return l;
    }
  });
  newPageMerge = [...qAll(newPageDOM, `[${selectors.BOLT_MERGE}]`)];
  newPagePrefetch = [...qAll(newPageDOM, `[${selectors.BOLT_PREFETCH}]`)];

  return newPageDOM;
};

/*
 * Cache Current Page
 * Caches the current document
 */
export const cacheCurrentPage = () => {
  oldPageDOM = document;
  oldPageRouters = [...qAll(oldPageDOM, `[${selectors.BOLT_ROUTER}]`)];
  oldPageScripts = filterProtectedScript([...qAll(oldPageDOM, 'script')]);
  oldPageMeta = [...qAll(oldPageDOM, 'meta')];
  oldPageLinks = [...qAll(oldPageDOM, 'link')];
  oldPageModules = [...qAll(oldPageDOM, 'link')].filter(l => {
    if (getAttribute(l, 'rel') === 'modulepreload' && !getAttribute(l, selectors.BOLT_PROTECT)) {
      return l;
    }
  });
  oldPageMerge = [...qAll(oldPageDOM, `[${selectors.BOLT_MERGE}]`)];
  oldPagePrefetch = [...qAll(oldPageDOM, `[${selectors.BOLT_PREFETCH}]`)];

  return oldPageDOM;
};

/*
 * Merge Meta
 * Merges meta tags
 */
export const mergeMeta = () => {
  oldPageDOM.title = newPageTitle;
  oldPageMeta.forEach(meta => meta.remove());
  newPageMeta.forEach(meta => appendChild(document.head, meta));
};

/*
 * Merge links
 * Merges incoming links with old links
 */
export const mergeLinks = () => {
  merge(newPageLinks, oldPageLinks, false);
};

/*
 * Merge modules
 * Merges incoming modules with old modules
 */
export const mergeModules = () => {
  merge(newPageModules, oldPageModules, true);
};

/*
 * Merge Attributes
 * Elements that are marked as `data-bold-merge` will have attributes merged
 */
export const mergeAttributes = () => {
  newPageMerge.forEach(newMergeElement => {
    const oldMergeElement = oldPageMerge.find(
      oleMerge => oleMerge.dataset.boltMerge === newMergeElement.dataset.boltMerge
    );

    if (oldMergeElement) {
      const newAttributes = newMergeElement.attributes;
      const oldAttributes = oldMergeElement.attributes;

      // Wipe the Old elements attributes
      for (let i = 0; i < oldAttributes.length; i++) {
        setAttribute(oldMergeElement, oldAttributes[i].name, '');
      }

      // Merge our new attributes
      for (let i = 0; i < newAttributes.length; i++) {
        setAttribute(oldMergeElement, newAttributes[i].name, newAttributes[i].value);
      }
    } else {
      appendChild(newPageDOM.body, newMergeElement);
    }
  });
};

/*
 * Merge Scripts
 * Merge incoming scripts with old scripts
 */
export const mergeScripts = ({ onLoadProgress }) => {
  return new Promise(async (resolve, reject) => {
    // Remove old Scripts
    oldPageScripts.map(oldScript => {
      oldScript.remove();
    });

    // Inject new Scripts
    const newScripts = [];
    let scriptsLoaded = 0;
    newPageScripts.map(newScript => {
      let newScriptSrc = newScript.src;
      newScripts.push(
        new Promise(async (resolve, reject) => {
          const script = createElement(document, 'script');

          script.onload = () => {
            resolve();
          };

          // Always assign a type
          script.type = newScript.type ? newScript.type : 'text/javascript';

          // If the script is inline or not
          if (newScriptSrc) {
            const cache = Math.round(Math.random() * 1000);
            script.src =
              newScriptSrc.indexOf('?') > -1
                ? `${newScriptSrc}&=${cache}`
                : `${newScriptSrc}?=${cache}`;
          }
          if (!newScriptSrc) {
            script.text = newScript.text;
            resolve();
          }

          appendChild(document.body, script);
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

/*
 * Replace
 * Replace elements marked as `data-bolt`
 *
 * We need to first determine if we are swapping elements, if we match we replace.
 * if the incoming element doesn't exist then we create and insert around where it originally was
 *
 * After the insert we need to check to see if we need to remove the wrapper if it doesn't exist on the incoming page.
 */
export const replace = () => {
  newPageRouters.forEach(newRouteWrapper => {
    const oldRouterWrapper = oldPageRouters.find(
      oldWrapper => oldWrapper.dataset.bolt === newRouteWrapper.dataset.bolt
    );

    if (oldRouterWrapper) {
      oldRouterWrapper.replaceWith(newRouteWrapper);
    } else {
      const targetIndex = [...newPageDOM.body.children].indexOf(newRouteWrapper);
      document.body.insertBefore(newRouteWrapper, oldPageDOM.body.children[targetIndex]);
    }
  });

  oldPageRouters.forEach(oldRouterWrapper => {
    const newRouterWapper = newPageRouters.find(
      newWrapper => newWrapper.dataset.bolt === oldRouterWrapper.dataset.bolt
    );

    if (!newRouterWapper) {
      oldRouterWrapper.remove();
    }
  });
};

/*
 * Prefetch Asset
 * Creates links to preload incoming assets marked as `data-bolt-prefetch`
 */
export const prefetchAsset = (asset, as) => {
  if (!asset) return;
  const prefetchAsset = createElement(document, 'link');
  prefetchAsset.rel = 'preload';
  prefetchAsset.href = asset;
  prefetchAsset.as = as;
  const element = appendChild(document.head, prefetchAsset);
  return element;
};

/*
 * Prefetch Assets
 * Finds all elements marked as `data-bolt-prefetch` and determines type and if it can load.
 *
 * Supported file types:
 * - Image
 * - Video
 * - Audio
 *
 * Note if a div is set as prefetch we will look for a background image to load.
 */
export const prefetchAssets = () => {
  prefetch = [...qAll(newPageDOM, `[${selectors.BOLT_PREFETCH}]`)].map(element => {
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
