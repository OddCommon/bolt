class Homepage {
  constructor() {
    var logo = document.querySelector('#logo');
    logo.style.backgroundColor = 'red';

    BoltRouter.on('before-navigate', () => {
      logo.style.backgroundColor = 'white';
    });
    BoltRouter.on('before-render', () => {
      window.Page = null;
    });
  }
}

new Homepage();
