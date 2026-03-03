
const canvas = document.getElementById('myCanvas');

const ctx = canvas.getContext('2d');

const player1counter = document.getElementById('player1counter');

const player2counter = document.getElementById('player2counter');

const player1text = document.getElementById('player1text');

const player2text = document.getElementById('player2text');

let hoveredPoint = null;

let ishovered = false;

let occupiedPointsP1 = [];

let occupiedPointsP2 = [];

let Player = 1;

//Define board

let geometry ={

    squares:[ //square geometry

        {start:250, size: 100},
        {start:175, size: 250},
        {start:100, size: 400}

    ],

    intersections:[], // contains positions if the intersection points  

};

function intersectionCal(){

    const points = [];

    for(let square of geometry.squares){ 

       let corners =[  //for corners
            {
            x: square.start,
            y: square.start
            },
            {
            x: square.start + square.size,
            y: square.start
            },
            {
            x: square.start,
            y: square.start + square.size
            },
            {
            x: square.start + square.size,
            y: square.start + square.size
            }
            ];

         let midpoints= [ //for midpoints
            {
            x: square.start + square.size / 2,
            y: square.start
            },
            {
            x: square.start,
            y: square.start + square.size / 2
            },
           {
            x: square.start + square.size,
            y: square.start + square.size / 2
            },

            {
            x: square.start + square.size / 2,
            y: square.start + square.size
            }
            ];

            for(let corner of corners){

                points.push({
                x: corner.x,
                y: corner.y,
                placed: false
                

            });
            }

            for(let midpoint of midpoints){

                points.push({
                x: midpoint.x,
                y: midpoint.y,
                placed: false

            });
            }
            

    }

    return points;
}

geometry.intersections = intersectionCal();


function drawBoard() {
    
       
    // Draw background

    ctx.fillStyle = '#deb887';

    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the three concentric squares

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
   
        
    for(let square of geometry.squares){

        ctx.strokeRect(square.start, square.start, square.size, square.size);
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

    for(let point of geometry.intersections){

        ctx.beginPath();

        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);

        ctx.fillStyle = '#8b4513';

        ctx.fill();

        ctx.strokeStyle = '#fff';

        ctx.lineWidth = 1;
        
        ctx.stroke();
    }

    //Draws the hover circles / effect 

    if (hoveredPoint ) {

        ctx.beginPath();

        ctx.arc(hoveredPoint.x, hoveredPoint.y, 15, 0, 2 * Math.PI);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

        ctx.fill();

        ctx.strokeStyle = '#fff';

        ctx.lineWidth = 2;
        
        ctx.stroke();

        ishovered = true;
    }

    //Draws Placed Pieces by P1

    for( let occupiedPoint of occupiedPointsP1){

        
        ctx.beginPath();

        ctx.arc(occupiedPoint.x, occupiedPoint.y, 15, 0, 2 * Math.PI);

        ctx.fillStyle = 'black';

        ctx.fill();

        ctx.strokeStyle = 'white';

        ctx.lineWidth = 2;
        
        ctx.stroke();
        
        for(let intersection of geometry.intersections){

            if( occupiedPoint.x === intersection.x && occupiedPoint.y === intersection.y){

                intersection.placed = true;

            }

        }
        
    }

    //Draws Placed Pieces by P2

    for( let occupiedPoint of occupiedPointsP2){

        
        ctx.beginPath();

        ctx.arc(occupiedPoint.x, occupiedPoint.y, 15, 0, 2 * Math.PI);

        ctx.fillStyle = 'white';

        ctx.fill();

        ctx.strokeStyle = 'black';

        ctx.lineWidth = 2;
        
        ctx.stroke();
       
        for(let intersection of geometry.intersections){

            if( occupiedPoint.x === intersection.x && occupiedPoint.y === intersection.y){

                intersection.placed = true;

            }

        }
        
    }

        
    //Turn indicator

    if( Player === 1){

        player1text.style.borderColor = "white";
        player1text.style.boxShadow = '0px 0px 10px white';

        player2text.style.borderColor = "gray";
        player2text.style.boxShadow = '0 0 10px gray';
        
    }else if(Player === 2){

        player2text.style.borderColor = "white";
        player2text.style.boxShadow = '0px 0px 10px white';

        player1text.style.borderColor = "gray";
        player1text.style.boxShadow = '0 0 10px gray';

    }
  
}

// Find the closest intersection point to mouse coordinates

function findClosestIntersection(mouseX, mouseY) {
    let closest = null;

    let minDistance = 22; // Maximum distance to snap to a point
    
    for(let point of geometry.intersections) //runs through all the points inside intersection
    {
        const distance = Math.sqrt(

            Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
        );
        
        if (distance < minDistance) {
            
            minDistance = distance;

            closest = point; // stores the object with the 2 co-ordinates 
        }
    };
    
    return closest; // returns null or an object of a point in range
}

// Handle mouse movement for hover effects

function handleMouseMove(event) {

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;

    const scaleY = canvas.height / rect.height;
    
    const mouseX = (event.clientX - rect.left) * scaleX;
    
    const mouseY = (event.clientY - rect.top) * scaleY;
    
    hoveredPoint = findClosestIntersection(mouseX, mouseY);

    drawBoard();
}

// If the mouse is not on the point anymore   

function handleMouseLeave() {

    hoveredPoint = null; //When the mouse leaves the intersection we have to turn hovered point variable back to null 
    ishovered = false;

    drawBoard();
}

//Fuction that handles placements if pieces

function mouseClick(){

    let placedPoint;

    if(hoveredPoint){

        placedPoint = hoveredPoint;

        if(Player === 1 && !placedPoint.placed && occupiedPointsP1.length <= 12){

            occupiedPointsP1.push(placedPoint);

            player1counter.textContent = occupiedPointsP1.length;

            Player = 2;

        }else if(Player === 2 && !placedPoint.placed && occupiedPointsP2.length <= 12){

            occupiedPointsP2.push(placedPoint);

            player2counter.textContent = occupiedPointsP2.length;

            Player = 1;
        }

        drawBoard();
    }
}

//Reset button function

function resetButton(){

    player1counter.textContent = "0";

    player2counter.textContent = "0";

    occupiedPointsP1 = [];

    occupiedPointsP2 = [];

    for(let intersection of geometry.intersections){

        intersection.placed = false;
    }

    Player = 1;

    drawBoard();
}


canvas.addEventListener('mousemove', handleMouseMove);

canvas.addEventListener('click', mouseClick);

canvas.addEventListener('mouseleave', handleMouseLeave);

drawBoard();
