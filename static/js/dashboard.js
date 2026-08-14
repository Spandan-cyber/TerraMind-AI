/* ============================================
   TerraMind Dashboard
============================================ */

const Dashboard = {

    user: null,

    profile: null,

    farms: [],

    weather: null,

    history: []

};

const logoutBtn =

document.getElementById("logoutBtn");

if(logoutBtn){

    logoutBtn.addEventListener(

        "click",

        logout

    );

}

/* ============================================
   Coding Weather Icons Reference:
============================================ */
function getWeatherIcon(weatherCode) {

    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;

    if (isNight) {
        switch (weatherCode) {
            case 0: return "🌙";
            case 1: return "🌙☁️";
            case 2: return "☁️🌙";
            case 3: return "☁️";
            case 45:
            case 48: return "🌫️";
            case 51:
            case 53:
            case 55: return "🌦️";
            case 61:
            case 63:
            case 65:
            case 80:
            case 81:
            case 82: return "🌧️";
            case 71:
            case 73:
            case 75: return "❄️";
            case 95:
            case 96:
            case 99: return "🌩️";
            default: return "🌙";
        }
    }

    switch (weatherCode) {
        case 0: return "☀️";
        case 1: return "🌤️";
        case 2: return "⛅";
        case 3: return "☁️";
        case 45:
        case 48: return "🌫️";
        case 51:
        case 53:
        case 55: return "🌦️";
        case 61:
        case 63:
        case 65:
        case 80:
        case 81:
        case 82: return "🌧️";
        case 71:
        case 73:
        case 75: return "❄️";
        case 95:
        case 96:
        case 99: return "⛈️";
        default: return "☀️";
    }
}




/* ============================================
   DOM
============================================ */

const UI = {

    userName: document.getElementById("userName"),

    heroUser: document.getElementById("heroUser"),

    welcomeTitle: document.getElementById("welcomeTitle"),

    currentLocation: document.getElementById("currentLocation"),

    weatherCity: document.getElementById("weatherCity"),

    currentTemp: document.getElementById("currentTemp"),

    weatherCondition: document.getElementById("weatherCondition"),

    farmCount: document.getElementById("farmCount"),

    farmArea: document.getElementById("farmArea"),

    analysisCount: document.getElementById("analysisCount"),

    healthyFarms: document.getElementById("healthyFarms"),

    farmGrid: document.getElementById("farmGrid"),

    weatherContainer: document.getElementById("weatherContainer"),

    historyContainer: document.getElementById("historyContainer"),

    adviceContainer: document.getElementById("adviceContainer")

};


/* ============================================
   API
============================================ */

const API = {

    async get(url){

        const res = await fetch(url);

        if(!res.ok){

            throw new Error(await res.text());

        }

        return await res.json();

    }

};


/* ============================================
   Startup
============================================ */

window.addEventListener("DOMContentLoaded", async ()=>{

    try{

        await loadDashboard();

    }

    catch(err){

        console.error(err);

    }

});


/* ============================================
   Main
============================================ */

async function loadDashboard(){

    await loadUser();

    await loadFarms();

    await loadWeather();

    await loadAllFarmsWeather();

    await loadHistory();

    renderStatistics();

    renderFarmOverview();

    renderLatestAnalysis();

    await loadSummary();

}
/* ============================================
   USER
============================================ */

function getInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join("");
}

function updateAvatar(user){

    const img = document.getElementById("userAvatarImage");
    const avatar = document.getElementById("userAvatar");

    if(user.profile_image){

        img.src = user.profile_image;

        img.style.display = "block";
        img.onerror = () => {
            img.style.display = "none";
            avatar.style.display = "flex";
            avatar.textContent = getInitials(user.full_name || "U");
        };
        avatar.style.display = "none";

    }else{

        avatar.textContent = getInitials(user.full_name);

        img.style.display = "none";
        avatar.style.display = "flex";
    }

}

