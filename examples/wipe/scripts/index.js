import Router from '../../../build/bolt.module.js';
window.Bolt = new Router();

let wrapper = document.querySelector('main');
let transition = document.querySelector('#transition-wipe');

const handleNavigatePopBefore = e => {
  // Bolt.pause();
  transition.classList.add('in');
  wrapper.classList.remove('active');
  transition.addEventListener('transitionend', inTransitionComplete);

  Bolt.off('navigate-before', handleBeforeNaviate);
};

const handleBeforeNaviate = event => {
  Bolt.resume();
  console.log(`Bolt: Before Navigate: to: ${event.to} from: ${event.from}`);
  transition.classList.add('in');
  wrapper.classList.remove('active');
  transition.addEventListener('transitionend', inTransitionComplete);
};

const handleNavigateComplete = event => {
  console.log(`Bolt: Navigate Complete - to: ${event.to} from: ${event.from}`);
};

const inTransitionComplete = () => {
  console.log('In Transition Complete');
  Bolt.resume();
  transition.classList.add('out');
  transition.removeEventListener('transitionend', inTransitionComplete);
};

const handlePreRender = () => {
  console.log('Bolt: Pre Render');
  Bolt.pause();
};

const handleRenderComplete = () => {
  console.log('Bolt: Render Complete');
  // window.scrollTo(0, 0);
};

const handleLoaded = () => {
  console.log('Bolt: Load Complete');
  Bolt.lock();

  transition.classList.add('out');
  wrapper = document.querySelector('main');
  transition.addEventListener('transitionend', cleanup);
};

const cleanup = () => {
  console.log('Out Transition Complete');
  Bolt.unlock();

  transition.classList.remove('out');
  transition.classList.remove('in');
  wrapper.classList.add('active');
  transition.removeEventListener('transitionend', cleanup);

  Bolt.off('navigate-before', handleBeforeNaviate);
  Bolt.on('navigate-before', handleBeforeNaviate);
};

document.addEventListener('DOMContentLoaded', event => {
  wrapper.classList.add('active');
  Bolt.on('navigate-pop-before', handleNavigatePopBefore);
  Bolt.on('navigate-before', handleBeforeNaviate);
  Bolt.on('navigate-complete', handleNavigateComplete);
  Bolt.on('render-before', handlePreRender);
  Bolt.on('render-complete', handleRenderComplete);
  Bolt.on('load-complete', handleLoaded);
});
