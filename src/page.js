function Board(props) {
  let mouseX = props.mouse[0]; let mouseY = props.mouse[1];
  let mouseStyle = {
    top: ((mouseY + 1) * 50) + '%',
    left:((mouseX + 1) * 50) + '%',
  }
  let catX = Math.cos(props.cat); let catY = Math.sin(props.cat);
  let catStyle = {
    top: ((catY + 1) * 50) + '%',
    left:((catX + 1) * 50) + '%',
  }
  
  return(
    <div
      className="board"
      onClick={props.onClick}
      onContextMenu={props.onContextMenu}
      onMouseMove={props.onMouseMove}
    >
      <div className="circle" id="circleBoard">
        <div className="mouse" style={mouseStyle}></div>
        <div className="cat" style={catStyle}></div>
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" height="100%" />
      </div>
    </div>
  );
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    // framerate tells us the framerate
    this.constants = {
      framerate: 30,
      catCatchRange: 0.05,
    };
    // history stores the locations of cat and mouse at second intervals
    // frameNumber [0,framerate) tells us which frame of the second we are on
    // mouse is the location in (x,y) of the mouse
    // cat is the location in radians (-pi,pi] of the cat
    // catSpeed is the speed of the cat (in units, where the circle has radius 1)
    // mouseFactor is the fraction of speed of the cat that the mouse travels at
    // cursor is the location in (x,y) of the mouse cursor
    // trackingCursor tells us whether the mouse will chase the cursor
    // freezeTime tells us whether the cat will not chase the mouse (when trackingMouse is true)
    // mouseWins {true,false,null} tells us who won
    this.state = {
      history: [{
        mouse: Array(2).fill(0),
        cat: 0.5,
      }],
      frameNumber: 0, // history and frameNumber are unused for now
      mouse: Array(2).fill(0),
      cat: 0.5,
      catSpeed: 2,
      mouseFactor: 0.3,
      cursor: Array(2).fill(0,0),
      trackingCursor: false,
      freezeTime: false,
      mouseWins: null,
    };
  }
  
  componentDidMount() {
    this.interval = setInterval(this.calculateNextFrame, this.constants.framerate);
  }
  componentWillUnmount() {
    clearInterval(this.interval);
  }
  
  calculateNextFrame = () => {
    let mouse = [...this.state.mouse];
    let cat = this.state.cat;
    let cursor = [...this.state.cursor];
    let trackingCursor = this.state.trackingCursor;
    let mouseWins = this.state.mouseWins;
    let catSpeed = this.state.catSpeed;
    let mouseSpeed = catSpeed * this.state.mouseFactor;
    let framerate = this.constants.framerate;
    let catCatchRange = this.constants.catCatchRange;
    if (!trackingCursor || mouseWins != null) {
      return;
    }
    
    let mouseDest = calcMouseDest(mouse[0],mouse[1],cursor[0],cursor[1],mouseSpeed,framerate);
    let catDest = calcCatDest(mouseDest[0],mouseDest[1],cat,catSpeed,framerate);
    
    if (isMouseOutside(mouseDest[0],mouseDest[1])) {
      if (isMouseCaught(mouseDest[0],mouseDest[1],catDest,catCatchRange)) {
        mouseWins = false;
      } else {
        mouseWins = true;
      }
    }
    
    this.setState({
      mouse: mouseDest,
      cat: catDest,
      mouseWins: mouseWins,
    });
  }
  
  handleBoardClick = () => {
    this.setState({
      trackingCursor: true,
    });
  }
  handleBoardContextMenu = (e) => {
    e.preventDefault();
    this.setState({
      trackingCursor: false,
    });
  }
  handleBoardMouseMove = (e) => {
    let rect = document.getElementById("circleBoard").getBoundingClientRect();
    let cursorX = e.clientX; let cursorY = e.clientY;
    let centerX = rect.left + rect.width / 2; let centerY = rect.top + rect.height / 2;
    let radiusX = rect.width / 2; let radiusY = rect.height / 2;
    let cursor = [
      (cursorX - centerX) / radiusX,
      (cursorY - centerY) / radiusY,
    ];
    this.setState({
      cursor: cursor,
    });
  }
  
  render () {
    const mouseWins = this.state.mouseWins;
    let status;
    if (mouseWins == true) {
      status = "The mouse escapes!"
    } else if (mouseWins == false) {
      status = "The cat has caught the mouse"
    }
    
    return (
      <div className="game">
        <Board
          onClick={this.handleBoardClick}
          onContextMenu={this.handleBoardContextMenu}
          onMouseMove={this.handleBoardMouseMove}
          mouse={this.state.mouse}
          cat={this.state.cat}
        />
        <div className="infobar">{status}</div>
      </div>
    );
  }
}

