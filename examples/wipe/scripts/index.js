let wrapper = document.querySelector('#wrapper');
let transition = document.querySelector('#transition-wipe');
let loaded = false;

const handleBeforeNaviate = () => {
    console.log("Before Navigate")
    transition.classList.add('in');
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
    transition.classList.add('out');
    wrapper = document.querySelector('#wrapper');
    transition.addEventListener('transitionend', cleanup);
}

const handleLoaded = () => {
    loaded = true;
    console.log("Load Complete")
    wrapper.classList.add('active');
}

const cleanup = () => {
    transition.classList.remove('out');
    transition.classList.remove('in');
    transition.removeEventListener('transitionend', cleanup);
}


document.addEventListener("DOMContentLoaded", (event) => {
    wrapper.classList.add('active');
    BoltRouter.on('common:before-navigate', handleBeforeNaviate);
    BoltRouter.on('common:before-render', handlePreRender);
    BoltRouter.on('common:render-complete', handleRenderComplete);
    BoltRouter.on('common:load-complete', handleLoaded);
});