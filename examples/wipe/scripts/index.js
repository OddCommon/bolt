let wrapper = document.querySelector('#wrapper');
let transition = document.querySelector('#transition-wipe');
let inTransit = false;

const handleBeforeNaviate = () => {
    console.log("Before Navigate")
    transition.classList.add('in');
    wrapper.classList.remove('active');
    transition.addEventListener('transitionend', inTransitionComplete);
}

const inTransitionComplete = () => {
    console.log("In Transition Complete")
    BoltRouter.resume();
    transition.classList.add('out');
    transition.removeEventListener('transitionend', inTransitionComplete);
}

const handlePreRender = () => {
    console.log("Pre Render");
    BoltRouter.pause();
}

const handleRenderComplete = () => {
    console.log("Render Complete")
    window.scrollTo(0, 0);
}

const handleLoaded = () => {
    console.log("Load Complete")
    transition.classList.add('out');
    wrapper = document.querySelector('#wrapper');
    transition.addEventListener('transitionend', cleanup);
}

const cleanup = () => {
    transition.classList.remove('out');
    transition.classList.remove('in');
    wrapper.classList.add('active');
    transition.removeEventListener('transitionend', cleanup);
}

document.addEventListener("DOMContentLoaded", (event) => {
    wrapper.classList.add('active');
    BoltRouter.on('before-navigate', handleBeforeNaviate);
    BoltRouter.on('before-render', handlePreRender);
    BoltRouter.on('render-complete', handleRenderComplete);
    BoltRouter.on('load-complete', handleLoaded);
});