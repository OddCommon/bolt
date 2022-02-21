const start = localStorage.getItem('clock');
const end = new Date().getTime();
const time = document.querySelector('#time');
time.innerHTML = `${end - start}ms`;
