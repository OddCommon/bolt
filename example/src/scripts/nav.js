class Nav {
  constructor() {
    this._$switch = document.querySelector('#switch');
    this._$activeLink = document.querySelector('#active-link');
    this._$headerContent = document.querySelector('#header_content');
    this._$examplesLink = document.querySelector(`a[href='/link-example/']`);
    this._$featuresLink = document.querySelector(`a[href='/features/']`);
    this._$eventsLink = document.querySelector(`a[href='/events/']`);

    if (localStorage.getItem('bolt-on')) {
      this.toggleOn();
    } else {
      this.toggleOff();
    }

    this.observe();
    this.setActivePage(window.location.pathname);
  }

  observe() {
    this._$switch.addEventListener('click', () => {
      if (this._$switch.classList.contains('active')) {
        this.toggleOff();
      } else {
        this.toggleOn();
      }
    });

    BoltRouter.on('navigate-before', ({ to, from }) => {
      this.setActivePage(to);
    });
  }

  setActivePage(page) {
    const offset = this._$headerContent.getBoundingClientRect().left;
    if (page.indexOf('example') > -1) {
      const element = this._$examplesLink.getBoundingClientRect();
      const position = element.left - offset;
      const width = element.width;

      this._$activeLink.style.left = `${position}px`;
      this._$activeLink.style.width = `${width}px`;
      this._$activeLink.style.opacity = 1;
    }
    if (page.indexOf('features') > -1) {
      const element = this._$featuresLink.getBoundingClientRect();
      const position = element.left - offset;
      const width = element.width;

      this._$activeLink.style.left = `${position}px`;
      this._$activeLink.style.width = `${width}px`;
      this._$activeLink.style.opacity = 1;
    }
    if (page.indexOf('events') > -1) {
      const element = this._$eventsLink.getBoundingClientRect();
      const position = element.left - offset;
      const width = element.width;

      this._$activeLink.style.left = `${position}px`;
      this._$activeLink.style.width = `${width}px`;
      this._$activeLink.style.opacity = 1;
    }
    if (page === '/' || page === '/fin/') {
      this._$activeLink.style.opacity = 0;
      this._$activeLink.style.left = `${offset}px`;
      this._$activeLink.style.width = `0px`;
    }
  }

  toggleOn() {
    this._$switch.classList.add('active');
    BoltRouter.initialize();
    localStorage.setItem('bolt-on', true);
  }
  toggleOff() {
    this._$switch.classList.remove('active');
    BoltRouter.disable();
    localStorage.removeItem('bolt-on');
  }
}

export default Nav;
