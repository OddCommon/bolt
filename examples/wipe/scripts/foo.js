function init() {

    let logo = document.querySelector("#logo");
    logo.style.backgroundColor = "red";
    BoltRouter.once('before-navigate', () => {
        logo.style.backgroundColor = "white";
    })
}
init();