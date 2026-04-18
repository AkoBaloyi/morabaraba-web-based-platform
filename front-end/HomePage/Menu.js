document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
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

  // SOCKET
  const socket = io("http://localhost:3000");

  /* ---------------- MODALS ---------------- */

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

  /* ---------------- LOGIN ---------------- */

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
        localStorage.setItem("username", username);

        logInModal.classList.remove("open");
        onlineMenuModal.classList.add("open");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Login failed.");
    }
  });

  /* ---------------- SIGNUP ---------------- */

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
          alert("Registration successful!");

          signUpModal.classList.remove("open");
          logInModal.classList.add("open");
        } else {
          alert(data.message || data.error);
        }
      } catch (err) {
        console.error(err);
        alert("Signup failed.");
      }
    });
  }

  /* ---------------- CREATE ROOM ---------------- */

  createRoomBtn.addEventListener("click", () => {
    socket.emit("create-room");
  });

  socket.on("room-created", (code) => {
    codeDisplay.textContent = code;
    createRoomModal.classList.add("open");
  });

  /* ---------------- JOIN ROOM ---------------- */

  joinRoomSubmitBtn.addEventListener("click", () => {
    const roomCode = joinInput.value.toUpperCase().trim();

    if (!roomCode) return alert("Enter a room code");

    socket.emit("join-room", {
      roomCode,
      username: localStorage.getItem("username") || "Guest", // ✅ FIX
    });
  });

  socket.on("joined-room", (code) => {
    alert(`Joined room ${code}`);
    joinRoomModal.classList.remove("open");
  });

  socket.on("invalid-room", (msg) => alert(msg));

  /* ---------------- START GAME () ---------------- */

  socket.on("start-game", (roomCode) => {
    // BOTH PLAYERS GO TO SAME BOARD
    // window.location.href = `./HumanVSHuman/interactive.html?room=${roomCode}`;
    window.location.href = `http://127.0.0.1:5500/front-end/HumanVSHuman/interactive.html?room=${roomCode}`;
  });

  /* ---------------- other EVENTS ---------------- */

  socket.on("player-joined", (username) => {
    console.log(`${username} joined the room`);
  });

  socket.on("player-left", () => {
    alert("Opponent left the room");
  });
});