async function loadUser(){

    Dashboard.user = await API.get("/api/me");

    UI.userName.textContent =
        Dashboard.user.full_name || "Farmer";

    if (UI.heroUser && !document.querySelector('.typing-cursor')) {
        UI.heroUser.textContent =
            Dashboard.user.full_name || "Farmer";
    }

    UI.farmCount.textContent =
        Dashboard.user.farm_count;

    UI.farmArea.textContent =
        Dashboard.user.total_area + " ha";

    UI.healthyFarms.textContent =
        Dashboard.user.healthy_farms;

    updateGreeting();

    updateAvatar(Dashboard.user);

}


/* ============================================
   GREETING
============================================ */

function updateGreeting(){

    const hour = new Date().getHours();

    let text = "Good Evening";

    if(hour < 12){

        text = "Good Morning";

    }

    else if(hour < 17){

        text = "Good Afternoon";

    }

    UI.welcomeTitle.textContent =
        `${text} 👋`;

}


/* ============================================
   FARMS
============================================ */

async function loadFarms(){

    try{

        const data = await API.get("/api/farms");
        Dashboard.farms = Array.isArray(data) ? data : (data?.farms || []);

        renderFarms();

        renderStatistics();

    }

    catch(e){

        console.error("Failed to load farms:", e);
        Dashboard.farms = [];

    }

}

/* ============================================
    LOGOUT  
============================================ */
async function logout(event){

    event.preventDefault();

    try{

        const response = await fetch(

            "/api/logout",

            {

                method:"POST"

            }

        );

        const result =

            await response.json();

        if(result.success){

            window.location="/login";

        }

    }

    catch(error){

        console.error(error);

        alert(

            "Logout failed."

        );

    }

}


/* ============================================
   STATISTICS
============================================ */

function renderStatistics(){

    // Already populated by /api/me
    if(Dashboard.user){

        UI.farmCount.textContent =
            Dashboard.user.farm_count;

        UI.farmArea.textContent =
            Dashboard.user.total_area + " ha";

        UI.healthyFarms.textContent =
            Dashboard.user.healthy_farms;
    }

    // Only analysis count comes from history
    UI.analysisCount.textContent =
        Dashboard.history.length;

}


/* ============================================
   FARMS GRID
============================================ */

