const logo = document.getElementById('logo');
const startGame = document.getElementById('startGame');
const content = document.querySelector('.content');
const gameExplanation = document.querySelector('#gameExplanation');

const resetButton = document.getElementById("reset");

const barContainer = document.getElementById("progressBarContainer");
const barFill = document.getElementById("progressFill");
const barText = document.getElementById("progressText");

// Add onclicks 
if (startGame) startGame.onclick = firstStart;
if (resetButton) resetButton.onclick = resetGame;


// The game logic

// Initialization of the non-constant variables in the game

let neighbours;
let end;
let start;

let quests = [];
let questsSet = new Set();

// Initialization of the constant game variables, the elements from the html
const questLog = document.querySelector('#questLog');
const infoOverlay = document.querySelector('#infoOverlay');


// Geting the information thorugh Flask

async function initializeFlask() {

    // This function fetches the data from the server by sending a POST request to the server and returns it
    // This fetch is of the type start, and gets the data for drawing the map

    const start = {"type": "start"}
    try{
        // const response = await fetch('http://127.0.0.1:10000/main',{
        const response = await fetch('/main',{
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
        // const response = await fetch('http://127.0.0.1:10000/main',{
        const response = await fetch('/main',{
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

function firstStart() {
    // This function hides the game explanation, shows the progress bar, and starts the game

    gameExplanation.style.display = "none";
    infoOverlay.style.display = "block";

    barContainer.style.display = 'block';
    barFill.style.width = "0";
    barFill.style.backgroundColor = "red";
    initializeGame();
}

function nextRound() {
    // This function gets called when the next round button is clicked

    clearMap();
    initializeGame();
}



async function initializeGame(){

    // This function initializes the game by fetching the data from the server and loading it
    // It has a try statement to catch any errors that might occur due to the server not responding
    
    try{
        // score = 0;
        // scoreText.innerHTML = score;
        addQuest("Go to the windmill");
        updateQuestLog();
        const data = await initializeFlask();
        console.log(data);
        console.log("Data received");
        await loadData(data);
        startNewRound();
    }
    catch(error){
        console.error("Error initializing:", error);
    }
}

async function loadData(data){

    // All the data gets loaded from a json dictionary (represented as an object in JS)

    neighbours = data["neighbours"];
    // end = data["end"]; Normally this.
    // end = [52.15896289011223, 4.492492679291971] // Sastle coords
    end = [52.164610049352, 4.48653665761824] // Windmill coords
    // start = data["start"];
    start = [52.16583, 4.483413] // Leiden Centraal start
    // start = [52.15835, 4.493067] // Castle start

    markerData = [];
    placedMarkersCoords = new Set();
    numPlacedMarkers = 0;

    markerData = markerData.concat(await loadPoemData("static/csv_files/poems_geocoded.csv"));
    markerData = markerData.concat(await loadCsvData("static/csv_files/restaurants.csv", "food_marker_icon", "box"));
    markerData = markerData.concat(await loadCsvData("static/csv_files/main_landmarks.csv", "end_marker_icon", "full"));
    console.log(markerData);

    console.log(markerData.length + " markers added");

    
}


function addQuest(quest) {
    // This function adds a quest to the quest log and updates the display
    if (!questsSet.has(quest)) {
        quests.push(quest);
        questsSet.add(quest);
        console.log("Added quest " + quest);
    }
}

function completeQuest(quest, newQuestLatitude, newQuestLongitude) {
    if (quests.includes(quest)) {
        changeEnd([newQuestLatitude, newQuestLongitude]);
        console.log("New end: " + end);
        quests = quests.filter(e => e !== quest); // Remove the quest from the quests array
    }
}

function updateQuestLog() {
    questLog.innerHTML = ""; // clear old content
    quests.forEach(quest => {
        const line = document.createElement("div");
        line.textContent = `- ${quest}`;
        questLog.appendChild(line);
    });
}


function showBar(percentage) {

    // This function is a WIP to show the progress done so far

    // Variables for the elements of the progress bar    

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

    // barText.textContent = `Progress: ${percentage}%`;
}



async function loadPoemData(filepath) {
    // Load CSV using D3
    const rows = await d3.dsv(";", filepath);

    const results = [];

    for (const row of rows) {
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);

        // Build the expected image path
        const imgPath = `static/poem_images/${row.id}.jpg`;

        // Build a safe object
        results.push({
            coords: [
                isFinite(lat) ? lat : 0,
                isFinite(lng) ? lng : 0
            ],
            title: row.original_title +
                (row.dutch_title && row.dutch_title !== "EMPTY"
                    ? ` ${row.dutch_title}`
                    : ""),
            author: row.author || "",
            placement_year: row.placement_year || "",
            language: row.language || "",
            image: imgPath,
            icon: "poem_marker_icon",
            style: "box"
        });
    }

    return results;
}

async function loadCsvData(filepath, icon, style) {
    // Load CSV using D3
    const rows = await d3.dsv(";", filepath);

    const results = [];

    for (const row of rows) {
        
        const latitude = parseFloat(row.latitude);
        const longitude = parseFloat(row.longitude);

        // Build the expected image path
        const imgPath = `static/images/${row.image}`;
        const imgPath2 = `static/images/${row.image2}` || '';
        const imgPath3 = `static/images/${row.image3}` || '';

        // Build base object with required fields
        const markerObj = {
            coords: [
                isFinite(latitude) ? latitude : null,
                isFinite(longitude) ? longitude : null
            ],
            image: imgPath,
            image2: imgPath2,
            image3: imgPath3,
            icon: icon,
            style: style
        };

        // Dynamically add all other columns from the CSV
        for (const [key, value] of Object.entries(row)) {
            // Skip the columns we've already processed
            if (!['latitude', 'longitude', 'image', 'image2', 'image3'].includes(key)) {
                markerObj[key] = value;
            }
        }

        results.push(markerObj);
    }

    return results;
}