var logo = document.querySelector('#logo');
logo.style.backgroundColor = 'yellow';
Bolt.on('before-navigate', () => {
  logo.style.backgroundColor = 'white';
});
Bolt.on('before-render', () => {
  window.Page = null;
});
