// Initialise the map
// let map = L.map('map', {maxZoom: 18, minZoom:15, maxBounds: [[52.13, 4.455],[52.19, 4.53]], zoom: 15, center: [52.1581218,4.4855674]});
let map = L.map('map', {maxZoom: 18, minZoom:18, zoom: 18, center: [52.1581218,4.4855674],
                        // dragging: false, doubleClickZoom: false, boxZoom: false, zoomControl: false, 
                        updateWhenIdle: false, maxBounds: [[52.13, 4.455],[52.19, 4.53]]});


const VISIBILITY_RADIUS = 100; // show markers within VISIBILITY_RADIUS meters.
const MOVEMENT_SLOWNESS = 10; // move with a partivular speed. The larger this value, the slower the movement
// Create the map layer and add it to the map
// var mapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
// attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// }).addTo(map);  

var mapLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);

// Create circleIcon
circleIcon = L.icon({
    iconUrl: 'static/marker_icons/circle_icon.webp',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [16, 16]
});

// Create startIcon
startIcon = L.icon({
    iconUrl: 'static/marker_icons/start_marker_icon.webp',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor:  [16, 48]
});

// Create endIcon
endIcon = L.icon({
    iconUrl: 'static/marker_icons/end_marker_icon.webp',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor:  [16, 48]
});

// Create playerIcon
playerIcon = L.icon({
    iconUrl: 'static/marker_icons/player_icon.webp',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [5, 5]
});


// const markerData = [
//     {
//     coords: [52.161970089412556, 4.484630945127542],
//     title: "El Gaucho",
//     text: "Delicious empanadas",
//     image: "static/images/empanadas.jpeg",
//     questStart: "Eat empanadas",
//     },
//     {
//     coords: [52.16294805799125, 4.484440664829482],
//     title: "X falafel",
//     text: "Crispy kip",
//     image: "static/images/X-Falafel.png",
//     },
//     {
//     coords: [52.16284763059071, 4.484968637263583],
//     title: "M Noodle Bar",
//     text: "Tasty ramen",
//     image: "static/images/ramen.jpg.webp",
//     questStart: "Go to the pancake place",
//     },
//     {
//     coords: [52.16286256892617, 4.485263831974263],
//     title: "Pannenkoekenhuis de Schaapsbel",
//     text: "Delicious pancakes",
//     image: "static/images/pancakes.jpg",
//     questEnd: "Go to the pancake place"
//     },
//     {
//     coords: [52.15852231740921, 4.4913050545237905],
//     title: "Visfontein",
//     text: 'The fountain dates from 1693. At the time, the city council wanted to ensure that fish sellers at the fish market had sufficient clean water for hygiene reasons. The fountain only operated on market days. In 1996, archaeologists discovered that the water that spouted from the fountain at that time must have originated from the higher-lying castle. In the castle hill, they found not only a water cellar with a sand floor below the surface water level, but also two reservoirs. These could have stored the purified groundwater from the cellar. Furthermore, the archaeologists discovered a connection between these reservoirs and the fish fountain, even passing under the Nieuwe Rijn. The ten-meter height difference ensured that the fountain "spouted".',
//     image: "static/images/visfontein.jpg",
//     },
// ]

// // This adds the markers for all the landmarks
// const markers = markerData.map((data) => {
//     const marker = L.marker(data.coords); // start hidden
//     marker._data = data; // store data for modal use
//     marker.on('click', () => openModal(data));
//     return marker;
// });




// This function declares the necessary variables for the display and functionality of lines and nodes in the map. It is passed  at the start of a round
function startNewRound() {
    startMarker = L.marker(start, {icon: startIcon, zIndexOffset: -1000}).addTo(map).bindPopup("Start");
    endMarker = L.marker(end, {icon: endIcon, zIndexOffset: -999}).addTo(map).bindPopup("End");

    edgeMarker = L.marker(end, {icon: endIcon, zIndexOffset: -998}).addTo(map).bindPopup("");

    // The path represents the list of nodes through which the user has passed
    // The detailed path contains all the subnodes going from node to node in order to create a more detailed path with curves
    detailedPath = [];

    pathLine = L.polyline(detailedPath, {color: '#2e80d1'})
    currentPosition = start;
    neighbourMarkers = [];
    playerMarker = L.marker(currentPosition, {icon: playerIcon}).addTo(map).bindPopup("Current position");
    requestNeighbours(start);


    // map.fitBounds([startMarker.getLatLng(), endMarker.getLatLng()], {padding: [0.4, 0.4]}); // Before, this line set the view so the start and end nodes both on screen
    // map.setMinZoom(14);
    map.setView(currentPosition) // Not the view centers over the player
}

