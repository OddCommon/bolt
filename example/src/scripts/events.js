class Events {
  constructor() {
    this._$wrapper = document.querySelector('.events-content');
    this._$flow = document.querySelector('.events-flow');
    this._$step = this._$flow.querySelector('h3');
    this._$button = document.querySelector('#events-button');
    this._bypass = false;
    this._$wrapper.classList.add('active');
    setTimeout(() => {
      this.activate();
    }, 500);
  }

  next() {
    BoltRouter.resume();
  }

  activate() {
    BoltRouter.once('navigate-pop-before', () => {
      BoltRouter.resume();
      this._bypass = true;
    });
    BoltRouter.once('navigate-before', ({ to, from }) => {
      if (to != '/events-2/') this._bypass = true;
      if (!this._bypass) BoltRouter.pause();
      this._$step.innerText = 'navigate-before';
      this._$button.addEventListener('click', this.next);
    });
    BoltRouter.once('navigate-complete', () => {
      if (!this._bypass) BoltRouter.pause();
      this._$step.innerText = 'navigate-complete';
    });
    BoltRouter.once('render-before', () => {
      if (!this._bypass) BoltRouter.pause();
      this._$step.innerText = 'render-before';
    });
    BoltRouter.once('loading', () => {
      if (!this._bypass) BoltRouter.pause();
      this._$step.innerText = 'loading';
    });
    BoltRouter.once('load-progress', () => {
      if (!this._bypass) BoltRouter.pause();
      this._$step.innerText = 'load-progress';
    });
    BoltRouter.once('load-complete', () => {
      this._$step.innerText = 'load-complete';
      BoltRouter.unlock();
      BoltRouter.resume();
    });
  }
}

new Events();
