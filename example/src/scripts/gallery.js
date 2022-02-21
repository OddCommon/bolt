class Gallery {
  constructor() {
    this.initialize();
    setTimeout(() => {
      this.gallery.classList.add('active');
    }, 500);
  }

  initialize() {
    this.gallery = document.querySelector('.features-gallery');
    this.images = [...this.gallery.querySelectorAll('.image')];
    this.images.forEach((image, index) => {
      setTimeout(() => {
        image.classList.add('active');
      }, index * 125);
    });

    this.images[this.images.length - 1].addEventListener('transitionend', () => {
      BoltRouter.resume();
    });

    BoltRouter.once('navigate-before', ({ to }) => {
      if (to === '/features-3/' || to === '/features-4/') {
        BoltRouter.pause();
        this.images.reverse().forEach((image, index) => {
          setTimeout(() => {
            image.classList.remove('active');
          }, index * 125);
        });
      }
    });
  }
}

new Gallery();