/*
      <div className="game-options">
        <div className="mouse-speed">
          <Slider
            title="Mouse speed"
            
          />
        </div>
        <div className="buttons">
          <div className="freeze-time">
            <Toggle
              title="Freeze time"
              onClick={handleFreezeClick}
            />
          </div>
        </div>
      </div>
*/

// Is the mouse at (x,y) within a threshold distance of the cat
// on the circle of radius 1 and center (0,0) at location C radians?
function isMouseCaught(x, y, C, threshold) {
  // Cx, Cy are the coordinates of the cat
  let Cx = Math.cos(C); let Cy = Math.sin(C);
  // dist is the distance from the mouse to the cat
  let dist = Math.sqrt(Math.pow(x-Cx,2) + Math.pow(y-Cy,2));
  // if dist is within threshold, then the cat can catch the mouse
  if (dist <= threshold) {
    return true;
  } else {
    return false
  }
}

// Is the mouse outside of the circle of radius 1 and center (0,0)?
function isMouseOutside(x, y) {
  // Is the mouse's distance from (0,0) greater than 1?
  return Math.sqrt(Math.pow(x,2) + Math.pow(y,2)) > 1;
}

// Given the cat is on the circle of radius 1 and center (0,0) at location
// C1 radians (-pi, pi], and the mouse will be at location (Mx, My) at the
// end of the frame, calculate where the cat will be (in radians on the
// circle (-pi,pi]) at the end of the frame
function calcCatDest(Mx, My, C1, speed, framerate) {
  // C2 (-pi,pi] is the location where the cat will be closest to the mouse
  // (assuming mouse is inside circle)
  if (Mx == 0 && My == 0) return C1;
  let C2 = Math.atan(My / Mx);
  if (Mx < 0) {
    if (My < 0) C2 -= Math.PI;
    else        C2 += Math.PI;
  }
  // C2C1 (-pi,pi] is the distance / direction the cat needs to go
  let C2C1 = C2 - C1;
  if (C2C1 > Math.PI)         C2C1 -= 2 * Math.PI;
  else if (C2C1 <= -Math.PI)  C2C1 += 2 * Math.PI;
  // dist is the max distance the cat can go in one frame
  let dist = speed / framerate;
  // D (-pi,pi] is the location the cat would be if it travelled the
  // max distance in one frame
  let D = C1 + Math.sign(C2C1) * dist;
  if (D > Math.PI)          D -= 2 * Math.PI;
  else if (D <= -Math.PI)   D += 2 * Math.PI;
  // If the cat would've overshot, then return C2
  if (Math.abs(dist) < Math.abs(C2C1)) {
    return D;
  } else {
    return C2;
  }
}

// Given a starting location A, destination B, speed (distance per second),
// and framerate, determine where the mouse will be by the next frame
function calcMouseDest(Ax, Ay, Bx, By, speed, framerate) {
  if (Ax == Bx && Ay == By) return [Bx, By];
  // AB is the vector from A to B
  let ABx = Bx - Ax; let ABy = By - Ay;
  // D is the location the mouse would be if it travelled the
  // max distance in one frame
  let k = 1 / Math.sqrt(ABx * ABx + ABy * ABy) * (speed / framerate);
  let Dx = Ax + k * ABx; let Dy = Ay + k * ABy;
  // If the mouse would've overshot, then return B
  if (((Ax <= Dx && Dx <= Bx) || (Bx <= Dx && Dx <= Ax)) &&
      ((Ay <= Dy && Dy <= By) || (By <= Dy && Dy <= Ay))) {
    return [Dx, Dy];
  } else {
    return [Bx, By];
  }
}



// Given a line segment AB and a circle of radius 1 and center C,
// output the intersection of the circle and the line segment,
// or B if there isn't any (we only consider the "exiting" intersection)
function boundToCircle(Ax, Ay, Bx, By) {
  let Cx = 0; let Cy = 0;
  let ACx = Cx - Ax; let ACy = Cy - Ay;
  let ABx = Bx - Ax; let ABy = By - Ay;
  // AD is the projection of AC onto AB
  let k = (ACx * ABx + ACy * ABy) / (ABx * ABx + ABy * ABy);
  let ADx = k * ABx; let ADy = k * ABy;
  
  // Calculating E = A + AD + (len/|AB|)AB
  let CDx = ADx - ACx; let CDy = ADy - ACy;
  k = 1 - (CDx * CDx + CDy * CDy);
  if (k < 0) return [Bx, By];
  let len = Math.sqrt(k);
  k = len / Math.sqrt(ABx * ABx + ABy * ABy);
  let Ex = Ax + ADx + k * ABx; let Ey = Ay + ADy + k * ABy;
  
  // if E is inside AB, return E; otherwise return B
  if (((Ax <= Ex && Ex <= Bx) || (Bx <= Ex && Ex <= Ax)) &&
      ((Ay <= Ey && Ey <= By) || (By <= Ey && Ey <= Ay))) {
    return [Ex, Ey];
  } else {
    return [Bx, By];
  }
}

// =====================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);
