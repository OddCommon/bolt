const basicLink = document.querySelector('#basic-link');
basicLink.addEventListener('click', () => {
  localStorage.setItem('clock', new Date().getTime());
});
