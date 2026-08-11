/* ==========================================================
   TerraMind - Add Farm Map
========================================================== */

let map;

let drawnItems;

let drawControl;

let currentPolygon = null;

let polygonGeoJSON = null;


/* ==========================================================
   DOM
========================================================== */

const searchInput = document.getElementById("searchInput");

const searchBtn = document.getElementById("searchBtn");

const saveFarmBtn = document.getElementById("saveFarm");

const areaLabel = document.getElementById("farmArea");

const perimeterLabel = document.getElementById("farmPerimeter");

const verticesLabel = document.getElementById("vertices");

const statusLabel = document.getElementById("status");


/* ==========================================================
   Startup
========================================================== */

document.addEventListener("DOMContentLoaded",()=>{

    initializeMap();

});


/* ==========================================================
   Initialize Map
========================================================== */

function initializeMap(){

    map = L.map("map",{

        zoomControl:true

    }).setView(

        [20.5937,78.9629],

        5

    );

    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            attribution:

            "&copy; OpenStreetMap Contributors"

        }

    ).addTo(map);

    drawnItems = new L.FeatureGroup();

    map.addLayer(drawnItems);

    drawControl = new L.Control.Draw({

        position:"topleft",

        edit:{

            featureGroup:drawnItems,

            remove:true

        },

        draw:{

            polyline:false,

            rectangle:false,

            circle:false,

            marker:false,

            circlemarker:false,

            polygon:{

                allowIntersection:false,

                showArea:true,

                shapeOptions:{

                    color:"#2E7D32",

                    weight:3,

                    fillOpacity:0.25

                }

            }

        }

    });

    map.addControl(drawControl);

}


/* ==========================================================
   Draw Created
========================================================== */

map?.on?.("draw:created",()=>{});

/* Event attached after map creation */

document.addEventListener("DOMContentLoaded",()=>{

    map.on("draw:created",onPolygonCreated);

    map.on("draw:edited",onPolygonEdited);

    map.on("draw:deleted",onPolygonDeleted);

});


/* ==========================================================
   Polygon Created
========================================================== */

function onPolygonCreated(e){

    drawnItems.clearLayers();

    currentPolygon = e.layer;

    drawnItems.addLayer(currentPolygon);

    polygonGeoJSON = currentPolygon.toGeoJSON();

    statusLabel.textContent = "Polygon Ready";

}


/* ==========================================================
   Polygon Edited
========================================================== */

function onPolygonEdited(){

    drawnItems.eachLayer(layer=>{

        currentPolygon = layer;

        polygonGeoJSON = layer.toGeoJSON();

    });

}


/* ==========================================================
   Polygon Deleted
========================================================== */

function onPolygonDeleted(){

    currentPolygon = null;

    polygonGeoJSON = null;

    areaLabel.textContent = "--";

    perimeterLabel.textContent = "--";

    verticesLabel.textContent = "0";

    statusLabel.textContent = "Waiting";

}


/* ==========================================================
   Helpers
========================================================== */

function getPolygon(){

    return polygonGeoJSON;

}
/* ==========================================================
   Search Location
========================================================== */

let searchMarker = null;

if(searchBtn){

    searchBtn.addEventListener("click", searchLocation);

}

if(searchInput){

    searchInput.addEventListener("keydown",(e)=>{

        if(e.key==="Enter"){

            e.preventDefault();

            searchLocation();

        }

    });

}


/* ==========================================================
   Search
========================================================== */

async function searchLocation(){

    const query = searchInput.value.trim();

    if(query===""){

        alert("Please enter a location.");

        return;

    }

    try{

        searchBtn.disabled = true;

        searchBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm"></span>
            Searching...
        `;

        const response = await fetch(

            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`

        );

        const data = await response.json();

        if(data.length===0){

            alert("Location not found.");

            resetSearchButton();

            return;

        }

        const place = data[0];

        const lat = parseFloat(place.lat);

        const lon = parseFloat(place.lon);

        moveToLocation(lat,lon);

        await reverseGeocode(lat,lon);

    }

    catch(error){

        console.error(error);

        alert("Unable to search location.");

    }

    finally{

        resetSearchButton();

    }

}


/* ==========================================================
   Move Map
========================================================== */

function moveToLocation(lat,lon){

    map.flyTo(

        [lat,lon],

        17,

        {

            animate:true,

            duration:1.5

        }

    );

    if(searchMarker){

        map.removeLayer(searchMarker);

    }

    searchMarker = L.marker([lat,lon],{

        title:"Farm Location"

    });

    searchMarker

        .addTo(map)

        .bindPopup("Selected Location")

        .openPopup();

}


/* ==========================================================
   Reverse Geocoding
========================================================== */

