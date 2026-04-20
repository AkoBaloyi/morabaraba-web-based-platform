const isHost =
  new URLSearchParams(window.location.search).get("role") === "host";

// Player identity
const myPlayer = isHost ? 1 : 2;

const canvas = document.getElementById("myCanvas");

const ctx = canvas.getContext("2d");

const player1counter = document.getElementById("player1counter");

const player2counter = document.getElementById("player2counter");

const player1text = document.getElementById("player1text");

const player2text = document.getElementById("player2text");

let hoveredPoint = null; // will contain the object of the point thats being hovered.

let occupiedPointsP1 = []; //Stores occupied points for player 1

let occupiedPointsP2 = []; //Stores occupied points for player 2

let Player = 1;

//Define board

let geometry = {
  squares: [
    //square geometry

    { start: 250, size: 100 },
    { start: 175, size: 250 },
    { start: 100, size: 400 },
  ],

  intersections: [], // contains positions if the intersection points
};

//Calculates the coordinates where there is intersections
function intersectionCal() {
  const points = [];

  for (let square of geometry.squares) {
    let corners = [
      //container for corners
      {
        x: square.start,
        y: square.start,
      },
      {
        x: square.start + square.size,
        y: square.start,
      },
      {
        x: square.start,
        y: square.start + square.size,
      },
      {
        x: square.start + square.size,
        y: square.start + square.size,
      },
    ];

    let midpoints = [
      //container for midpoints
      {
        x: square.start + square.size / 2,
        y: square.start,
      },
      {
        x: square.start,
        y: square.start + square.size / 2,
      },
      {
        x: square.start + square.size,
        y: square.start + square.size / 2,
      },

      {
        x: square.start + square.size / 2,
        y: square.start + square.size,
      },
    ];

    for (let corner of corners) {
      // Puts the coordinates and a boolean variable inside the points array

      points.push({
        x: corner.x,
        y: corner.y,
        placed: false,
      });
    }

    for (let midpoint of midpoints) {
      points.push({
        x: midpoint.x,
        y: midpoint.y,
        placed: false,
      });
    }
  }

  return points;
}

geometry.intersections = intersectionCal(); // Puts the coordinates inside the intersetions variable

//Drawing board function

function drawBoard() {
  // Draw background

  ctx.fillStyle = "#deb887";

  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the three concentric squares

  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;

  for (let square of geometry.squares) {
    ctx.strokeRect(square.start, square.start, square.size, square.size); //Passes the starting point and base and hight
  }

  //Vertical lines
  ctx.beginPath();

  ctx.moveTo(300, 100);
  ctx.lineTo(300, 250);

  ctx.moveTo(300, 350);
  ctx.lineTo(300, 500);

  ctx.stroke();

  //Horizontal lines

  ctx.beginPath();

  ctx.moveTo(100, 300);
  ctx.lineTo(250, 300);

  ctx.moveTo(350, 300);
  ctx.lineTo(500, 300);

  ctx.stroke();

  // Drawing diagonal lines of the board
  ctx.beginPath();

  ctx.moveTo(100, 100);
  ctx.lineTo(250, 250);

  ctx.moveTo(350, 350);
  ctx.lineTo(500, 500);

  ctx.moveTo(500, 100);
  ctx.lineTo(350, 250);

  ctx.moveTo(250, 350);
  ctx.lineTo(100, 500);

  ctx.stroke();

  // Draw all intersection points as small circles

  for (let point of geometry.intersections) {
    ctx.beginPath();

    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);

    ctx.fillStyle = "#8b4513";

    ctx.fill();

    ctx.strokeStyle = "#fff";

    ctx.lineWidth = 1;

    ctx.stroke();
  }

  //Draws the hover circles / effect

  if (hoveredPoint) {
    // Only runs if hoveredPoint contains an object of co-ordinates of the hovered point.

    ctx.beginPath();

    ctx.arc(hoveredPoint.x, hoveredPoint.y, 15, 0, 2 * Math.PI);

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";

    ctx.fill();

    ctx.strokeStyle = "#fff";

    ctx.lineWidth = 2;

    ctx.stroke();
  }

  //Draws Placed Pieces by P1

  for (let occupiedPoint of occupiedPointsP1) {
    //Draws all points in the array as tokens

    ctx.beginPath();

    ctx.arc(occupiedPoint.x, occupiedPoint.y, 15, 0, 2 * Math.PI);

    ctx.fillStyle = "black";

    ctx.fill();

    ctx.strokeStyle = "white";

    ctx.lineWidth = 2;

    ctx.stroke();

    for (let intersection of geometry.intersections) {
      if (
        occupiedPoint.x === intersection.x &&
        occupiedPoint.y === intersection.y
      ) {
        //Chanes the status of the point to occupied if a point is placed

        intersection.placed = true;
      }
    }
  }

  //Draws Placed Pieces by P2

  for (let occupiedPoint of occupiedPointsP2) {
    ctx.beginPath();

    ctx.arc(occupiedPoint.x, occupiedPoint.y, 15, 0, 2 * Math.PI);

    ctx.fillStyle = "white";

    ctx.fill();

    ctx.strokeStyle = "black";

    ctx.lineWidth = 2;

    ctx.stroke();

    for (let intersection of geometry.intersections) {
      if (
        occupiedPoint.x === intersection.x &&
        occupiedPoint.y === intersection.y
      ) {
        intersection.placed = true;
      }
    }
  }
  //Turn indicator

  if (Player === 1) {
    player1text.style.borderColor = "white";
    player1text.style.boxShadow = "0px 0px 10px white";

    player2text.style.borderColor = "gray";
    player2text.style.boxShadow = "0 0 10px gray";
  } else if (Player === 2) {
    player2text.style.borderColor = "white";
    player2text.style.boxShadow = "0px 0px 10px white";

    player1text.style.borderColor = "gray";
    player1text.style.boxShadow = "0 0 10px gray";
  }
}