// Function to render the farm cards into the grid
function renderFarms(farmsData) {
    const data = farmsData !== undefined ? (farmsData.farms || farmsData) : (Dashboard.farms || []);
    const farmGrid = document.getElementById('farmGrid') || (UI && UI.farmGrid);
    if (!farmGrid) return;
    
    // Clear existing content
    farmGrid.innerHTML = '';

    // If there are no farms, show the beautiful Frost UI placeholder
    if (!data || data.length === 0) {
        farmGrid.innerHTML = `
            <div class="farm-placeholder py-5 frost-panel text-center" style="grid-column: 1 / -1;">
                <i class="bi bi-tree-fill" style="font-size: 2.5rem; color: var(--tm-emerald); margin-bottom: 15px; display: block; filter: drop-shadow(0 0 10px rgba(16,185,129,0.3));"></i>
                <h5 style="color: #fff;">No Farms Yet</h5>
                <p style="opacity: 0.6;">Create your first farm to begin orbital monitoring.</p>
            </div>
        `;
        
        // Update stats summary to 0
        const farmCountEl = document.getElementById('farmCount');
        const farmAreaEl = document.getElementById('farmArea');
        if (farmCountEl) farmCountEl.textContent = '0';
        if (farmAreaEl) farmAreaEl.textContent = '0 ha';
        return;
    }

    // Update stats summary based on data
    const farmCountEl = document.getElementById('farmCount');
    if (farmCountEl) farmCountEl.textContent = data.length;
    let totalArea = 0;

    // Loop through the data and generate a Frost UI card for each farm
    data.forEach(farm => {
        const areaVal = (farm.area !== undefined && farm.area !== null && !isNaN(farm.area) && Number(farm.area) > 0) ? Number(farm.area).toFixed(2) : '1.25';
        totalArea += parseFloat(areaVal);

        const name = farm.name || farm.farm_name || 'Unnamed Farm';
        const crop = farm.crop_type || farm.crop || 'Mixed Crop';
        const location = farm.location || [farm.village, farm.district].filter(Boolean).join(", ") || 'Location pending';

        // Create the card element
        const cardHTML = `
            <div class="frost-panel p-4 relative overflow-hidden" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 200px;">
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h4 class="mb-0" style="color: #fff; font-size: 1.25rem;">${name}</h4>
                    <!-- Crop Type Badge -->
                    <span style="background: rgba(16, 185, 129, 0.15); color: var(--tm-emerald); border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; backdrop-filter: blur(10px);">
                        ${crop}
                    </span>
                </div>

                <div class="mb-4" style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">
                    <div class="mb-1">
                        <i class="bi bi-geo-alt-fill mr-2" style="color: var(--tm-emerald);"></i> 
                        ${location}
                    </div>
                    <div>
                        <i class="bi bi-aspect-ratio-fill mr-2" style="color: var(--tm-emerald);"></i> 
                        <strong style="color: #fff;">${areaVal}</strong> Hectares
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="d-flex gap-2 mt-auto">
                    <a href="/analyze/${farm.id}" class="btn btn-success flex-grow-1 py-2 text-sm" style="border-radius: 12px; text-align: center; text-decoration: none;">
                        <i class="bi bi-globe2 mr-1"></i> Analyze
                    </a>
                    <a href="/farm/${farm.id}" class="btn btn-outline-primary flex-grow-1 py-2 text-sm" style="border-radius: 12px; text-align: center; text-decoration: none;">
                        Details
                    </a>
                </div>
            </div>
        `;
        
        // Append the new card to the grid
        farmGrid.insertAdjacentHTML('beforeend', cardHTML);
    });

    // Update total area stat
    const farmAreaEl = document.getElementById('farmArea');
    if (farmAreaEl) farmAreaEl.textContent = totalArea.toFixed(2) + ' ha';
}

async function fetchUserFarms() {
    try {
        const response = await fetch('/api/farms');
        if (response.ok) {
            const data = await response.json();
            Dashboard.farms = data.farms || data;
            renderFarms(Dashboard.farms);
        } else {
            console.error("Failed to load farms.");
            renderFarms([]);
        }
    } catch (error) {
        console.error("Error fetching farms:", error);
        renderFarms([]);
    }
}
/* ============================================
   WEATHER
============================================ */

async function loadWeather(){

    try{

        Dashboard.weather =
            await API.get("/api/weather");

        renderWeather();

    }

    catch(e){

        console.error(e);

    }

}

function renderWeather(){

    if(!Dashboard.weather || !Dashboard.weather.available){

        return;

    }

    UI.currentTemp.textContent =
        Math.round(Dashboard.weather.current.temperature);

    UI.weatherCondition.textContent =
        Dashboard.weather.current.condition;

    const weatherIcon =
        document.querySelector(".weather-icon");

    if (weatherIcon) {
        weatherIcon.textContent =
            getWeatherIcon(Dashboard.weather.current.weather_code);
    }

    UI.weatherCity.textContent =
        Dashboard.weather.location;

    UI.currentLocation.textContent =
        Dashboard.weather.location;

}

/* ============================================
   WEATHER — ALL FARMS
   One animated card per farm, styled by condition.
============================================ */

function weatherConditionClass(condition){

    const c = (condition || "").toLowerCase();

    if (c.includes("thunderstorm")) return "cond-storm";
    if (c.includes("snow")) return "cond-snow";
    if (c.includes("rain") || c.includes("drizzle")) return "cond-rainy";
    if (c.includes("cloud") || c.includes("overcast") || c.includes("fog")) return "cond-cloudy";
    if (c.includes("clear")) return "cond-sunny";

    return "cond-unknown";
}

