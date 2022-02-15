class Homepage {
  constructor() {
    var logo = document.querySelector('#logo');
    logo.style.backgroundColor = 'red';

    Bolt.on('before-navigate', () => {
      logo.style.backgroundColor = 'white';
    });
    Bolt.on('before-render', () => {
      window.Page = null;
    });
  }
}

new Homepage();
