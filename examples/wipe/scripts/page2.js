var logo = document.querySelector('#logo');
logo.style.backgroundColor = 'yellow';
BoltRouter.on('before-navigate', () => {
  logo.style.backgroundColor = 'white';
});
BoltRouter.on('before-render', () => {
  window.Page = null;
});
