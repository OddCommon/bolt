const _$whiteWipe = document.querySelector('#white-wipe');
const _$blackWipe = document.querySelector('#black-wipe');
const events = [];

/*
 * Set Transition
 * Adds classes to specified element, then returns a promise
 * Once complete we resolve the promise.
 *
 * params:
 * element: DOM Element
 * classes: Array - Array of classes to attach
 */
const setTransition = (element, classes) => {
  return new Promise(resolve => {
    const complete = () => {
      resolve();
      element.removeEventListener('transitionend', complete);
    };
    element.addEventListener('transitionend', complete);
    events.push({ element: element, callback: complete });
    classes.map(c => element.classList.add(c));
  });
};

/*
 * Remove Classes
 * Removes classes from an element
 */
const removeClasses = (element, classes) => {
  classes.map(c => element.classList.remove(c));
};

const reset = () => {
  events.map(event => {
    event.element.removeEventListener('transitionend', event.callback);
  });
  BoltRouter.unlock();
  BoltRouter.resume();
  removeClasses(_$blackWipe, ['fade-out', 'transition', 'active', 'solid']);
  removeClasses(_$whiteWipe, ['fade-out', 'transition', 'active', 'solid']);
};

export const whiteToBlackTransition = async () => {
  reset();
  BoltRouter.pause();
  BoltRouter.once('bolt-complete', async () => {
    await setTransition(_$blackWipe, ['fade-out']);
    reset();
  });

  await setTransition(_$whiteWipe, ['active', 'transition']);
  removeClasses(_$whiteWipe, ['active']);
  await setTransition(_$blackWipe, ['active', 'transition', 'solid']);
  removeClasses(_$whiteWipe, ['transition']);
  BoltRouter.resume();
};

export const blackToWhiteTransition = async () => {
  reset();
  BoltRouter.pause();
  BoltRouter.once('bolt-complete', async () => {
    await setTransition(_$whiteWipe, ['fade-out']);
    reset();
  });

  await setTransition(_$blackWipe, ['active', 'transition']);
  removeClasses(_$blackWipe, ['active']);
  await setTransition(_$whiteWipe, ['active', 'transition', 'solid']);
  removeClasses(_$blackWipe, ['transition']);
  BoltRouter.resume();
};
