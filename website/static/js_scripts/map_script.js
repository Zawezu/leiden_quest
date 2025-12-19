// Initialise the map
// let map = L.map('map', {maxZoom: 18, minZoom:15, maxBounds: [[52.13, 4.455],[52.19, 4.53]], zoom: 15, center: [52.1581218,4.4855674]});
let map = L.map('map', {maxZoom: 18, minZoom:18, zoom: 18, center: [52.1581218,4.4855674], zoomControl: false, attributionControl: false,
                        // dragging: false, doubleClickZoom: false, , zoomControl: false, 
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

// // Create startIcon
// startIcon = L.icon({
//     iconUrl: 'static/marker_icons/start_marker_icon.webp',
//     iconSize: [32, 48],
//     iconAnchor: [16, 48],
//     popupAnchor:  [16, 48]
// });

// // Create playerIcon
// playerIcon = L.icon({
//     iconUrl: 'static/marker_icons/player_icon.webp',
//     iconSize: [10, 10],
//     iconAnchor: [5, 5],
//     popupAnchor: [5, 5]
// });

// Create playerIcon
playerIcon = L.icon({
    iconUrl: 'static/marker_icons/player_icon_person.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [16, 16]
});

// Arrow marker (a DivIcon with inline SVG) that will be centered on the player and rotated
let playerArrow = null;
let endLatLng = null;

/**
 * Create a centered arrow marker attached to the map. The arrow is a div containing an SVG
 * so we can rotate it via CSS transform. The marker will be centered on the player (iconAnchor at center).
 * @param {L.Marker} centerMarker - the player marker to center the arrow on
 * @param {Object} [opts] - options {size: number}
 * @returns {L.Marker} the created arrow marker
 */
function createPlayerArrow(centerMarker, opts = {}) {
                // Center the icon on the player's latlng; the arrow graphic will be displaced forward
                // using CSS transform so it appears to move away from the player in the bearing direction.
                const arrowVisualSize = opts.arrowSize || 32; // visual SVG size in px (thinner by default)
                const forwardOffset = (typeof opts.offset === 'number') ? opts.offset : 20; // px to move forward from player

                // total icon area must include room for forward offset in any direction
                const total = arrowVisualSize + forwardOffset * 2;
                const half = Math.floor(total / 2);

                const svg = `
                    <div class="player-arrow" style="width:${total}px;height:${total}px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
                        <svg width="${arrowVisualSize}" height="${arrowVisualSize}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform-origin:50% 50%;">
                            <polygon points="12,2 9,20 12,14 15,20" fill="#e63946" stroke="#000" stroke-width="0.5" />
                        </svg>
                    </div>`;

                const icon = L.divIcon({
                        className: 'player-arrow-wrapper',
                        html: svg,
                        iconSize: [total, total],
                        iconAnchor: [half, half]
                });

                playerArrow = L.marker(centerMarker.getLatLng(), {icon: icon, interactive: false, zIndexOffset: 1500}).addTo(map);
                // store forwardOffset so pointArrowToward can use the same value
                playerArrow._forwardOffset = forwardOffset;
}

/**
 * Calculate the bearing (degrees clockwise from north) between two LatLngs.
 * Uses formula for initial bearing between two geographic coordinates.
 * @param {L.LatLng} from
 * @param {L.LatLng} to
 * @returns {number} bearing in degrees (0-360)
 */
function bearingDegrees(from, to) {
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI; // in degrees
    brng = (brng + 360) % 360; // normalize
    return brng;
}


function pointArrow() {
    // console.log("Arrow marker: ");
    // console.log(playerArrow);
    console.log("End: " + end);
 
    arrowTarget = L.latLng(end);
    if (!playerArrow) return;
    const el = playerArrow.getElement();
    // console.log("el: " + el)
    if (!el) return; // element not yet on DOM

    // Rotate the inner SVG so the arrow graphic faces the target.
    const inner = el.querySelector && el.querySelector('.player-arrow');
    const svgChild = inner && inner.querySelector('svg');
    const targetEl = svgChild || inner || el;

    const from = playerArrow.getLatLng();
    const brng = bearingDegrees(from, arrowTarget);
    // console.log(brng);
    // get forward offset from marker (px). default if missing
    const forward = (playerArrow && playerArrow._forwardOffset) ? playerArrow._forwardOffset : 20;
    // rotate then translate forward in local coordinates (translate uses rotated axes)
    try {
        targetEl.style.transformOrigin = '50% 50%';
        targetEl.style.transform = `rotate(${brng}deg) translate(0, -${forward}px)`;
    } catch (e) {
        console.warn('Could not rotate/translate arrow element', e);
    }
}

function changeEnd(newEnd) {
    end = newEnd;
    pointArrow();
}

// This function declares the necessary variables for the display and functionality of lines and nodes in the map. It is passed  at the start of a round
function startNewRound() {
    // startMarker = L.marker(start, {icon: startIcon, zIndexOffset: -1000}).addTo(map).bindPopup("Start");

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

    // create and position the arrow centered on the player
    if (playerArrow) { playerArrow.remove(); }
    createPlayerArrow(playerMarker);
    // Default arrow target: point to end marker if available
   
    pointArrow();

}

// Clear the variables from the map so that they can be remade in the new round
function clearMap() {
    startMarker.remove();
    playerMarker.remove();
    // endMarker.remove();
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
            // edgeMarker.setOpacity(0)
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
                // console.log(markerDatum.coords)
                const markerDistance = map.distance(comparisonPosition, markerDatum.coords);
                if (markerDistance < VISIBILITY_RADIUS & !placedMarkersCoords.has(markerDatum.coords)) {
                    animatePlaceMarker(markerDatum);
                    placedMarkersCoords.add(markerDatum.coords);  
                    numPlacedMarkers += 1
                    console.log("Current progress: " + numPlacedMarkers + "/" + markerData.length)
                    showBar(numPlacedMarkers / markerData.length * 100)                  
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
    el.style.transform = "translateY(-40px) scale(8)";
    el.style.opacity = "0";

    // Make sure the browser knows we will animate these properties
    // (also provides a fallback if you didn't include CSS)
    el.style.transition =
      "transform 450ms cubic-bezier(.5, 3.0, 2, 2), opacity 300ms ease-out";
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
    map.fitBounds([startMarker.getLatLng(), end], {padding: [0.4, 0.4]});
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
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng]);

        // Keep arrow centered on the player and rotate toward target if set
        if (playerArrow) {
            try {
                playerArrow.setLatLng([lat, lng]);
                pointArrow();
            } catch (e) {
                console.warn('Arrow update failed', e);
            }
        }

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
                // console.log(index)
                if (index % 5 == 0) {
                    checkMarkerDistances()
                }
                dist = map.distance(path[index], path[index+1]);
                // console.log(dist)
                animatePlayer(marker, path[index], path[index + 1], dist*MOVEMENT_SLOWNESS, () => {
                    step(index + 1);
                });
                
            } else {
                checkMarkerDistances();
                resolve()
            }
        }
        step(0)
    });
}

function clamp(x, min, max) {
    return Math.max(min, Math.min(x, max));
}

