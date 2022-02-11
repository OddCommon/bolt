import Router from '../../../build/bolt.module.js';
window.BoltRouter = new Router();

let wrapper = document.querySelector('main');
let transition = document.querySelector('#transition-wipe');

const handleNavigatePopBefore = e => {
  // BoltRouter.pause();
  transition.classList.add('in');
  wrapper.classList.remove('active');
  transition.addEventListener('transitionend', inTransitionComplete);

  BoltRouter.off('navigate-before', handleBeforeNaviate);
};

const handleBeforeNaviate = event => {
  BoltRouter.resume();
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
  wrapper = document.querySelector('main');
  transition.addEventListener('transitionend', cleanup);
};

const cleanup = () => {
  console.log('Out Transition Complete');
  BoltRouter.unlock();

  transition.classList.remove('out');
  transition.classList.remove('in');
  wrapper.classList.add('active');
  transition.removeEventListener('transitionend', cleanup);

  BoltRouter.off('navigate-before', handleBeforeNaviate);
  BoltRouter.on('navigate-before', handleBeforeNaviate);
};

document.addEventListener('DOMContentLoaded', event => {
  wrapper.classList.add('active');
  BoltRouter.on('navigate-pop-before', handleNavigatePopBefore);
  BoltRouter.on('navigate-before', handleBeforeNaviate);
  BoltRouter.on('navigate-complete', handleNavigateComplete);
  BoltRouter.on('render-before', handlePreRender);
  BoltRouter.on('render-complete', handleRenderComplete);
  BoltRouter.on('load-complete', handleLoaded);
});