async function reverseGeocode(lat,lon){

    try{

        const response = await fetch(

            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`

        );

        const result = await response.json();

        const address = result.address || {};

        document.getElementById("village").value =
            address.village ||
            address.hamlet ||
            address.town ||
            address.city ||
            "";

        document.getElementById("district").value =
            address.county ||
            address.state_district ||
            "";

        document.getElementById("state").value =
            address.state ||
            "";

    }

    catch(err){

        console.error(err);

    }

}


/* ==========================================================
   Reset Button
========================================================== */

function resetSearchButton(){

    searchBtn.disabled = false;

    searchBtn.innerHTML = "Search";

}
/* ==========================================================
   Polygon Statistics
========================================================== */

function updatePolygonStats(){

    if(!currentPolygon){

        return;

    }

    polygonGeoJSON = currentPolygon.toGeoJSON();

    /* ---------- Area ---------- */

    const areaSqMeters = turf.area(polygonGeoJSON);

    const areaHa = areaSqMeters / 10000;

    areaLabel.textContent =
        areaHa.toFixed(2) + " ha";

    /* ---------- Perimeter ---------- */

    const line = turf.polygonToLine(polygonGeoJSON);

    const perimeterKm = turf.length(line,{units:"kilometers"});

    perimeterLabel.textContent =
        (perimeterKm * 1000).toFixed(0) + " m";

    /* ---------- Vertices ---------- */

    const coords =
        polygonGeoJSON.geometry.coordinates[0];

    verticesLabel.textContent =
        coords.length - 1;

    statusLabel.textContent =
        "Ready to Save";

}


/* ==========================================================
   Validation
========================================================== */

function validatePolygon(){

    if(!currentPolygon){

        alert("Please draw your farm boundary.");

        return false;

    }

    const coords =
        polygonGeoJSON.geometry.coordinates[0];

    if(coords.length < 4){

        alert("Invalid polygon.");

        return false;

    }

    const area =
        turf.area(polygonGeoJSON);

    if(area < 100){

        alert("Farm boundary is too small.");

        return false;

    }

    return true;

}


/* ==========================================================
   Polygon Created
========================================================== */

function onPolygonCreated(e){

    drawnItems.clearLayers();

    currentPolygon = e.layer;

    drawnItems.addLayer(currentPolygon);

    polygonGeoJSON =
        currentPolygon.toGeoJSON();

    updatePolygonStats();

}


/* ==========================================================
   Polygon Edited
========================================================== */

function onPolygonEdited(){

    drawnItems.eachLayer(layer=>{

        currentPolygon = layer;

        polygonGeoJSON = layer.toGeoJSON();

    });

    updatePolygonStats();

}


/* ==========================================================
   Polygon Deleted
========================================================== */

function onPolygonDeleted(){

    currentPolygon = null;

    polygonGeoJSON = null;

    areaLabel.textContent = "--";

    perimeterLabel.textContent = "--";

    verticesLabel.textContent = "0";

    statusLabel.textContent = "Waiting";

}


/* ==========================================================
   Get Polygon Data
========================================================== */

function getFarmGeometry(){

    if(!polygonGeoJSON){

        return null;

    }

    const center =
        turf.centroid(polygonGeoJSON);

    return{

        geometry:polygonGeoJSON,

        latitude:center.geometry.coordinates[1],

        longitude:center.geometry.coordinates[0],

        area:turf.area(polygonGeoJSON)/10000

    };

}
/* ==========================================================
   Bounding Box
========================================================== */

function getBoundingBox() {

    if (!polygonGeoJSON) return null;

    return turf.bbox(polygonGeoJSON);

}


/* ==========================================================
   Farm Payload
========================================================== */

function buildFarmPayload() {

    const geometry = getFarmGeometry();

    if (!geometry) {

        return null;

    }

    return {

        farm_name: document.getElementById("farmName").value.trim(),

        crop: document.getElementById("crop").value,

        village: document.getElementById("village").value,

        district: document.getElementById("district").value,

        state: document.getElementById("state").value,

        notes: document.getElementById("notes").value,

        area: geometry.area,

        latitude: geometry.latitude,

        longitude: geometry.longitude,

        centroid: {

            lat: geometry.latitude,

            lon: geometry.longitude

        },

        bbox: getBoundingBox(),

        boundary: geometry.geometry

    };

}


/* ==========================================================
   Save Farm
========================================================== */

if (saveFarmBtn) {

    saveFarmBtn.addEventListener("click", saveFarm);

}


async function saveFarm() {

    if (!validatePolygon()) {

        return;

    }

    const payload = buildFarmPayload();

    if (!payload.farm_name) {

        alert("Please enter a farm name.");

        return;

    }

    try {

        saveFarmBtn.disabled = true;

        saveFarmBtn.innerHTML = `

            <span class="spinner-border spinner-border-sm"></span>

            Saving Farm...

        `;

        const response = await fetch("/api/farms", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify(payload)

        });

        const result = await response.json();

        if (!response.ok) {

            throw new Error(result.message || "Unable to save farm.");

        }

        showToast("Farm saved successfully!");

        setTimeout(() => {

            window.location.href = "/dashboard";

        }, 1200);

    }

    catch (err) {

        console.error(err);

        alert(err.message);

    }

    finally {

        saveFarmBtn.disabled = false;

        saveFarmBtn.innerHTML = `

            <i class="bi bi-floppy"></i>

            Save Farm

        `;

    }

}


/* ==========================================================
   Toast
========================================================== */

function showToast(message) {

    const toast = document.createElement("div");

    toast.className = "tm-toast";

    toast.innerHTML = `

        <i class="bi bi-check-circle-fill"></i>

        ${message}

    `;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("show");

    }, 100);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, 2500);

}


/* ==========================================================
   Debug
========================================================== */

window.getFarmPayload = buildFarmPayload;

console.log("🌱 TerraMind Map Loaded");