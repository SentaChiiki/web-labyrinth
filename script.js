const mazeW = 21;
const mazeH = 21;
const cellSize = 20;

const timerElement = document.querySelector('.timer');
const coinElement = document.querySelector('.coins');
const tryAgainButton = document.querySelector('.try-again');

let startTime = null;
let timerInterval = null;
let playerStart = { x: 0, y: 0 };
let gameFinished = false;
let mazeLayout;
let coins = 0;

const sounds = {
    'coin': 'coin1.mp3',
    'wall': 'muted-wall-hit.mp3',
    'goal': 'achieve1.wav',
    'bgm1': 'game-music-loop-1-143979.mp3',
    'bgm3': 'game-music-loop-3-144252.mp3',
    'bgm5': 'game-music-loop-5-144569.mp3',
  };

alert('Note that sound is produced. 14')

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

async function loadAudioBuffer(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

const audioBuffers = {};

async function loadAllAudioBuffers() {
  for (const soundName in sounds) {
    const url = sounds[soundName];
    audioBuffers[soundName] = await loadAudioBuffer(url);
  }
}

loadAllAudioBuffers()
  .then(() => {
    console.log('All audio buffers loaded');
  })
  .catch(error => {
    alert('Error loading audio buffers.');
    console.error('Error loading audio buffers:', error);
  });


function playSound(soundName) {
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffers[soundName];
  source.connect(audioContext.destination);
  source.start();
}
    
class Player {
    constructor(x=0, y=0) {
        this.x = x;
        this.y = y;
    }
    
    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
}

const player = new Player();
const mazeElement = document.querySelector('.maze');

function create2DArrayWithValues(width, height, value=null) {
  const matrix = new Array(height);
  for (let i = 0; i < height; i++) {
    matrix[i] = new Array(width).fill(value);
  }
  return matrix;
}

function generateMaze(width, height) {
    const maze = create2DArrayWithValues(width, height, '#');

    function isInside(x, y) {
        return x >= 0 && x < width && y >= 0 && y < height;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function carve(x, y) {
        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
        ];
        shuffleArray(directions);
        
        let deadEnd = true;
        for (const {dx,dy} of directions) {
            const nx = x + dx * 2;
            const ny = y + dy * 2;

            if( isInside(nx, ny) && maze[ny][nx] !== '.' ){
                if( isInside(x+dx,y+dy) && maze[y+dy][x+dx]==='#' ){
                    maze[y+dy][x+dx] = '.';
                }
                if( maze[ny][nx] ==='#'){
                    maze[ny][nx] = '.';
                    carve(nx, ny);
                    deadEnd = false;
                }
            }
        }
        if( deadEnd ){
            if( maze[y][x]==='.' ){
                maze[y][x] = 'C';
            }
        }
    }

    maze[0][0] = 'S';
    maze[height - 1][width - 1] = 'E';
    carve(0, 0);

    return maze;
}

function drawMaze(mazeLayout) {
    // Remove all existing cells from the mazeElement
    while (mazeElement.firstChild) {
        mazeElement.removeChild(mazeElement.firstChild);
    }
    mazeElement.style.width  = String(mazeW*cellSize) + 'px';
    mazeElement.style.height = String(mazeH*cellSize) + 'px';

    for (let y = 0; y < mazeH; y++) {
        for (let x = 0; x < mazeW; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            if (mazeLayout[y][x] === '#') {
                cell.classList.add('wall');
            } else if (mazeLayout[y][x] === 'S') {
                cell.classList.add('start');
                playerStart.x = x;
                playerStart.y = y;
            } else if (mazeLayout[y][x] === 'E') {
                cell.classList.add('goal');
            } else if (mazeLayout[y][x] === 'C') {
                cell.classList.add('coin');
            }

            mazeElement.appendChild(cell);
        }
    }
}

function drawPlayer() {
    const playerIndex = player.y * mazeW + player.x;
    const playerCell = mazeElement.children[playerIndex];
    playerCell.classList.add('player');
    playerCell.classList.add('visited');
}
function clearPlayer() {
    const playerIndex = player.y * mazeW + player.x;
    const playerCell = mazeElement.children[playerIndex];
    playerCell.classList.remove('player');
}
function clearCoin(x, y){
    const coinIndex = y*mazeW + x;
    const coinCell = mazeElement.children[coinIndex];
    coinCell.classList.remove('coin');
}

function canMoveTo(x, y, mazeLayout) {
    if( x<0 || y<0 || x>=mazeW || y>=mazeH ) return false;
    const targetCell = mazeLayout[y][x];
    return targetCell !== '#';
}

function handleKeydown(event) {
    if (gameFinished) return;

    let newX = player.x;
    let newY = player.y;

    if (event.key === 'ArrowUp') {
        newY -= 1;
    } else if (event.key === 'ArrowDown') {
        newY += 1;
    } else if (event.key === 'ArrowLeft') {
        newX -= 1;
    } else if (event.key === 'ArrowRight') {
        newX += 1;
    }

    if (canMoveTo(newX, newY, mazeLayout)) {
        clearPlayer();
        player.move(newX - player.x, newY - player.y);
        drawPlayer();
        setTimeout(() => playerInteraction(), 0);
    } else {
        playSound('wall');
    }
}

function playerInteraction() {
    const cell = mazeLayout[player.y][player.x];
    if (cell === 'C') {
        mazeLayout[player.y][player.x] = '.';
        coins++;
        updateCoins();
        clearCoin(player.x, player.y);
        playSound('coin');
    } else if (cell === 'E') {
        gameFinished = true;
        stopTimer();
        playSound('goal');
        setTimeout(() => alert('Congratulations, you reached the goal!'), 100);
    }
}

function startTimer() {
    startTime = new Date();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function updateTimer() {
    const currentTime = new Date();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateCoins() {
    coinElement.textContent = '#Coins:' + coins;
}

function resetGame() {
    timerElement.textContent = '00:00';
    coins = 0;
    updateCoins();
    gameFinished = false;
    mazeLayout = generateMaze(mazeW, mazeH);
    drawMaze(mazeLayout);
    player.x = playerStart.x;
    player.y = playerStart.y;
    drawPlayer();
    tryAgainButton.style.display = 'block';
    playSound('bgm1');
    startTimer();
}

document.addEventListener('keydown', handleKeydown);
tryAgainButton.addEventListener('click', resetGame);

resetGame();
