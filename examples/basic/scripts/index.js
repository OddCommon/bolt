let wrapper = document.querySelector('#wrapper');
let transition = document.querySelector('#transition-wipe');
let resumeRender;
let loaded = false;

const handleTransition = () => {
    loaded = false;
    console.log("Naviagte Starting");
    transition.classList.remove('out');
    transition.classList.add('in');
    wrapper.classList.remove('active');
    transition.addEventListener('transitionend', transitionReady);
}

const handlePreRender = (e) => {
    console.log("Pre Render")
    transition.classList.remove('out');
    transition.classList.remove('in');

    BoltRouter.pause();
    transition.classList.add('in');
    wrapper.classList.remove('active');
    transition.addEventListener('transitionend', transitionReady);
}

const transitionReady = () => {
    console.log("transition ready")
    if( !loaded ){
        transition.classList.add('out');
        transition.removeEventListener('transitionend', transitionReady);
    }
    BoltRouter.resume();
}

const handleLoaded = () => {
    loaded = true;
    console.log("Loaded")
    transition.classList.add('out');
    transition.removeEventListener('transitionend', transitionReady);
    window.scrollTo(0, 0);
}

const cleanUp = () => {
    transition.classList.remove('out');
    transition.classList.remove('in');
    transition.removeEventListener('transitionend', cleanUp);
}
const renderComplete = () => {
    console.log("render complete")
    wrapper = document.querySelector('#wrapper');
    transition.classList.remove('in');
    wrapper.classList.add('active');
    transition.addEventListener('transitionend', cleanUp); 
}

document.addEventListener("DOMContentLoaded", (event) => {
    wrapper.classList.add('active');
    BoltRouter.on('common:before-navigate', handleTransition);
    BoltRouter.on('common:before-render', handlePreRender);
    BoltRouter.on('common:render-complete', renderComplete);
    BoltRouter.on('common:load-complete', handleLoaded);
});