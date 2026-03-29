// const openBtn = document.getElementById("local-button");

// const aiOpenBtn = document.getElementById("Play-with-AI");

// const joinRoomBtn = document.getElementById("join-room-button");

// const createRoomBtn = document.getElementById("create-room-button");

// const onlineBtn = document.getElementById("online-button");

// const logInBtn = document.getElementById("log-in-button");

// const signUpBtn = document.getElementById("sign-up-button");

// const closeBtn = document.getElementById("closeModal");

// const closeAiBtn = document.getElementById("closeAiMenuModal");

// const closeJoinRoomBtn = document.getElementById("closeJoinRoomModal");

// const closeCreateRoomBtn = document.getElementById("closeCreateRoomModal");

// const closeOnlineMenuBtn = document.getElementById("closeOnlineMenuModal");

// const closeLogInBtn = document.getElementById("closeLogInModal");

// const closeSignUpBtn = document.getElementById("closeSignUpModal");

// const modal = document.getElementById("modal");

// const aiMenuModal = document.getElementById("ai-menu-modal");

// const joinRoomModal = document.getElementById("join-room-modal");

// const createRoomModal = document.getElementById("create-room-modal");

// const onlineMenuModal = document.getElementById("online-menu-modal");

// const logInModal = document.getElementById("log-in-modal");

// const signUpModal = document.getElementById("sign-up-modal");

// openBtn.addEventListener("click", () => {
//   modal.classList.add("open");
// });

// closeBtn.addEventListener("click", () => {
//   modal.classList.remove("open");
// });

// aiOpenBtn.addEventListener("click", () => {
//   modal.classList.remove("open");

//   aiMenuModal.classList.add("open");
// });

// closeAiBtn.addEventListener("click", () => {
//   aiMenuModal.classList.remove("open");

//   modal.classList.add("open");
// });

// joinRoomBtn.addEventListener("click", () => {
//   onlineMenuModal.classList.remove("open");

//   joinRoomModal.classList.add("open");
// });

// closeJoinRoomBtn.addEventListener("click", () => {
//   joinRoomModal.classList.remove("open");

//   onlineMenuModal.classList.add("open");
// });

// createRoomBtn.addEventListener("click", () => {
//   onlineMenuModal.classList.remove("open");

//   createRoomModal.classList.add("open");
// });

// closeCreateRoomBtn.addEventListener("click", () => {
//   createRoomModal.classList.remove("open");

//   onlineMenuModal.classList.add("open");
// });

// onlineBtn.addEventListener("click", () => {
//   onlineMenuModal.classList.add("open");
// });

// closeOnlineMenuBtn.addEventListener("click", () => {
//   onlineMenuModal.classList.remove("open");
// });

// logInBtn.addEventListener("click", () => {
//   logInModal.classList.add("open");
// });

// closeLogInBtn.addEventListener("click", () => {
//   logInModal.classList.remove("open");
// });

// signUpBtn.addEventListener("click", () => {
//   logInModal.classList.remove("open");

//   signUpModal.classList.add("open");
// });

// closeSignUpBtn.addEventListener("click", () => {
//   signUpModal.classList.remove("open");

//   logInModal.classList.add("open");
// });

// login handler
// Login Function
// const loginBtnSubmit = document.querySelector(".inner-login-button");

// loginBtnSubmit.addEventListener("click", async () => {
//   const username = document.querySelector(
//     "#log-in-modal .username-input",
//   ).value;
//   const password = document.querySelector(
//     "#log-in-modal .password-input",
//   ).value;

//   if (!username || !password) {
//     alert("Please fill in all fields");
//     return;
//   }

//   try {
//     const response = await fetch("http://localhost:3000/login", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ username, password }),
//     });

//     const data = await response.json();

//     if (response.ok) {
//       alert(data.message);
//       // save token in localStorage for future requests
//       localStorage.setItem("token", data.token);
//       document.getElementById("log-in-modal").classList.remove("open");
//       document.getElementById("online-menu-modal").classList.add("open");
//     } else {
//       alert(data.message);
//     }
//   } catch (err) {
//     console.error(err);
//     alert("Something went wrong with login.");
//   }
// });

//Signingup handler
//signup function
// const signUpBtnSubmit = document.querySelector(".inner-signup-button");

// signUpBtnSubmit.addEventListener("click", async () => {
//   const username = document.querySelector(
//     "#sign-up-modal .username-input",
//   ).value;
//   const email = document.querySelector("#sign-up-modal .email-input").value;
//   const password = document.querySelector(
//     "#sign-up-modal .password-input",
//   ).value;

//   if (!username || !email || !password) {
//     alert("Please fill in all fields");
//     return;
//   }

//   try {
//     const response = await fetch("http://localhost:3000/register", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ username, email, password }),
//     });

//     const data = await response.json();

//     if (response.ok) {
//       alert(data.message);
//       document.getElementById("sign-up-modal").classList.remove("open");
//       document.getElementById("log-in-modal").classList.add("open");
//     } else {
//       alert(data.message);
//     }
//   } catch (err) {
//     console.error(err);
//     alert("Something went wrong with sign-up.");
//   }
// });

//room creation

// const joinRoomSubmitBtn = document.querySelector(
//   "#join-room-modal .join-button",
// );
// const codeDisplay = document.querySelector(".code-display-text");
// const joinInput = document.querySelector("#join-room-modal .input-bar");

