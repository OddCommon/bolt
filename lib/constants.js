export const events = {
  PREFETCH_BEFORE: 'prefetch-before',
  PREFETCH_COMPLETE: 'prefetch-complete',

  NAVIGATE_POP_BEFORE: 'navigate-pop-before',
  NAVIGATE_BEFORE: 'navigate-before',
  NAVIGATE_COMPLETE: 'navigate-complete',

  RENDER_TIMEOUT: 'render-timeout',
  RENDER_BEFORE: 'render-before',
  RENDER_COMPLETE: 'render-complete',

  LOADING: 'loading',
  LOAD_PROGRESS: 'load-progress',
  LOAD_COMPLETE: 'load-complete',

  BOLT_COMPLETE: 'bolt-complete',
};

export const selectors = {
  BOLT_ROUTER: 'data-bolt',
  BOLT_LINK: 'data-bolt-link',
  BOLT_MERGE: 'data-bolt-merge',
  BOLT_PREFETCH: 'data-bolt-prefetch',
  BOLT_PROTECT: 'data-bolt-protect',
  BOLT_STATIC: 'data-bolt-static',
};

export const mouseEvents = ['mouseover', 'touchstart'];
