/* ==========================================================
   TerraMind - Edit Farm Map
   Same as map.js, but loads an existing farm's data/boundary
   on start and saves via PUT instead of creating a new farm.
========================================================== */

const FARM_ID = document.body.dataset.farmId;

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

document.addEventListener("DOMContentLoaded", () => {

    initializeMap();

    map.on("draw:created", onPolygonCreated);
    map.on("draw:edited", onPolygonEdited);
    map.on("draw:deleted", onPolygonDeleted);

    loadExistingFarm();

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
   Load Existing Farm
========================================================== */

async function loadExistingFarm(){

    if(!FARM_ID){
        statusLabel.textContent = "No farm selected.";
        return;
    }

    try{

        const response = await fetch(`/api/farms/${FARM_ID}`);

        if(!response.ok){
            throw new Error("Farm not found.");
        }

        const farm = await response.json();

        document.getElementById("farmName").value = farm.farm_name || "";
        document.getElementById("village").value = farm.village || "";
        document.getElementById("district").value = farm.district || "";
        document.getElementById("state").value = farm.state || "";
        document.getElementById("notes").value = farm.notes || "";

        const cropSelect = document.getElementById("crop");

        if(farm.crop){
            const match = Array.from(cropSelect.options)
                .find(opt => opt.value.toLowerCase() === farm.crop.toLowerCase());
            if(match){
                cropSelect.value = match.value;
            }
        }

        if(farm.boundary){

            const layer = L.geoJSON(farm.boundary).getLayers()[0];

            drawnItems.addLayer(layer);
            currentPolygon = layer;
            polygonGeoJSON = layer.toGeoJSON();

            map.fitBounds(layer.getBounds(), { padding: [40, 40] });

            updatePolygonStats();

        }
        else if(farm.latitude && farm.longitude){

            map.setView([farm.latitude, farm.longitude], 15);
            statusLabel.textContent = "No boundary drawn yet";

        }

    }
    catch(err){

        console.error(err);
        statusLabel.textContent = "Failed to load farm";
        alert("Unable to load this farm's data.");

    }

}


/* ==========================================================
   Polygon Created / Edited / Deleted
========================================================== */

function onPolygonCreated(e){

    drawnItems.clearLayers();

    currentPolygon = e.layer;

    drawnItems.addLayer(currentPolygon);

    polygonGeoJSON = currentPolygon.toGeoJSON();

    updatePolygonStats();

}

function onPolygonEdited(){

    drawnItems.eachLayer(layer=>{

        currentPolygon = layer;

        polygonGeoJSON = layer.toGeoJSON();

    });

    updatePolygonStats();

}

function onPolygonDeleted(){

    currentPolygon = null;

    polygonGeoJSON = null;

    areaLabel.textContent = "--";

    perimeterLabel.textContent = "--";

    verticesLabel.textContent = "0";

    statusLabel.textContent = "Waiting";

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

    const areaSqMeters = turf.area(polygonGeoJSON);

    const areaHa = areaSqMeters / 10000;

    areaLabel.textContent =
        areaHa.toFixed(2) + " ha";

    const line = turf.polygonToLine(polygonGeoJSON);

    const perimeterKm = turf.length(line,{units:"kilometers"});

    perimeterLabel.textContent =
        (perimeterKm * 1000).toFixed(0) + " m";

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
   Save Farm (PUT — updates the existing farm)
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

            Saving Changes...

        `;

        const response = await fetch(`/api/farms/${FARM_ID}`, {

            method: "PUT",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify(payload)

        });

        const result = await response.json();

        if (!response.ok) {

            throw new Error(result.message || "Unable to save changes.");

        }

        showToast("Farm updated successfully!");

        setTimeout(() => {

            window.location.href = "/farms";

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

            Save Changes

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


console.log("🌱 TerraMind Edit Farm Map Loaded");
