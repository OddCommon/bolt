var logo = document.querySelector('#logo');
logo.style.backgroundColor = 'green';
BoltRouter.on('before-navigate', () => {
  logo.style.backgroundColor = 'white';
});
BoltRouter.on('before-render', () => {
  window.Page = null;
});
