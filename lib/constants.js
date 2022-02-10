export const events = {
  PREFETCH_BEFORE: 'prefetch-before',
  PREFETCH_COMPLETE: 'prefetch-complete',

  NAVIGATE_BEFORE: 'navigate-before',
  NAVIGATE_COMPLETE: 'navigate-complete',

  RENDER_BEFORE: 'render-before',
  RENDER_COMPLETE: 'render-complete',

  LOADING: 'loading',
  LOAD_PROGRESS: 'load-progress',
  LOAD_COMPLETE: 'load-complete',
};

export const selectors = {
  BOLT_ROUTER: 'data-bolt',
  BOLT_LINK: 'data-bolt-link',
  BOLT_MERGE: 'data-bolt-merge',
  BOLT_PREFETCH: 'data-bolt-prefetch',
};

export const strategies = {
  DEFAULT: 'default',
  PROGRESSIVE: 'progressive',
  AGRESSIVE: 'agressive',
};