// Find the closest intersection point to mouse coordinates

function findClosestIntersection(mouseX, mouseY) {
  let closest = null;

  let minDistance = 22; // Maximum distance to snap to a point

  for (let point of geometry.intersections) {
    //runs through all the points inside intersection
    const distance = Math.sqrt(
      Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2), //claculates the distance between the mouse and the point
    );

    if (distance < minDistance) {
      closest = point; // stores the object with the 2 co-ordinates
    }
  }

  return closest; // returns null or an object of a point in range
}

// Handle mouse movement for hover effects

function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;

  const scaleY = canvas.height / rect.height;

  const mouseX = (event.clientX - rect.left) * scaleX;

  const mouseY = (event.clientY - rect.top) * scaleY;

  hoveredPoint = findClosestIntersection(mouseX, mouseY); //stores the closest point in the hoveredPoint variable

  drawBoard();
}

// If the mouse is not on the point anymore

function handleMouseLeave() {
  hoveredPoint = null; //When the mouse leaves the intersection we have to turn hovered point variable back to null

  drawBoard();
}

//Fuction that handles placements of pieces

function mouseClick() {
  let placedPoint;

  if (hoveredPoint) {
    placedPoint = hoveredPoint;

    // BLOCK remote updates triggering clicks
    if (isApplyingRemoteMove) return;

    if (Player === 1 && !placedPoint.placed && occupiedPointsP1.length <= 12) {
      occupiedPointsP1.push({
        x: placedPoint.x,
        y: placedPoint.y,
        placed: true,
      });

      player1counter.textContent = occupiedPointsP1.length;

      // send move
      if (window.sendMoveToServer) {
        window.sendMoveToServer({
          x: placedPoint.x,
          y: placedPoint.y,
          player: 1,
        });
      }

      Player = 2;
    } else if (
      Player === 2 &&
      !placedPoint.placed &&
      occupiedPointsP2.length <= 12
    ) {
      occupiedPointsP2.push({
        x: placedPoint.x,
        y: placedPoint.y,
        placed: true,
      });

      player2counter.textContent = occupiedPointsP2.length;

      if (window.sendMoveToServer) {
        window.sendMoveToServer({
          x: placedPoint.x,
          y: placedPoint.y,
          player: 2,
        });
      }

      Player = 1;
    }

    drawBoard();
  }
}

//Reset button function

function resetButton() {
  player1counter.textContent = "0";

  player2counter.textContent = "0";

  occupiedPointsP1 = []; //makes the arrays empty

  occupiedPointsP2 = [];

  for (let intersection of geometry.intersections) {
    //changes all points statues to not occupied

    intersection.placed = false;
  }

  Player = 1;

  drawBoard();
}

canvas.addEventListener("mousemove", handleMouseMove);

canvas.addEventListener("click", mouseClick);

canvas.addEventListener("mouseleave", handleMouseLeave);

drawBoard();