// Clear the variables from the map so that they can be remade in the new round
function clearMap() {
    startMarker.remove();
    playerMarker.remove();
    endMarker.remove();
    pathLine.remove();
    neighbourMarkers.forEach(function(marker) {marker.remove()});
    console.log("Cleared map")
}

// This function creates markers that represent all the adjacent nodes (neighbours)
    function showNeighbours() {
    // Remove all the existing markers for neighbours
    // playerMarker.remove();
    
    // playerMarker = L.marker(currentPosition, {icon: playerIcon}).addTo(map).bindPopup("Current position");
    neighbourMarkers = [];
    let neighbourSubpaths = [];

    for (duo of neighbours) {
        let endPoint = duo[0],
        subpath = duo[1];
        

        let marker = L.marker([parseFloat(endPoint[0]), parseFloat(endPoint[1])], {icon: circleIcon}).addTo(map).bindPopup("");
        neighbourMarkers.push(marker);
        neighbourSubpaths.push(subpath);
        marker.on('click', async function(e) {
            // When a marker is clicked, look for this marker in neighbourMarkers and add all its subnodes to the detailed path
            let i = 0;
            for (neighbourMarker of neighbourMarkers) {
                if (neighbourMarker.getLatLng().equals(e.latlng)) {
                    for (subnode of neighbourSubpaths[i]) {detailedPath.push(subnode)};
                    break;
                }
                i++;
            }

            // Update the position and add the neighbour to the map. Display a updated path line on the map
            
            marker.closePopup();
            neighbourMarkers.forEach(function(marker) {marker.remove()});
            edgeMarker.setOpacity(0)
            await moveAlongPositions(playerMarker, subpath);
            currentPosition = playerMarker.getLatLng()
            console.log("Moved to " + currentPosition)

           


            // If the clicked-on marker is at the end position, show the path line, remove all the currently shown neighbours and end the round
            if (e.latlng.equals(end)) {
                endRound();
            }
            // Otherwise, request neighbours for the new position
            else {
                requestNeighbours([e.latlng["lat"], e.latlng["lng"]]);
            }
        })


    }
}

function checkMarkerDistances() {
    const comparisonPosition =  playerMarker.getLatLng()
    markerData.forEach((markerDatum) => {
                const markerDistance = map.distance(comparisonPosition, markerDatum.coords);
                if (markerDistance < VISIBILITY_RADIUS & !placedMarkersCoords.has(markerDatum.coords)) {
                    animatePlaceMarker(markerDatum);
                    placedMarkersCoords.add(markerDatum.coords);                    
                }
                // marker._data.push()
            });
}


function animatePlaceMarker(markerDatum, finalIconSize = [32, 40], mapInstance = map) {
    // Create element for DivIcon
    const el = document.createElement('div');
    el.classList.add('pop-marker'); // optional if you also have CSS
    el.style.width = finalIconSize[0] + "px";
    el.style.height = finalIconSize[1] + "px";
    el.style.backgroundImage = `url(static/marker_icons/${markerDatum.icon}.webp)`;
    el.style.backgroundSize = "100% 100%";
    el.style.backgroundRepeat = "no-repeat";
    el.style.display = "block";

    // Initial visual state: large, up above, invisible
    el.style.transform = "translateY(-40px) scale(4)";
    el.style.opacity = "0";

    // Make sure the browser knows we will animate these properties
    // (also provides a fallback if you didn't include CSS)
    el.style.transition =
      "transform 450ms cubic-bezier(.25, 1.5, .5, 1), opacity 300ms ease-out";
    el.style.willChange = "transform, opacity";
    el.style.transformOrigin = "center bottom";

    // Build DivIcon and add marker to map
    const icon = L.divIcon({
        className: '',      // keep Leaflet from adding its own styles
        html: el,
        iconSize: [finalIconSize[0], finalIconSize[1]],
        // anchor at bottom-center so translateY looks natural
        iconAnchor: [finalIconSize[0] / 2, finalIconSize[1] / 2]
    });

    const marker = L.marker(markerDatum.coords, { icon }).addTo(mapInstance);

    marker._data = markerDatum; // store data for modal use
    marker.on('click', () => openModal(markerDatum));

    // Ensure the element is in DOM and initial styles are rendered.
    // Use double requestAnimationFrame to guarantee a separate frame.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Final state: positioned, normal size, and visible
            el.style.transform = "translateY(0) scale(1)";
            el.style.opacity = "1";

            // Optionally remove will-change after animation ends to avoid layer promotion forever
            el.addEventListener('transitionend', function cleanup(e) {
                if (e.propertyName === 'transform') {
                    el.style.willChange = '';
                    el.removeEventListener('transitionend', cleanup);
                }
            });
        });
    });

    return marker;
}