async function loadAllFarmsWeather(){

    const grid = document.getElementById("farmWeatherGrid");

    if(!grid){
        return;
    }

    if(!Dashboard.farms.length){

        grid.innerHTML = `
            <div class="loading-box">
                Add a farm to see weather here.
            </div>
        `;

        return;
    }

    grid.innerHTML = Dashboard.farms.map(farm => `
        <div class="farm-weather-card cond-unknown" id="farmWeatherCard-${farm.id}">
            <strong>${farm.farm_name}</strong>
            <p style="opacity:.85;margin-top:8px;">Loading weather...</p>
        </div>
    `).join("");

    // Fetch each farm's weather independently so one slow/failed
    // farm doesn't block the others from rendering.
    Dashboard.farms.forEach(farm => loadSingleFarmWeather(farm));

}

async function loadSingleFarmWeather(farm){

    const card = document.getElementById(`farmWeatherCard-${farm.id}`);

    if(!card){
        return;
    }

    try{

        const data = await API.get(`/api/weather?farm_id=${farm.id}`);

        if(!data.available){

            card.className = "farm-weather-card cond-unknown";

            card.innerHTML = `
                <strong>${farm.farm_name}</strong>
                <p style="opacity:.85;margin-top:8px;">
                    ${data.error || "Weather unavailable."}
                </p>
            `;

            return;
        }

        const current = data.current;
        const icon = getWeatherIcon(current.weather_code);

        card.className = `farm-weather-card ${weatherConditionClass(current.condition)}`;

        card.innerHTML = `
            <strong>${farm.farm_name}</strong>
            <div class="farm-weather-icon">${icon}</div>
            <div class="farm-weather-temp">${Math.round(current.temperature)}&deg;C</div>
            <div>${current.condition}</div>
            <div class="farm-weather-meta">
                <span>💧 ${current.humidity}%</span>
                <span>💨 ${current.wind_speed} km/h</span>
                <span>🌧 ${current.rain_probability}%</span>
            </div>
        `;

    }
    catch(err){

        console.error(err);

        card.className = "farm-weather-card cond-unknown";

        card.innerHTML = `
            <strong>${farm.farm_name}</strong>
            <p style="opacity:.85;margin-top:8px;">Failed to load weather.</p>
        `;

    }

}


/* ============================================
   HISTORY
============================================ */

async function loadHistory(){

    try{

        Dashboard.history =
            await API.get("/api/history");

        renderHistory();

    }

    catch(e){

        console.error(e);

    }

}

/* ============================================
   SMALL RENDER HELPERS
============================================ */

function setTextIfExists(id, text){

    const el = document.getElementById(id);

    if(el){
        el.textContent = text;
    }

}

function setBarIfExists(id, percent){

    const el = document.getElementById(id);

    if(el){
        el.style.width = `${percent || 0}%`;
    }

}

function setImageIfExists(id, url){

    const el = document.getElementById(id);

    if(el && url){
        el.src = url;
    }

}

/* ============================================
   FARM OVERVIEW
   (Area/Lat/Lon from the farm record itself;
    Perimeter from the most recent analysis,
    since it isn't stored on the farm row)
============================================ */

function renderFarmOverview(){

    const farm = Dashboard.farms[0];

    if(!farm){
        return;
    }

    const areaVal = (farm.area !== undefined && farm.area !== null && !isNaN(farm.area) && Number(farm.area) > 0) ? Number(farm.area).toFixed(2) : '1.25';

    setTextIfExists(
        "overviewArea",
        `${areaVal} ha`
    );

    setTextIfExists(
        "overviewLat",
        farm.latitude != null ? Number(farm.latitude).toFixed(5) : "--"
    );

    setTextIfExists(
        "overviewLon",
        farm.longitude != null ? Number(farm.longitude).toFixed(5) : "--"
    );

    const perimeter = Dashboard.history[0]?.result?.farm?.perimeter_m;

    setTextIfExists(
        "overviewPerimeter",
        perimeter != null ? `${Math.round(perimeter)} m` : "--"
    );

}

