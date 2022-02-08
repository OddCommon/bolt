window.BoltRouter = new BoltRouter();

let wrapper = document.querySelector('#wrapper');
let transition = document.querySelector('#transition-wipe');

const handleBeforeNaviate = event => {
  BoltRouter.resume();
  console.log(`Bolt: Before Navigate: to: ${event.to} from: ${event.from}`);
  transition.classList.add('in');
  wrapper.classList.remove('active');
  transition.addEventListener('transitionend', inTransitionComplete);
};

const inTransitionComplete = () => {
  console.log('In Transition Complete');
  BoltRouter.resume();
  transition.classList.add('out');
  transition.removeEventListener('transitionend', inTransitionComplete);
};

const handlePreRender = () => {
  console.log('Bolt: Pre Render');
  BoltRouter.pause();
};

const handleRenderComplete = () => {
  console.log('Bolt: Render Complete');
  window.scrollTo(0, 0);
};

const handleLoaded = () => {
  console.log('Bolt: Load Complete');
  BoltRouter.lock();

  transition.classList.add('out');
  wrapper = document.querySelector('#wrapper');
  transition.addEventListener('transitionend', cleanup);
};

const cleanup = () => {
  console.log('Out Transition Complete');
  BoltRouter.unlock();

  transition.classList.remove('out');
  transition.classList.remove('in');
  wrapper.classList.add('active');
  transition.removeEventListener('transitionend', cleanup);
};

document.addEventListener('DOMContentLoaded', event => {
  wrapper.classList.add('active');
  BoltRouter.on('before-navigate', handleBeforeNaviate);
  BoltRouter.on('before-render', handlePreRender);
  BoltRouter.on('render-complete', handleRenderComplete);
  BoltRouter.on('load-complete', handleLoaded);
});
