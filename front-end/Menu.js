
const openBtn = document.getElementById("local-button");

const onlineBtn = document.getElementById("online-button");

const logInBtn = document.getElementById("log-in-button");

const signUpBtn = document.getElementById("sign-up-button");

const closeBtn = document.getElementById("closeModal");

const closeOnlineMenuBtn = document.getElementById("closeOnlineMenuModal");

const closeLogInBtn = document.getElementById("closeLogInModal");

const closeSignUpBtn = document.getElementById("closeSignUpModal")

const modal = document.getElementById('modal');

const onlineMenuModal = document.getElementById('online-menu-modal');

const logInModal = document.getElementById("log-in-modal");

const signUpModal = document.getElementById("sign-up-modal");

openBtn.addEventListener("click", () => {

    modal.classList.add("open");
});

closeBtn.addEventListener("click",() => {

    modal.classList.remove("open");
   
});

onlineBtn.addEventListener("click", () => {

    onlineMenuModal.classList.add("open");
});

closeOnlineMenuBtn.addEventListener("click",() => {

    onlineMenuModal.classList.remove("open");
   
});

logInBtn.addEventListener("click", () =>{

    logInModal.classList.add("open");
});

closeLogInBtn.addEventListener("click", () => {

    logInModal.classList.remove("open");
});

signUpBtn.addEventListener("click", () =>{

    logInModal.classList.remove("open");

    signUpModal.classList.add("open");
});

closeSignUpBtn.addEventListener("click", () => {

    signUpModal.classList.remove("open");

    logInModal.classList.add("open");
});