/* ============================================
   LATEST ANALYSIS
   (Satellite Summary, Vegetation Indices,
    Crop Health, Satellite Images — all pulled
    from the most recent analysis_history row)
============================================ */

function renderLatestAnalysis(){

    const latest = Dashboard.history[0];

    const satellite = latest?.satellite;

    const indices = latest?.indices || {};

    const health = latest?.health || {};

    const visualization = latest?.result?.visualization || {};

    /* ---------- Satellite Summary ---------- */

    setTextIfExists("captureDate", satellite?.capture_date || "--");

    setTextIfExists("freshness", satellite?.freshness || "--");

    setTextIfExists(
        "cloudCover",
        satellite?.cloud_cover != null ? `${satellite.cloud_cover}%` : "--"
    );

    setTextIfExists("imagesUsed", satellite?.images_used ?? "--");

    const score = satellite?.quality?.score;

    setTextIfExists("qualityScore", score != null ? `${score}%` : "--");

    setBarIfExists("qualityBar", score);

    setTextIfExists("qualityLabel", satellite?.quality?.quality || "Waiting...");

    /* ---------- Vegetation Indices ---------- */

    const indexMap = {
        ndviValue: "NDVI",
        ndwiValue: "NDWI",
        eviValue: "EVI",
        saviValue: "SAVI",
        ndmiValue: "NDMI"
    };

    Object.entries(indexMap).forEach(([elementId, key])=>{

        const mean = indices[key]?.mean;

        setTextIfExists(elementId, mean != null ? mean.toFixed(2) : "--");

    });

    /* ---------- Crop Health Distribution ---------- */

    setTextIfExists("healthyPercent", health.healthy != null ? `${health.healthy}%` : "--");
    setBarIfExists("healthyBar", health.healthy);

    setTextIfExists("moderatePercent", health.moderate != null ? `${health.moderate}%` : "--");
    setBarIfExists("moderateBar", health.moderate);

    setTextIfExists("poorPercent", health.poor != null ? `${health.poor}%` : "--");
    setBarIfExists("poorBar", health.poor);

    /* ---------- Satellite Images ---------- */

    setImageIfExists("rgbImage", visualization.rgb);
    setImageIfExists("ndviImage", visualization.ndvi);

}

function historyCardHTML(item){

    const ndviMean = item.indices?.NDVI?.mean;

    const captureDate = item.satellite?.capture_date || "--";

    return `

<div class="history-card">

    <div>

        <strong>${item.farm_name}</strong>

        <p>

            ${captureDate}

        </p>

    </div>

    <div>

        NDVI

        <strong>

            ${ndviMean != null ? ndviMean.toFixed(2) : "--"}

        </strong>

    </div>

</div>

`;

}

function renderHistory(){

    if(!Dashboard.history.length){

        UI.historyContainer.innerHTML = `

            <div class="empty-card">

                No previous analyses available.

            </div>

        `;

        return;

    }

    UI.analysisCount.textContent =
        Dashboard.history.length;

    const RECENT_LIMIT = 5;

    UI.historyContainer.innerHTML =
        Dashboard.history
            .slice(0, RECENT_LIMIT)
            .map(historyCardHTML)
            .join("");

    if(Dashboard.history.length > RECENT_LIMIT){

        UI.historyContainer.innerHTML += `
            <button id="showMoreHistory" class="btn btn-outline-success w-100 mt-2">
                Show All ${Dashboard.history.length} Analyses
            </button>
        `;

        const showMoreBtn = document.getElementById("showMoreHistory");

        if(showMoreBtn){

            showMoreBtn.addEventListener("click", openHistoryModal);

        }

    }

}

/* ============================================
   RECENT ANALYSIS -- FULL LIST MODAL
============================================ */

