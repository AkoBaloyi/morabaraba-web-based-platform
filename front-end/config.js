// config.js - Server URL configuration
// When hosted on Azure (or any server), the frontend and backend are on the same URL
// so we just use the current page's origin. For local dev, fall back to localhost:3000.

var SERVER_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : window.location.origin;
