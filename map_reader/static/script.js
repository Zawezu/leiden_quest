const logo = document.getElementById('logo');
const startGame = document.getElementById('startGame');
const content = document.querySelector('.content');
const gameExplanation = document.querySelector('#gameExplanation');
const panoramaContainer = document.getElementById('panoramaContainer')

const resetButton = document.getElementById("reset");
const nextRoundButton = document.getElementById("nextRoundButton");
const openPanoramaButton = document.getElementById("openPanoramaButton");

// Add onclicks 
if (startGame) startGame.onclick = firstStart;
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
const infoOverlay = document.querySelector('#infoOverlay');

// Initialization of the information popup for landmarks
const modal = document.getElementById('infoModal');
const closeModalBtn = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalImage = document.getElementById('modalImage');
const modalBasicInfo = document.getElementById('modalBasicInfo')


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

function firstStart() {
    // This function hides the game explanation and starts the game

    gameExplanation.style.display = "none";
    infoOverlay.style.display = "block";
    initializeGame();
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
        // score = 0;
        // scoreText.innerHTML = score;
        addQuest("Go to the castle");
        updateQuestLog();
        const data = await initializeFlask();
        console.log(data);
        console.log("Data received");
        loadData(data);
        markerData = [];
        placedMarkersCoords = new Set();
        markerData = markerData.concat(await loadPoemData("static/poems_geocoded.csv"));
        markerData = markerData.concat(await loadCsvData("static/restaurants.csv", "food_marker_icon"));
        console.log(markerData);
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
    // start = data["start"];
    start = [52.16583, 4.483413]
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
    modalBasicInfo.style.display = 'block';
    
    // Clear any previous additional info
    const existingInfo = modalBasicInfo.querySelectorAll('.modalAdditionalInfo');
    existingInfo.forEach(el => el.remove());
    
    // Add author if available
    if (data.author) {
        const authorEl = document.createElement("p");
        authorEl.className = "modalText modalAdditionalInfo";
        authorEl.textContent = `Author: ${data.author}`;
        modalBasicInfo.appendChild(authorEl);
    }
    
    // Add placement year if available
    if (data.placement_year) {
        const yearEl = document.createElement("p");
        yearEl.className = "modalText modalAdditionalInfo";
        yearEl.textContent = `Placement year: ${data.placement_year}`;
        modalBasicInfo.appendChild(yearEl);
    }
    
    // Add language if available
    if (data.language) {
        const langEl = document.createElement("p");
        langEl.className = "modalText modalAdditionalInfo";
        langEl.textContent = `Language: ${data.language}`;
        modalBasicInfo.appendChild(langEl);
    }
    
    // Add rating if available
    if (data.rating) {
        const ratingEl = document.createElement("p");
        ratingEl.className = "modalText modalAdditionalInfo";
        ratingEl.textContent = `Rating: ${data.rating}/5`;
        modalBasicInfo.appendChild(ratingEl);
    }
    
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

openPanoramaButton.addEventListener('click', () => {
    console.log("Opening panorama");

    // Ensure basic info hidden and container visible before creating viewer
    modalBasicInfo.style.display = 'none';
    panoramaContainer.style.display = 'block';

    // Clean up any previous viewer and leftover DOM
    if (window.panoramaViewer) {
        try {
            if (typeof window.panoramaViewer.dispose === 'function') {
                window.panoramaViewer.dispose();
            }
        } catch (e) {
            console.warn('Error disposing previous panoramaViewer', e);
        }
        try { panoramaContainer.innerHTML = ''; } catch (_) {}
        window.panoramaViewer = null;
    }

    // Create panorama image and viewer
    const panoramaImage = new PANOLENS.ImagePanorama("static/360_images/KPNO-Drone-360-2-CC2.jpg");

    window.panoramaViewer = new PANOLENS.Viewer({
        container: panoramaContainer,
    });

    window.panoramaViewer.add(panoramaImage);

    // Request fullscreen helper (vendor fallbacks)
    function requestFullscreen(el) {
        if (!el) return Promise.reject(new Error('No element'));
        if (el.requestFullscreen) return el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
        if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
        if (el.msRequestFullscreen) return el.msRequestFullscreen();
        return Promise.reject(new Error('Fullscreen API not supported'));
    }

    // Handler to dispose and hide when exiting fullscreen
    function onFullscreenChange() {
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
        if (!fsElement) {
            // Exit fullscreen: dispose viewer and hide container
            if (window.panoramaViewer) {
                try {
                    if (typeof window.panoramaViewer.dispose === 'function') {
                        window.panoramaViewer.dispose();
                    }
                } catch (e) {
                    console.warn('Error disposing panoramaViewer on fullscreen exit', e);
                }
                try { panoramaContainer.innerHTML = ''; } catch (_) {}
                window.panoramaViewer = null;
            }

            panoramaContainer.style.display = 'none';
            modalBasicInfo.style.display = 'block';

            // Remove listeners
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
            document.removeEventListener('mozfullscreenchange', onFullscreenChange);
            document.removeEventListener('MSFullscreenChange', onFullscreenChange);
        }
    }

    // Add fullscreen change listeners (vendor prefixes)
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    // Request fullscreen immediately (still inside user click handler)
    requestFullscreen(panoramaContainer)
        .catch((err) => {
            // If fullscreen fails, the viewer still remains visible in the page.
            console.warn('Fullscreen request failed or not supported:', err);
        });
});


async function loadPoemData(filepath) {
    // Load CSV using D3
    const rows = await d3.dsv(";", filepath);

    const results = [];

    for (const row of rows) {
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);

        // Build the expected image path
        const imgPath = `static/poem_images/${row.id}.jpeg`;

        // Check whether the image exists
        const imageExists = await fetch(imgPath, { method: "HEAD" })
            .then(res => res.ok)
            .catch(() => false);

        // Skip poem if image is missing
        if (!imageExists) continue;

        // Build a safe object
        results.push({
            coords: [
                isFinite(lat) ? lat : null,
                isFinite(lng) ? lng : null
            ],
            title: row.original_title +
                (row.dutch_title && row.dutch_title !== "EMPTY"
                    ? ` ${row.dutch_title}`
                    : ""),
            author: row.author || "",
            placement_year: row.placement_year || "",
            language: row.language || "",
            image: imgPath,
            icon: "poem_marker_icon"
        });
    }

    return results;
}

async function loadCsvData(filepath, icon) {
    // Load CSV using D3
    const rows = await d3.dsv(";", filepath);

    const results = [];

    for (const row of rows) {
        const latitude = parseFloat(row.latitude);
        const longitude = parseFloat(row.longitude);

        // Build the expected image path
        const imgPath = `static/images/${row.image}`;

        // Check whether the image exists
        const imageExists = await fetch(imgPath, { method: "HEAD" })
            .then(res => res.ok)
            .catch(() => false);

        // Skip if image is missing
        if (!imageExists) continue;

        // Build base object with required fields
        const markerObj = {
            coords: [
                isFinite(latitude) ? latitude : null,
                isFinite(longitude) ? longitude : null
            ],
            image: imgPath,
            icon: icon
        };

        // Dynamically add all other columns from the CSV
        for (const [key, value] of Object.entries(row)) {
            // Skip the columns we've already processed
            if (!['latitude', 'longitude', 'image'].includes(key)) {
                markerObj[key] = value;
            }
        }

        results.push(markerObj);
    }

    return results;
}