function openHistoryModal(){

    const overlay = document.getElementById("historyModalOverlay");
    const fullContainer = document.getElementById("fullHistoryContainer");

    if(!overlay || !fullContainer){
        return;
    }

    fullContainer.innerHTML =
        Dashboard.history.map(historyCardHTML).join("");

    overlay.classList.add("show");

}

function closeHistoryModal(){

    const overlay = document.getElementById("historyModalOverlay");

    if(overlay){
        overlay.classList.remove("show");
    }

}

const historyModalOverlay = document.getElementById("historyModalOverlay");
const closeHistoryModalBtn = document.getElementById("closeHistoryModal");

if(closeHistoryModalBtn){
    closeHistoryModalBtn.addEventListener("click", closeHistoryModal);
}

if(historyModalOverlay){

    // Close when clicking the dark backdrop, not the card itself.
    historyModalOverlay.addEventListener("click", (e) => {
        if(e.target === historyModalOverlay){
            closeHistoryModal();
        }
    });

}


/* ============================================
   AI SUMMARY
============================================ */

async function loadSummary(){

    try{

        const summary =
            await API.get("/api/advisory");

        renderSummary(summary);

    }

    catch(e){

        console.error(e);

    }

}

function renderSummary(summary){

    UI.adviceContainer.innerHTML = "";

    if(!summary.length){

        UI.adviceContainer.innerHTML = `
            <div class="advice-item">
                No advisory yet — run an analysis on a farm first.
            </div>
        `;

        return;

    }

    summary.forEach(item=>{

        const message = item.message || item.title || "No recommendation.";

        UI.adviceContainer.innerHTML += `

<div class="advice-item">

    ✔ ${message}

</div>

`;

    });

}

/* ============================================
   EVENTS
============================================ */

document.addEventListener("click", async (e) => {

    /* Analyze Farm */

    if (e.target.classList.contains("analyze-btn")) {

        const farmId = e.target.dataset.id;

        window.location.href = `/analysis/${farmId}`;

    }

    /* Edit Farm */

    if (e.target.classList.contains("edit-btn")) {

        const farmId = e.target.dataset.id;

        window.location.href = `/farms/edit/${farmId}`;

    }

    /* Delete Farm */

    if (e.target.classList.contains("delete-btn")) {

        const farmId = e.target.dataset.id;

        if (!confirm("Delete this farm?")) return;

        try {

            const res = await fetch(`/api/farms/${farmId}`, {

                method: "DELETE"

            });

            if (res.ok) {

                showToast("Farm deleted successfully.");

                await loadFarms();

            }

            else {

                showToast("Unable to delete farm.", "danger");

            }

        }

        catch (err) {

            console.error(err);

            showToast("Something went wrong.", "danger");

        }

    }

});


/* ============================================
   ADD FARM
============================================ */

const addFarmButton = document.getElementById("addFarmButton");

if(addFarmButton){

    addFarmButton.addEventListener("click", ()=>{

        window.location.href="/add-farm";

    });

}

const addFarmCard = document.getElementById("addFarmCard");

if(addFarmCard){

    addFarmCard.addEventListener("click", ()=>{

        window.location.href="/add-farm";

    });

}


/* ============================================
   ANALYZE BUTTON (Hero & Quick Action)
============================================ */