function endRound() {
    map.setMinZoom(13);
    map.fitBounds([startMarker.getLatLng(), endMarker.getLatLng()], {padding: [0.4, 0.4]});
    pathLine.setLatLngs(detailedPath);
    pathLine.addTo(map);
    neighbourMarkers.forEach(function(marker) {marker.remove()});
    playerMarker.remove();
}

// Function to animate between two points
function animatePlayer(marker, from, to, duration, callback) {
    const start = performance.now();

    function animate(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1); // progress (0–1)

        // Linear interpolation
        const lat = from[0] + (to[0] - from[0]) * t;
        const lng = from[1] + (to[1] - from[1]) * t;
        // console.log(marker.getLatLng())
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng]);

        if (t < 1) {
            requestAnimationFrame(animate);
        } else if (callback) {
            callback();
        }
    }
    requestAnimationFrame(animate);
}

// Recursive animation through the list
function moveAlongPositions(marker, path) {
    return new Promise((resolve) => {
        function step(index) {
            if (index < path.length - 1) {
                // xDist = path[index][0] - path[index+1][0];
                // yDist = path[index][1] - path[index+1][1];
                // dist = Math.sqrt(xDist**2 + yDist**2);
                console.log(index)
                if (index % 5 == 0) {
                    checkMarkerDistances()
                }
                dist = map.distance(path[index], path[index+1]);
                console.log(dist)
                animatePlayer(marker, path[index], path[index + 1], dist*MOVEMENT_SLOWNESS, () => {
                    step(index + 1);
                });
                
            } else {
                checkMarkerDistances();
                updateEdgeMarker();
                resolve()
            }
        }
        step(0)
    });
}

function clamp(x, min, max) {
    return Math.max(min, Math.min(x, max));
}

function updateEdgeMarker() {
    const bounds = map.getBounds();
    const realMarkerLatLng = endMarker.getLatLng();

    // If real marker is in view → hide edge marker
    if (bounds.contains(realMarkerLatLng)) {
        edgeMarker.setOpacity(0);
        return;
    }

    const mapSize = map.getSize();
    const center = map.getCenter();

    const centerPt = map.latLngToContainerPoint(center);
    const markerPt = map.latLngToContainerPoint(realMarkerLatLng);

    const dx = markerPt.x - centerPt.x;
    const dy = markerPt.y - centerPt.y;

    const slope = dy / dx;

    let x, y;
    const padding = 30; // distance from edge to place the marker

    // Determine whether the line hits vertical or horizontal edge first
    if (Math.abs(slope) < mapSize.y / mapSize.x) {
        // Hits left or right edge first
        if (dx > 0) {
            x = mapSize.x - padding; // right edge
            y = centerPt.y + slope * (x - centerPt.x);
        } else {
            x = padding; // left edge
            y = centerPt.y + slope * (x - centerPt.x);
        }
    } else {
        // Hits top or bottom
        if (dy > 0) {
            y = mapSize.y - padding; // bottom
            x = centerPt.x + (y - centerPt.y) / slope;
        } else {
            y = padding; // top
            x = centerPt.x + (y - centerPt.y) / slope;
        }
    }

    // Clamp within map container
    x = clamp(x, padding, mapSize.x - padding);
    y = clamp(y, padding, mapSize.y - padding);

    // Convert container point → lat/lng and move fake marker
    const latlng = map.containerPointToLatLng([x, y]);

    edgeMarker.setLatLng(latlng);
    edgeMarker.setOpacity(1); // show edge marker
}