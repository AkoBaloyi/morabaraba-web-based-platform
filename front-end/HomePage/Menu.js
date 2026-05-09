document.addEventListener("DOMContentLoaded", () => {
  console.log("Menu loaded");

  // DOM Elements for game menu
  const openBtn = document.getElementById("local-button");
  const aiOpenBtn = document.getElementById("Play-with-AI");
  const leaderBoardBtn = document.querySelector("#leader-board-button");
  const leaderBoardModal = document.querySelector("#leader-board-modal");
  const closeLeaderBoard = document.querySelector("#closeLeaderBoard");
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
  const playerDisplay = document.querySelector(".player-name");

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
  const logoutBtn = document.getElementById("log-out-button");

  //DOM Elements for logout Confirmation
  const logoutConfirmModal = document.getElementById("logout-confirm");
  const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
  const cancelLogoutBtn = document.getElementById("cancel-logout-btn");
  const closeLogoutModalBtn = document.querySelector(".close-logout-modal");

  openBtn.addEventListener("click", () => {
    modal.classList.add("open");
  });
  closeBtn.addEventListener("click", () => modal.classList.remove("open"));

  aiOpenBtn.addEventListener("click", () => {
    modal.classList.remove("open");
    aiMenuModal.classList.add("open");
  });

  closeAiBtn.addEventListener("click", () => {
    aiMenuModal.classList.remove("open");
    modal.classList.add("open");
  });

  leaderBoardBtn.addEventListener("click", () =>
    leaderBoardModal.classList.add("open"),
  );
  closeLeaderBoard.addEventListener("click", () =>
    leaderBoardModal.classList.remove("open"),
  );

  const historyBtn = document.getElementById("history-button");
  if (historyBtn) {
    historyBtn.addEventListener("click", () => {
      loadMatchHistory();
    });
  }

  let socket = null;
  let currentRoomCode = null;
  let playerUsername = null;
  let authToken = null;

  //Show logout confirmation modal function
  function showLogoutConfirmModal() {
    if (logoutConfirmModal) {
      logoutConfirmModal.classList.add("open");
    }
  }

  //Hide logout confirmation modal
  function hideLogoutConfirmModal() {
    if (logoutConfirmModal) {
      logoutConfirmModal.classList.remove("open");
    }
  }

  //Update UI based on login status
  function updateAuthUI() {
    if (isLoggedIn()) {
      // User is logged in
      if (logInBtn) logInBtn.style.display = "none";
      if (signUpBtn) signUpBtn.style.display = "none";
      if (logoutBtn) {
        logoutBtn.style.display = "block";
        // Update logout button text with username
        const username = localStorage.getItem("username");
        logoutBtn.textContent = `Log-out`;
      }
    } else {
      // User is not logged in
      if (logInBtn) logInBtn.style.display = "block";
      if (signUpBtn) signUpBtn.style.display = "block";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  }

  //Logout function
  function logout() {
    // Clear local storage
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    // Clear global variables
    authToken = null;
    playerUsername = null;

    // Show notification
    //showNotification("Logged out successfully!", "#4CAF50");

    // Update UI buttons
    updateAuthUI();

    //guest-player display
    if (playerDisplay) {
      playerDisplay.textContent = "Guest_Player";
    }

    // Disconnect and reconnect socket as guest
    if (socket) {
      socket.disconnect();
      // Reconnect as guest (without token)
      setTimeout(() => {
        connectSocket();
      }, 100);
    }

    console.log("User logged out");
  }

  // Check if user is logged in
  function isLoggedIn() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    return token && token !== "null" && username && username !== "null";
  }

  // fetch the player's elo and show it next to their name
  function fetchAndShowElo() {
    var token = localStorage.getItem("token");
    if (!token) return;
    fetch(
      (typeof SERVER_URL !== "undefined"
        ? SERVER_URL
        : "http://localhost:3000") + "/profile",
      {
        headers: { Authorization: "Bearer " + token },
      },
    )
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.elo) {
          playerDisplay.textContent =
            playerUsername + " (Elo: " + data.elo + ")";
        }
      })
      .catch(function () {
        /* server not running, ignore */
      });
  }

  // Show notification helper
  function showNotification(message, color) {
    const notif = document.createElement("div");
    notif.textContent = message;
    notif.style.position = "fixed";
    notif.style.top = "90px";
    notif.style.left = "50%";
    notif.style.transform = "translateX(-50%)";
    notif.style.backgroundColor = color;
    notif.style.color = "white";
    notif.style.padding = "10px";
    notif.style.borderRadius = "5px";
    notif.style.zIndex = "9999";
    notif.style.fontFamily = " Arial, Helvetica";
    notif.style.whiteSpace = "nowrap";
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  // Connect to game server
  function connectSocket() {
    const savedToken = localStorage.getItem("token");
    socket = io(
      typeof SERVER_URL !== "undefined" ? SERVER_URL : "http://localhost:3000",
      {
        transports: ["websocket", "polling"],
        auth: { token: savedToken || null },
      },
    );

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
      const username = localStorage.getItem("username") || playerUsername;
      sessionStorage.setItem("gameRoomCode", data.roomCode || data);
      sessionStorage.setItem("playerUsername", username);

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
      const response = await fetch(
        (typeof SERVER_URL !== "undefined"
          ? SERVER_URL
          : "http://localhost:3000") + "/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        authToken = data.token;
        playerUsername = data.username || username;
        localStorage.setItem("token", authToken);
        localStorage.setItem("username", playerUsername);
        showNotification("Login successful!", "#4CAF50");
        logInModal.classList.remove("open");
        playerDisplay.textContent = `${username}`;

        // fetch and show elo rating
        fetchAndShowElo();

        // Update UI buttons
        updateAuthUI();

        // Reconnect socket with the new token
        if (socket) {
          socket.disconnect();
          connectSocket();
        }

        // After successful login, open the online menu
        setTimeout(() => {
          onlineMenuModal.classList.add("open");
        }, 500);

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
      const response = await fetch(
        (typeof SERVER_URL !== "undefined"
          ? SERVER_URL
          : "http://localhost:3000") + "/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        },
      );

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
  // OPEN ONLINE MENU (check login first)
  // ============================================
  function handleOnlinePlay() {
    if (!socket || !socket.connected) {
      alert("Connecting to server...");
      return;
    }

    if (isLoggedIn()) {
      // User is logged in, show online menu
      console.log("User logged in, showing online menu");
      onlineMenuModal.classList.add("open");
    } else {
      // User not logged in, show login modal
      console.log("User not logged in, showing login modal");
      showNotification("Log-in or sign-up to play online", "#000080");
      logInModal.classList.add("open");
    }
  }

  // Check for existing session on page load
  function checkExistingSession() {
    const savedToken = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");

    if (
      savedToken &&
      savedToken !== "null" &&
      savedUsername &&
      savedUsername !== "null"
    ) {
      authToken = savedToken;
      playerUsername = savedUsername;
      console.log("Restored session for:", playerUsername);
      showNotification(`Welcome back, ${playerUsername}!`, "#4CAF50");
      if (playerDisplay) playerDisplay.textContent = `${playerUsername}`;
      fetchAndShowElo();
    } else {
      // Guest mode
      playerUsername = "Guest_" + Math.floor(Math.random() * 1000);
      localStorage.setItem("username", playerUsername);
      console.log("Guest mode:", playerUsername);
    }

    // Update UI based on login status
    updateAuthUI();
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

  // Forgot password modal
  const forgotBtn = document.getElementById("forgot-password-button");
  const forgotModal = document.getElementById("forgot-password-modal");
  const closeForgotBtn = document.getElementById("closeForgotModal");
  const resetSubmitBtn = document.getElementById("reset-submit-btn");

  if (forgotBtn) {
    forgotBtn.addEventListener("click", () => {
      logInModal.classList.remove("open");
      forgotModal.classList.add("open");
    });
  }
  if (closeForgotBtn) {
    closeForgotBtn.addEventListener("click", () => {
      forgotModal.classList.remove("open");
      logInModal.classList.add("open");
    });
  }
  if (resetSubmitBtn) {
    resetSubmitBtn.addEventListener("click", async () => {
      const username = document.getElementById("reset-username")?.value;
      const email = document.getElementById("reset-email")?.value;
      const newPassword = document.getElementById("reset-new-password")?.value;

      if (!username || !email || !newPassword) {
        alert("Please fill in all fields");
        return;
      }

      try {
        const response = await fetch(
          (typeof SERVER_URL !== "undefined"
            ? SERVER_URL
            : "http://localhost:3000") + "/reset-password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, newPassword }),
          },
        );
        const data = await response.json();
        if (response.ok) {
          showNotification("Password reset! You can now login.", "#4CAF50");
          forgotModal.classList.remove("open");
          logInModal.classList.add("open");
        } else {
          alert(data.error || "Reset failed");
        }
      } catch (err) {
        alert("Reset failed. Is the server running?");
      }
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

  // Logout button handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      console.log("Logout button clicked");
      showLogoutConfirmModal();
    });
  }

  //Confirm logout button
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", () => {
      logout();
      hideLogoutConfirmModal();
    });
  }

  //Cancel logout button
  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener("click", () => {
      hideLogoutConfirmModal();
    });
  }

  //close modal with X button
  if (closeLogoutModalBtn) {
    closeLogoutModalBtn.addEventListener("click", () => {
      hideLogoutConfirmModal();
    });
  }

  // ============================================
  // GAME MENU HANDLERS
  // ============================================

  // Connect to game server
  connectSocket();

  // Online button - shows login modal if not logged in, otherwise shows online menu
  if (onlineBtn) {
    onlineBtn.addEventListener("click", handleOnlinePlay);
  }

  createRoomBtn.addEventListener("click", () => {
    if (!socket || !socket.connected) {
      alert("Not connected to server");
      return;
    }
    const username = localStorage.getItem("username") || playerUsername;
    socket.emit("create-room", { username: username });
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
    const username = localStorage.getItem("username") || playerUsername;
    socket.emit("join-room", { roomCode, username: username });
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

  // Fetch and display leaderboard data
  async function loadLeaderboard() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        (typeof SERVER_URL !== "undefined"
          ? SERVER_URL
          : "http://localhost:3000") + "/leaderboard",
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (result.success && result.data.length > 0) {
        const tbody = document.querySelector("#leader-board-modal tbody");
        tbody.innerHTML = ""; // clear hardcoded rows

        result.data.forEach((player) => {
          const row = document.createElement("tr");
          row.innerHTML = `
          <td class="rank">${player.rank}</td>
          <td>${escapeHtml(player.username)}</td>
          <td>${player.elo}</td>
          <td>${player.totalGames || 0}</td>
          <td>${player.wins || 0}</td>
          <td>${player.losses || 0}</td>
          <td>${player.draws || 0}</td>
        `;
          tbody.appendChild(row);
        });
      } else {
        // Show empty state if no data
        const tbody = document.querySelector("#leader-board-modal tbody");
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No online games played yet</td></tr>`;
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  }

  // Helper function to prevent XSS attacks
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Call this when opening the leaderboard modal
  document
    .getElementById("leader-board-modal")
    .addEventListener("open", loadLeaderboard);

  // Or call it when clicking a button that shows the leaderboard

  document
    .getElementById("leader-board-button")
    .addEventListener("click", () => {
      loadLeaderboard();
      document.getElementById("leader-board-modal").classList.add("open");
    });

  // Fetch and display match history
  async function loadMatchHistory() {
    const username = localStorage.getItem("username");
    if (!username || username.includes("Guest")) {
      showNotification("Login to view match history", "#ff9800");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${typeof SERVER_URL !== "undefined" ? SERVER_URL : "http://localhost:3000"}/api/match-history/${username}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (result.success && result.data.length > 0) {
        displayMatchHistoryModal(result.data);
      } else {
        showNotification("No match history found", "#ff9800");
      }
    } catch (error) {
      console.error("Error loading match history:", error);
      showNotification("Failed to load match history", "#f44336");
    }
  }

  // Display match history in a modal
  function displayMatchHistoryModal(matches) {
    // Create modal if it doesn't exist
    let historyModal = document.getElementById("match-history-modal");
    if (!historyModal) {
      historyModal = document.createElement("div");
      historyModal.id = "match-history-modal";
      historyModal.className = "modal";
      historyModal.innerHTML = `
      <div class="modal-inner match-history-inner">
        <button class="closeModal close-history-modal">back</button>
        <div class="match-history-header">
          <h3>Match History</h3>
        </div>
        <div class="match-history-list" id="match-history-list"></div>
      </div>
    `;
      document.body.appendChild(historyModal);

      // Add close button event
      historyModal
        .querySelector(".close-history-modal")
        .addEventListener("click", () => {
          historyModal.classList.remove("open");
        });
    }

    const listContainer = document.getElementById("match-history-list");
    listContainer.innerHTML = "";

    matches.forEach((match) => {
      const opponent =
        match.player1_name === localStorage.getItem("username")
          ? match.player2_name
          : match.player1_name;
      const date = match.ended_at
        ? new Date(match.ended_at).toLocaleDateString()
        : "Unknown";
      const resultClass =
        match.result === "win"
          ? "match-win"
          : match.result === "loss"
            ? "match-loss"
            : "match-draw";
      const resultText = match.result.toUpperCase();

      const matchElement = document.createElement("div");
      matchElement.className = `match-history-item ${resultClass}`;
      matchElement.innerHTML = `
      <div class="match-opponent">vs ${opponent || "Unknown"}</div>
      <div class="match-result">${resultText}</div>
      <div class="match-date">${date}</div>
    `;
      listContainer.appendChild(matchElement);
    });

    historyModal.classList.add("open");
  }

  // Initialize
  checkExistingSession();
  console.log("Menu ready - Login required for online play");
});