function showAnalysisPopup(farmName, callback) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(16px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    overlay.innerHTML = `
        <div style="background: rgba(18, 18, 24, 0.95); border: 1px solid rgba(16, 185, 129, 0.4); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.2); border-radius: 24px; padding: 32px 28px; max-width: 440px; width: 90%; text-align: center; color: #fff; transform: scale(0.92); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #10b981; font-size: 2rem;">
                <i class="bi bi-radar"></i>
            </div>
            <h4 style="font-weight: 700; margin-bottom: 8px; font-size: 1.35rem; letter-spacing: -0.5px;">Analyzing Recent Farm</h4>
            <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 22px;">
                Launching satellite workspace for your most recent field: <br>
                <strong style="color: #34d399; font-size: 1.1rem; display: inline-block; margin-top: 4px;">${farmName}</strong>
            </p>
            <div style="background: rgba(255,255,255,0.08); border-radius: 10px; height: 6px; overflow: hidden; position: relative;">
                <div style="background: linear-gradient(90deg, #10b981, #38bdf8); height: 100%; width: 0%; transition: width 0.85s cubic-bezier(0.4, 0, 0.2, 1);" id="analysisProgressBar"></div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        const card = overlay.firstElementChild;
        if (card) card.style.transform = "scale(1)";
        const bar = document.getElementById("analysisProgressBar");
        if (bar) bar.style.width = "100%";
    });

    setTimeout(() => {
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 200);
    }, 900);
}

async function navigateToAnalysis() {
    let farm = null;
    const farmList = Array.isArray(Dashboard.farms) ? Dashboard.farms : (Dashboard.farms?.farms || []);
    if (farmList.length > 0) {
        farm = farmList[0];
    } else {
        try {
            const res = await API.get("/api/farms");
            const freshFarms = Array.isArray(res) ? res : (res?.farms || []);
            if (freshFarms.length > 0) {
                Dashboard.farms = freshFarms;
                farm = freshFarms[0];
            }
        } catch (err) {
            console.error("Error fetching farms for analysis:", err);
        }
    }

    if (farm) {
        const farmId = farm.id || farm._id;
        const farmName = farm.farm_name || farm.name || "Recent Farm";
        showAnalysisPopup(farmName, () => {
            window.location.href = `/analysis/${farmId}`;
        });
        return;
    }

    // 3. If truly no farms exist, direct user to add farm
    showToast("Please add a farm first.", "warning");
    setTimeout(() => {
        window.location.href = "/add-farm";
    }, 1200);
}

const openAnalysis = document.getElementById("openAnalysis");
if (openAnalysis) {
    openAnalysis.addEventListener("click", navigateToAnalysis);
}

const quickAnalyzeBtn = document.getElementById("quickAnalyzeBtn");
if (quickAnalyzeBtn) {
    quickAnalyzeBtn.addEventListener("click", navigateToAnalysis);
}


/* ============================================
   CHATBOT (Gemini-powered assistant)
============================================ */

const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotPanel = document.getElementById("chatbotPanel");
const chatbotClose = document.getElementById("chatbotClose");
const chatbotMessages = document.getElementById("chatbotMessages");
const chatbotInput = document.getElementById("chatbotInput");
const chatbotSend = document.getElementById("chatbotSend");

function appendChatBubble(text, sender){

    if(!chatbotMessages){
        return;
    }

    const bubble = document.createElement("div");

    bubble.className = `chat-bubble ${sender}`;

    bubble.textContent = text;

    chatbotMessages.appendChild(bubble);

    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

}

async function sendChatMessage(){

    if(!chatbotInput){
        return;
    }

    const message = chatbotInput.value.trim();

    if(!message){
        return;
    }

    appendChatBubble(message, "user");

    chatbotInput.value = "";
    chatbotInput.disabled = true;

    appendChatBubble("Typing...", "bot");

    try{

        const res = await fetch("/api/chatbot", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ message })

        });

        const result = await res.json();

        // Replace the "Typing..." placeholder with the real reply.
        if(chatbotMessages.lastChild){
            chatbotMessages.removeChild(chatbotMessages.lastChild);
        }

        appendChatBubble(result.reply || "Sorry, something went wrong.", "bot");

    }
    catch(err){

        console.error(err);

        if(chatbotMessages.lastChild){
            chatbotMessages.removeChild(chatbotMessages.lastChild);
        }

        appendChatBubble("The assistant is temporarily unavailable.", "bot");

    }
    finally{

        chatbotInput.disabled = false;
        chatbotInput.focus();

    }

}

if(chatbotToggle && chatbotPanel){

    chatbotToggle.addEventListener("click", () => {
        chatbotPanel.classList.toggle("show");

        if(chatbotPanel.classList.contains("show") && chatbotInput){
            chatbotInput.focus();
        }
    });

}

if(chatbotClose && chatbotPanel){

    chatbotClose.addEventListener("click", () => {
        chatbotPanel.classList.remove("show");
    });

}

if(chatbotSend){

    chatbotSend.addEventListener("click", sendChatMessage);

}

if(chatbotInput){

    chatbotInput.addEventListener("keydown", (e) => {

        if(e.key === "Enter"){
            e.preventDefault();
            sendChatMessage();
        }

    });

}

/* ============================================
   FEEDBACK
============================================ */

const feedbackStars = document.getElementById("feedbackStars");
const feedbackMessage = document.getElementById("feedbackMessage");
const feedbackSubmit = document.getElementById("feedbackSubmit");
const feedbackStatus = document.getElementById("feedbackStatus");

let selectedRating = 0;

if(feedbackStars){

    const stars = feedbackStars.querySelectorAll("span");

    stars.forEach(star => {

        star.addEventListener("click", () => {

            selectedRating = parseInt(star.dataset.value, 10);

            stars.forEach(s => {
                s.classList.toggle(
                    "selected",
                    parseInt(s.dataset.value, 10) <= selectedRating
                );
            });

        });

    });

}

if(feedbackSubmit){

    feedbackSubmit.addEventListener("click", async () => {

        const message = feedbackMessage ? feedbackMessage.value.trim() : "";

        if(!message){

            if(feedbackStatus){
                feedbackStatus.textContent = "Please write a message first.";
            }

            return;
        }

        feedbackSubmit.disabled = true;

        if(feedbackStatus){
            feedbackStatus.textContent = "Sending...";
        }

        try{

            const res = await fetch("/api/feedback", {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({
                    message,
                    rating: selectedRating || null
                })

            });

            const result = await res.json();

            if(feedbackStatus){
                feedbackStatus.textContent = result.message ||
                    (result.success ? "Thanks for your feedback!" : "Failed to send.");
            }

            if(result.success && feedbackMessage){
                feedbackMessage.value = "";
            }

        }
        catch(err){

            console.error(err);

            if(feedbackStatus){
                feedbackStatus.textContent = "Failed to send feedback.";
            }

        }
        finally{

            feedbackSubmit.disabled = false;

        }

    });

}

function showToast(message,type="success"){

    const toast=document.createElement("div");

    toast.className=`tm-toast ${type}`;

    toast.innerHTML=`

        <i class="bi bi-check-circle-fill"></i>

        ${message}

    `;

    document.body.appendChild(toast);

    setTimeout(()=>{

        toast.classList.add("show");

    },50);

    setTimeout(()=>{

        toast.classList.remove("show");

        setTimeout(()=>toast.remove(),300);

    },3000);

}


/* ============================================
   LOADING
============================================ */

function showLoading(){

    const loader=document.createElement("div");

    loader.id="loadingOverlay";

    loader.innerHTML=`

        <div class="spinner-border text-success">

        </div>

    `;

    document.body.appendChild(loader);

}

function hideLoading(){

    const loader=document.getElementById("loadingOverlay");

    if(loader){

        loader.remove();

    }

}


/* ============================================
   ERROR
============================================ */

window.addEventListener("error",(e)=>{

    console.error(e.error);

});


window.addEventListener("unhandledrejection",(e)=>{

    console.error(e.reason);

});


/* ============================================
   REFRESH
============================================ */

async function refreshDashboard(){

    showLoading();

    try{

        await loadDashboard();

    }

    finally{

        hideLoading();

    }

}


/* ============================================
   AUTO REFRESH
============================================ */

setInterval(()=>{

    refreshDashboard();

},300000);


/* ============================================
   END
============================================ */

console.log("🌱 TerraMind Dashboard Loaded");
