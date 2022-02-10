import { selectors } from './constants';

const parser = new DOMParser();

let busy = false;

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

// Set the DOM to busy
export const toggleDOMBusy = () => {
  document.documentElement.ariaBusy = !busy;
};

export const parseNewPage = html => {
  newPage.DOM = parser.parseFromString(html, 'text/html');
  newPage.Title = newPage.DOM.title;
  newPage.Routers = [...newPage.DOM.querySelectorAll(`[${selectors.BOLT_ROUTER}]`)];
  newPage.Scripts = [...newPage.DOM.querySelectorAll('script')];
  newPage.Meta = [...newPage.DOM.querySelectorAll('meta')];
  newPage.Links = [...newPage.DOM.querySelectorAll('link')].filter(l => {
    l.rel !== 'modulepreload';
  });
  newPage.Modules = [...newPage.DOM.querySelectorAll('module')].filter(l => {
    l.rel === 'modulepreload';
  });
  newPage.Merge = [...newPage.DOM.querySelectorAll(`[${selectors.BOLT_MERGE}]`)];
  newPage.Prefetch = [...newPage.DOM.querySelectorAll(`[${selectors.BOLT_PREFETCH}]`)];

  return newPage;
};

export const cacheCurrentPage = () => {
  oldPage.DOM = document;
  oldPage.Routers = [...oldPage.DOM.querySelectorAll(`[${selectors.BOLT_ROUTER}]`)];
  oldPage.Scripts = [...oldPage.DOM.querySelectorAll('script')];
  oldPage.Meta = [...oldPage.DOM.querySelectorAll('meta')];
  oldPage.Links = [...oldPage.DOM.querySelectorAll('link')].filter(l => {
    l.rel !== 'modulepreload';
  });
  oldPage.Modules = [...oldPage.DOM.querySelectorAll('link')].filter(l => {
    l.rel === 'modulepreload';
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
      let oldScriptSrc = oldScript.src;
      const retain = oldScriptSrc
        ? newPage.Scripts.find(newScript => newScript.src === oldScriptSrc)
        : newPage.Scripts.find(newScript => !newScript.src && newScript.text === oldScript.text);
      if (!retain) {
        oldScript.remove();
      }
    });

    // Inject new Scripts
    const newScripts = [];
    let scriptsLoaded = 0;
    newPage.Scripts.map(newScript => {
      let newScriptSrc = newScript.src;
      const retain = newScriptSrc
        ? oldPage.Scripts.find(oldScript => oldScript.src === newScriptSrc)
        : oldPage.Scripts.find(oldScript => !oldScript.src && oldScript.text === newScript.text);

      if (!retain) {
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
            onLoadProgress({ total: newScripts.length, complete: scriptsLoaded });
          })
        );
      }
    });

    onLoadProgress({ total: newScripts.length, complete: 0 });
    await Promise.all(newScripts).then(() => {
      resolve();
    });
  });
};

export const replace = () => {
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
  document.head.appendChild(prefetchAsset);
};

export const prefetchAssets = () => {
  console.log(newPage.DOM);
  console.log(newPage.DOM.querySelectorAll(`[${selectors.BOLT_PREFETCH}]`));
  const prefetch = [...newPage.DOM.querySelectorAll(`[${selectors.BOLT_PREFETCH}]`)].map(
    element => {
      switch (element.tagName) {
        case 'DIV':
          prefetchAsset(
            element.style['background-image'].replace(`url("`, '').replace(`")`, ''),
            'image'
          );
          break;
        case 'IMG':
          prefetchAsset(element.src, 'image');
          break;
        case 'VIDEO':
          prefetchAsset(element.src, 'video');
          break;
        case 'AUDIO':
          prefetchAsset(element.src, 'audio');
          break;
        default:
          console.warn('This resource is not supported');
          break;
      }
    }
  );
};
