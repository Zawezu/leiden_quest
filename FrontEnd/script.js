const logo = document.getElementById('logo');
const startGame = document.getElementById('startGame');
const content = document.querySelector('.content');
const gameExplanation = document.querySelector('#gameExplanation');
const resetButton = document.getElementById("reset");
const nextRoundButton = document.getElementById("nextRoundButton");
const playButton = document.getElementById("playButton");

// Add onclicks 
if (startGame) startGame.onclick = hideStartScreen;
if (playButton) playButton.onclick = initializeGame;
if (resetButton) resetButton.onclick = resetGame;
if (nextRoundButton) nextRoundButton.onclick = nextRound;

// The game logic

// Initialization of the non-constant variables in the game

let neighbours;
let end;
let start;

let quests = [];
let questsSet = new Set();

// Initialization of the constant game variables, the elements from the html
const questLog = document.querySelector('#questLog');
const menu = document.querySelector('#menu');
const infoOverlay = document.querySelector('#infoOverlay');

// Initialization of the information popup for landmarks
const modal = document.getElementById('infoModal');
const closeModalBtn = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalImage = document.getElementById('modalImage');


// Geting the information thorugh Flask

async function initializeFlask() {

    // This function fetches the data from the server by sending a POST request to the server and returns it
    // This fetch is of the type start, and gets the data for drawing the map

    const start = {"type": "start"}
    try{
        const response = await fetch('http://127.0.0.1:5000/main',{
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(start)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }
    catch(error){
        console.log(error)
    }
}

async function requestNeighbours(coords) {

    // This function works as the initialize flask function, but is of the type neighbours
    // It sends the current coordinates and gets the adjacent coordinates (neighbours)

    const send_neighbours = {"type": "neighbours", "current": coords}
    try{
        const response = await fetch('http://127.0.0.1:5000/main',{
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(send_neighbours)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        neighbours = data["neighbours"];
        console.log("Requested neighbours")
        showNeighbours();
    }
    catch(error){
        console.log(error)
    }
}

function resetGame() {
    // This function resets the game

    console.log("Resetting")

    clearMap();
    startNewRound();
}

function hideStartScreen() {
    // This function hides the game explanation and starts the game

    gameExplanation.style.display = "none";
    infoOverlay.style.display = "block";
    menu.style.display = "block";
}

function nextRound() {
    // This function gets called when the next round button is clicked
    // Work in progress. For now just brings you to the next round

    clearMap();
    initializeGame();
}



async function initializeGame(){

    // This function initializes the game by fetching the data from the server and loading it
    // It has a try statement to catch any errors that might occur due to the server not responding
    
    try{
        if (menu) menu.style.display = "none";
        // score = 0;
        // scoreText.innerHTML = score;
        addQuest("Go to the castle");
        updateQuestLog();
        const data = await initializeFlask();
        console.log(data);
        console.log("Data received");
        loadData(data);
        startNewRound();
    }
    catch(error){
        console.error("Error initializing:", error);
    }
}

function loadData(data){

    // All the data gets loaded from a json dictionary (represented as an object in JS)

    neighbours = data["neighbours"];
    // end = data["end"]; Normally this.
    end = [52.158751, 4.492915] // Normally not this. This is the castle coords
    start = data["start"];
    console.log("Data loaded");
}


function addQuest(quest) {
    // This function adds a quest to the quest log and updates the display
    if (!questsSet.has(quest)) {
        quests.push(quest);
        questsSet.add(quest);
        console.log("Added quest " + quest);
    }
}

function completeQuest(quest) {
    quests = quests.filter(e => e !== quest); // Remove the quest from the quests array
}

function updateQuestLog() {
    questLog.innerHTML = ""; // clear old content
    quests.forEach(quest => {
        const line = document.createElement("div");
        line.textContent = `- ${quest}`;
        questLog.appendChild(line);
    });
}


function showBar(percentage, bar) {

    // This function is a WIP to show the progress done so far

    // Variables for the elements of the progress bar

    const barContainer = document.getElementById(bar+"BarContainer");
    const barFill = document.getElementById(bar+"Fill");
    const barText = document.getElementById(bar+"Text");

    barContainer.style.display = 'block';

    barFill.style.width = "0";
    barFill.style.backgroundColor = "red";

    setTimeout(() => {
        barFill.style.width = `${percentage}%`;

        if (percentage < 50) {
            barFill.style.backgroundColor = "red";
        } else if (percentage < 80) {
            barFill.style.backgroundColor = "yellow";
        } else {
            barFill.style.backgroundColor = "green";
        }
    }, 100);

    barText.textContent = `Progress: ${percentage}%`;
}

// Function for opening the modal
function openModal(data) {
    modalTitle.textContent = data.title;
    modalText.textContent = data.text;
    modalImage.src = data.image;
    modal.style.display = 'flex';
    if (data.questEnd) {
        completeQuest(data.questEnd);
    }
    if (data.questStart) {
        addQuest(data.questStart);
    }
}

// Add event to close the modal when you click on the close button
closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    updateQuestLog();
});

// Close when clicking outside modal content
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
    modal.style.display = 'none';
    updateQuestLog();
    }
});