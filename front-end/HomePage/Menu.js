document.addEventListener("DOMContentLoaded", () => {
  console.log("Menu loaded");

  // DOM Elements for game menu
  const openBtn = document.getElementById("local-button");
  const aiOpenBtn = document.getElementById("Play-with-AI");
  const onlineBtn = document.getElementById("online-button");
  const onlineMenuModal = document.getElementById("online-menu-modal");
  const createRoomBtn = document.getElementById("create-room-button");
  const joinRoomBtn = document.getElementById("join-room-button");
  const joinRoomModal = document.getElementById("join-room-modal");
  const joinSubmitBtn = document.querySelector("#join-room-modal .join-button");
  const joinInput = document.querySelector("#join-room-modal .input-bar");
  const createRoomModal = document.getElementById("create-room-modal");
  const codeDisplay = document.querySelector(".code-display-text");
  const closeCreateBtn = document.getElementById("closeCreateRoomModal");
  const closeJoinBtn = document.getElementById("closeJoinRoomModal");
  const closeOnlineBtn = document.getElementById("closeOnlineMenuModal");
  const closeBtn = document.getElementById("closeModal");
  const closeAiBtn = document.getElementById("closeAiMenuModal");

  const modal = document.getElementById("modal");
  const aiMenuModal = document.getElementById("ai-menu-modal");

  // DOM Elements for Auth Modals
  const logInBtn = document.getElementById("log-in-button");
  const signUpBtn = document.getElementById("sign-up-button");
  const logInModal = document.getElementById("log-in-modal");
  const signUpModal = document.getElementById("sign-up-modal");
  const closeLogInBtn = document.getElementById("closeLogInModal");
  const closeSignUpBtn = document.getElementById("closeSignUpModal");
  const loginSubmitBtn = document.querySelector(".inner-login-button");
  const signUpSubmitBtn = document.querySelector(".inner-signup-button");

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

  let socket = null;
  let currentRoomCode = null;
  let playerUsername = null;
  let authToken = null;

  // Check if user is logged in
  function isLoggedIn() {
    return authToken !== null && playerUsername !== null;
  }

  // Show notification helper
  function showNotification(message, color) {
    const notif = document.createElement("div");
    notif.textContent = message;
    notif.style.position = "fixed";
    notif.style.bottom = "20px";
    notif.style.right = "20px";
    notif.style.backgroundColor = color;
    notif.style.color = "white";
    notif.style.padding = "10px";
    notif.style.borderRadius = "5px";
    notif.style.zIndex = "9999";
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  // Connect to game server (no auth required for gameplay)
  function connectSocket() {
    // send the token if we have one so the server knows who we are
    const savedToken = localStorage.getItem("token");
    socket = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
      auth: { token: savedToken || null },
    });

    socket.on("connect", () => {
      console.log("Connected to game server");
      showNotification("Connected to game server!", "#4CAF50");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      showNotification("Failed to connect to server!", "#f44336");
    });

    socket.on("room-created", (code) => {
      console.log("Room created:", code);
      currentRoomCode = code;
      if (codeDisplay) codeDisplay.textContent = code;
      createRoomModal.classList.add("open");
    });

    socket.on("join-success", (code) => {
      console.log("Joined room:", code);
      currentRoomCode = code;
      showNotification("Joined room! Waiting for opponent...", "#4CAF50");
      joinRoomModal.classList.remove("open");
    });

    socket.on("player-joined", (username) => {
      console.log("Player joined:", username);
      showNotification(`${username} joined! Starting game...`, "#4CAF50");
    });

    socket.on("game-start", (data) => {
      console.log("Game starting:", data);
      sessionStorage.setItem("gameRoomCode", data.roomCode || data);
      sessionStorage.setItem("playerUsername", playerUsername);

      setTimeout(() => {
        window.location.href = `../OnlinePlay/online-play.html?room=${data.roomCode || data}`;
      }, 1000);
    });

    socket.on("error", (message) => {
      alert(message);
    });
  }

  // ============================================
  // LOGIN FUNCTION
  // ============================================
  async function login(username, password) {
    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        authToken = data.token;
        playerUsername = data.username || username;
        localStorage.setItem("token", authToken);
        localStorage.setItem("username", playerUsername);
        showNotification("Login successful!", "#4CAF50");
        logInModal.classList.remove("open");

        // reconnect socket with the new token so server knows who we are
        if (socket) {
          socket.disconnect();
          connectSocket();
        }
        return true;
      } else {
        alert(data.message || "Login failed");
        return false;
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed. Please try again.");
      return false;
    }
  }

  // ============================================
  // SIGNUP FUNCTION
  // ============================================
  async function signup(username, email, password) {
    try {
      const response = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful! Please login.");
        signUpModal.classList.remove("open");
        logInModal.classList.add("open");
        return true;
      } else {
        alert(data.error || "Registration failed");
        return false;
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Signup failed. Please try again.");
      return false;
    }
  }

  // ============================================
  // Check for existing session on page load
  // ============================================
  function checkExistingSession() {
    const savedToken = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");

    if (savedToken && savedUsername) {
      authToken = savedToken;
      playerUsername = savedUsername;
      console.log("Restored session for:", playerUsername);
      showNotification(`Welcome back, ${playerUsername}!`, "#4CAF50");
    } else {
      // Guest mode
      playerUsername = "Guest_" + Math.floor(Math.random() * 1000);
      localStorage.setItem("username", playerUsername);
      console.log("Guest mode:", playerUsername);
    }
  }

  // ============================================
  // AUTH MODAL HANDLERS
  // ============================================

  // Open login modal
  if (logInBtn) {
    logInBtn.addEventListener("click", () => {
      logInModal.classList.add("open");
    });
  }

  // Close login modal
  if (closeLogInBtn) {
    closeLogInBtn.addEventListener("click", () => {
      logInModal.classList.remove("open");
    });
  }

  // Open signup modal (from login modal)
  if (signUpBtn) {
    signUpBtn.addEventListener("click", () => {
      logInModal.classList.remove("open");
      signUpModal.classList.add("open");
    });
  }

  // Close signup modal
  if (closeSignUpBtn) {
    closeSignUpBtn.addEventListener("click", () => {
      signUpModal.classList.remove("open");
    });
  }

  // Login form submission
  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener("click", async () => {
      const username = document.querySelector(
        "#log-in-modal .username-input",
      )?.value;
      const password = document.querySelector(
        "#log-in-modal .password-input",
      )?.value;

      if (!username || !password) {
        alert("Please fill in all fields");
        return;
      }

      await login(username, password);
    });
  }

  // Signup form submission
  if (signUpSubmitBtn) {
    signUpSubmitBtn.addEventListener("click", async () => {
      const username = document.querySelector(
        "#sign-up-modal .username-input",
      )?.value;
      const email = document.querySelector(
        "#sign-up-modal .email-input",
      )?.value;
      const password = document.querySelector(
        "#sign-up-modal .password-input",
      )?.value;

      if (!username || !email || !password) {
        alert("Please fill in all fields");
        return;
      }

      await signup(username, email, password);
    });
  }

  // ============================================
  // GAME MENU HANDLERS
  // ============================================

  // Connect to game server
  connectSocket();

  // Online button - now checks if logged in but doesn't force it
  onlineBtn.addEventListener("click", () => {
    if (!socket || !socket.connected) {
      alert("Connecting to server...");
      return;
    }

    //Show username in menu if logged in
    if (isLoggedIn()) {
      console.log(`Playing as: ${playerUsername}`);
    } else {
      console.log(`Playing as guest: ${playerUsername}`);
    }

    onlineMenuModal.classList.add("open");
  });

  createRoomBtn.addEventListener("click", () => {
    if (!socket || !socket.connected) {
      alert("Not connected to server");
      return;
    }
    socket.emit("create-room", { username: playerUsername });
    onlineMenuModal.classList.remove("open");
  });

  joinRoomBtn.addEventListener("click", () => {
    onlineMenuModal.classList.remove("open");
    joinRoomModal.classList.add("open");
  });

  joinSubmitBtn.addEventListener("click", () => {
    const roomCode = joinInput.value.toUpperCase().trim();
    if (!roomCode) {
      alert("Enter a room code");
      return;
    }
    if (!socket || !socket.connected) {
      alert("Not connected to server");
      return;
    }
    socket.emit("join-room", { roomCode, username: playerUsername });
  });

  // Close buttons for modals
  if (closeCreateBtn) {
    closeCreateBtn.onclick = () => createRoomModal.classList.remove("open");
  }
  if (closeJoinBtn) {
    closeJoinBtn.onclick = () => joinRoomModal.classList.remove("open");
  }
  if (closeOnlineBtn) {
    closeOnlineBtn.onclick = () => onlineMenuModal.classList.remove("open");
  }

  // Initialize
  checkExistingSession();
  console.log("Menu ready - Login/Signup available, gameplay optional");
});