document.addEventListener("DOMContentLoaded", () => {
  //DOM Elements
  const openBtn = document.getElementById("local-button");
  const aiOpenBtn = document.getElementById("Play-with-AI");
  const joinRoomBtn = document.getElementById("join-room-button");
  const createRoomBtn = document.getElementById("create-room-button");
  const onlineBtn = document.getElementById("online-button");
  const logInBtn = document.getElementById("log-in-button");
  const signUpBtn = document.getElementById("sign-up-button");

  const closeBtn = document.getElementById("closeModal");
  const closeAiBtn = document.getElementById("closeAiMenuModal");
  const closeJoinRoomBtn = document.getElementById("closeJoinRoomModal");
  const closeCreateRoomBtn = document.getElementById("closeCreateRoomModal");
  const closeOnlineMenuBtn = document.getElementById("closeOnlineMenuModal");
  const closeLogInBtn = document.getElementById("closeLogInModal");
  const closeSignUpBtn = document.getElementById("closeSignUpModal");

  const modal = document.getElementById("modal");
  const aiMenuModal = document.getElementById("ai-menu-modal");
  const joinRoomModal = document.getElementById("join-room-modal");
  const createRoomModal = document.getElementById("create-room-modal");
  const onlineMenuModal = document.getElementById("online-menu-modal");
  const logInModal = document.getElementById("log-in-modal");
  const signUpModal = document.getElementById("sign-up-modal");

  const codeDisplay = document.querySelector(".code-display-text");
  const joinInput = document.querySelector("#join-room-modal .input-bar");
  const joinRoomSubmitBtn = document.querySelector(
    "#join-room-modal .join-button",
  );

  const loginBtnSubmit = document.querySelector(".inner-login-button");
  const signUpBtnSubmit = document.querySelector(".inner-signup-button");

  //Socket.io
  const socket = io("http://localhost:3000");

  //Modal Logic
  openBtn.addEventListener("click", () => modal.classList.add("open"));
  closeBtn.addEventListener("click", () => modal.classList.remove("open"));

  aiOpenBtn.addEventListener("click", () => {
    modal.classList.remove("open");
    aiMenuModal.classList.add("open");
  });
  closeAiBtn.addEventListener("click", () => {
    aiMenuModal.classList.remove("open");
    modal.classList.add("open");
  });

  joinRoomBtn.addEventListener("click", () => {
    onlineMenuModal.classList.remove("open");
    joinRoomModal.classList.add("open");
  });
  closeJoinRoomBtn.addEventListener("click", () => {
    joinRoomModal.classList.remove("open");
    onlineMenuModal.classList.add("open");
  });

  createRoomBtn.addEventListener("click", () => {
    onlineMenuModal.classList.remove("open");
    createRoomModal.classList.add("open");
  });
  closeCreateRoomBtn.addEventListener("click", () => {
    createRoomModal.classList.remove("open");
    onlineMenuModal.classList.add("open");
  });

  onlineBtn.addEventListener("click", () =>
    onlineMenuModal.classList.add("open"),
  );
  closeOnlineMenuBtn.addEventListener("click", () =>
    onlineMenuModal.classList.remove("open"),
  );

  logInBtn.addEventListener("click", () => logInModal.classList.add("open"));
  closeLogInBtn.addEventListener("click", () =>
    logInModal.classList.remove("open"),
  );

  signUpBtn.addEventListener("click", () => {
    logInModal.classList.remove("open");
    signUpModal.classList.add("open");
  });
  closeSignUpBtn.addEventListener("click", () => {
    signUpModal.classList.remove("open");
    logInModal.classList.add("open");
  });

  //Login
  loginBtnSubmit.addEventListener("click", async () => {
    const username = document.querySelector(
      "#log-in-modal .username-input",
    ).value;
    const password = document.querySelector(
      "#log-in-modal .password-input",
    ).value;

    if (!username || !password) return alert("Please fill in all fields");

    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        localStorage.setItem("token", data.token);
        logInModal.classList.remove("open");
        onlineMenuModal.classList.add("open");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong with login.");
    }
  });

  //SignUp
  if (signUpBtnSubmit) {
    signUpBtnSubmit.addEventListener("click", async () => {
      const username = document.querySelector(
        "#sign-up-modal .username-input",
      ).value;
      const email = document.querySelector("#sign-up-modal .email-input").value;
      const password = document.querySelector(
        "#sign-up-modal .password-input",
      ).value;

      if (!username || !email || !password)
        return alert("Please fill in all fields");

      try {
        const response = await fetch("http://localhost:3000/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();
        if (response.ok) {
          alert("Registration successful! You can now log in.");
          signUpModal.classList.remove("open");
          logInModal.classList.add("open");
        } else {
          alert(data.message);
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong with sign-up.");
      }
    });
  }

  // Room Creation
  createRoomBtn.addEventListener("click", () => {
    // Ask server to create a room
    socket.emit("create-room");
  });

  // Listen for room code from server
  socket.on("room-created", (code) => {
    codeDisplay.textContent = code; // replaces "CODE DISPLAY HERE"

    createRoomModal.classList.add("open");
  });

  // Join Room
  joinRoomSubmitBtn.addEventListener("click", () => {
    const roomCode = joinInput.value.toUpperCase().trim();
    if (!roomCode) return alert("Enter a room code");

    socket.emit("join-room", roomCode);
  });

  socket.on("joined-room", (code) => {
    alert(`Joined room ${code} successfully!`);
    joinRoomModal.classList.remove("open");
  });

  socket.on("invalid-room", (msg) => alert(msg));
});
