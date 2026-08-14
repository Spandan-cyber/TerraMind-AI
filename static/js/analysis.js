/* ==========================================================
   TerraMind
   Analysis Workspace (Updated for New API Schema)
   ========================================================== */

"use strict";

const CONFIG = {
    API: {
        FARM: id => `/api/farms/${id}`,
        WEATHER: id => `/api/weather?farm_id=${id}`,
        ANALYZE: id => `/api/analyze/${id}`,
        HISTORY: id => `/api/history/${id}`
    },
    DATE_FORMAT: "en-IN"
};

const Analysis = {
    farm: null,
    weather: null,
    satellite: null,
    indices: {},
    health: {},
    advisory: [],
    history: [],
    charts: {},
    loading: false
};

const UI = {
    farmTitle: document.getElementById("farmTitle"),
    overviewArea: document.getElementById("overviewArea"),
    overviewLat: document.getElementById("overviewLat"),
    cropHealth: document.getElementById("cropHealth"),
    captureDate: document.getElementById("captureDate"),
    cloudCover: document.getElementById("cloudCover"),
    qualityScore: document.getElementById("qualityScore"),
    rgbImage: document.getElementById("rgbImage"),
    ndviImage: document.getElementById("ndviImage"),
    refreshButton: document.getElementById("refreshAnalysis"),
    rerunButton: document.getElementById("rerunAnalysis"),
    exportButton: document.getElementById("exportPdf"),
    downloadReport: document.getElementById("downloadReport"),
    downloadGeoJSON: document.getElementById("downloadGeoJSON"),
    downloadCSV: document.getElementById("downloadCSV")
};

let FARM_ID = window.location.pathname.split("/").filter(Boolean).pop();
if (FARM_ID === "analysis" || FARM_ID === "analyze" || FARM_ID === "undefined" || FARM_ID === "null") {
    FARM_ID = null;
}

const API = {
    async get(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    },
    async post(url, data = {}) {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }
};

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
    try {
        showLoader("Loading workspace...");
        await loadFarm();
        await loadWeather();
        await loadHistory();
        await runAnalysis();
        registerEvents();
    } catch (error) {
        console.error(error);
        toast(error.message, "danger");
    } finally {
        hideLoader();
    }
}

function registerEvents() {
    if (UI.refreshButton) UI.refreshButton.onclick = runAnalysis;
    if (UI.rerunButton) UI.rerunButton.onclick = runAnalysis;
    if (UI.exportButton) UI.exportButton.onclick = exportPDF;
    if (UI.downloadReport) UI.downloadReport.onclick = exportPDF;
    if (UI.downloadCSV) UI.downloadCSV.onclick = exportCSV;
    if (UI.downloadGeoJSON) UI.downloadGeoJSON.onclick = exportGeoJSON;
}

async function loadFarm() {
    try {
        // Fetch all farms to populate the selector and resolve fallback if needed
        let allFarms = [];
        try {
            const farmsRes = await API.get("/api/farms");
            allFarms = Array.isArray(farmsRes) ? farmsRes : (farmsRes?.farms || []);
        } catch (e) {
            console.warn("Unable to fetch farms list:", e);
        }

        // If FARM_ID is invalid/missing, resolve from allFarms
        if (!FARM_ID) {
            if (allFarms.length > 0) {
                FARM_ID = allFarms[0].id || allFarms[0]._id;
                window.history.replaceState(null, "", `/analysis/${FARM_ID}`);
            }
        }

        if (!FARM_ID) {
            throw new Error("No farm found. Please add a farm first.");
        }

        let res;
        try {
            res = await API.get(CONFIG.API.FARM(FARM_ID));
        } catch (fetchErr) {
            // If specific farm failed to load, fallback to first farm in list
            if (allFarms.length > 0) {
                FARM_ID = allFarms[0].id || allFarms[0]._id;
                window.history.replaceState(null, "", `/analysis/${FARM_ID}`);
                res = await API.get(CONFIG.API.FARM(FARM_ID));
            } else {
                throw fetchErr;
            }
        }

        Analysis.farm = res.farm || res;
        renderFarm();
        renderFarmSelector(allFarms);
    } catch (error) {
        console.error(error);
        throw new Error(error.message || "Unable to load farm information.");
    }
}

function renderFarmSelector(allFarms) {
    const selector = document.getElementById("farmSelector");
    if (!selector) return;

    if (!allFarms || allFarms.length <= 1) {
        selector.style.display = "none";
        return;
    }

    selector.innerHTML = allFarms.map(f => {
        const id = f.id || f._id;
        const name = f.farm_name || f.name || "Unnamed Farm";
        const crop = f.crop || f.crop_type || "";
        const label = crop ? `${name} (${crop})` : name;
        const isSelected = String(id) === String(FARM_ID) ? "selected" : "";
        return `<option value="${id}" ${isSelected}>${label}</option>`;
    }).join("");

    selector.style.display = "inline-block";

    selector.onchange = () => {
        const newFarmId = selector.value;
        if (newFarmId && newFarmId !== FARM_ID) {
            window.location.href = `/analysis/${newFarmId}`;
        }
    };
}

function renderFarm() {
    const farm = Analysis.farm;
    if (!farm) return;

    if (UI.farmTitle) UI.farmTitle.textContent = farm.farm_name || "Unnamed Farm";
    const areaNum = Number(farm.area_hectares || farm.area || 0);
    if (UI.overviewArea) UI.overviewArea.textContent = `${(areaNum > 0 ? areaNum : 1.25).toFixed(2)} ha`;

    // /api/farms/<id> always returns the flat farms-table row —
    // latitude/longitude are top-level fields here, not an array.
    const lat = farm.latitude;
    const lon = farm.longitude;

    if (UI.overviewLat) {
        UI.overviewLat.textContent = `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`;
    }
}

async function loadWeather() {
    if (!Analysis.farm) return;
    try {
        const weather = await API.get(CONFIG.API.WEATHER(FARM_ID));
        Analysis.weather = weather;
        renderWeather();
    } catch (error) {
        console.warn("Weather fetch failed, utilizing payload weather if available.");
    }
}


const WEATHER_CODES = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Light Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Light Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Severe Thunderstorm"
};

const WEATHER_ICONS = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",

    45: "🌫️",
    48: "🌫️",

    51: "🌦️",
    53: "🌦️",
    55: "🌧️",

    61: "🌦️",
    63: "🌧️",
    65: "🌧️",

    71: "🌨️",
    73: "❄️",
    75: "❄️",

    80: "🌦️",
    81: "🌧️",
    82: "⛈️",

    95: "⛈️",
    96: "⛈️",
    99: "⛈️"
};



function renderWeather() {
    const w = Analysis.weather;
    if (!w) return;
    const current = w.current || w;
    const condition =
        current.condition ??
        WEATHER_CODES[current.weather_code] ??
        "Unknown";
    setText("currentTemp", `${current.temperature_c ?? current.temperature ?? "--"}°C`);
    setText("weatherCondition", condition);
    setText("weatherConditionWidget", condition);
    setText("weatherCity", Analysis.farm.farm_name || "Farm Location");
    setText("humidity", `${current.humidity_pct ?? current.humidity ?? "--"}%`);
    setText("wind", `${current.wind_kmh ?? current.wind_speed ?? "--"} km/h`);
    setText("rainProbability", `${current.precipitation_mm ?? current.rain_probability ?? "--"} mm`);
    setText("uvIndex", current.uv_index ?? "--");
    const icon = WEATHER_ICONS[current.weather_code] || "🌤️";

    document.querySelector(".weather-icon").textContent = icon;
    
    if (w.forecast_7day) {
        renderForecast(w.forecast_7day);
    }
}

function renderForecast(days) {
    const container = document.getElementById("forecastGrid");
    if (!container) return;
    container.innerHTML = "";
    days.forEach(day => {
        container.innerHTML += `
        <div class="forecast-card">
            <div>${formatShortDate(day.date)}</div>
            <h4>${day.temp_max_c ?? day.temperature}°</h4>
            <span>🌧 ${day.rain_mm ?? 0}mm</span>
        </div>`;
    });
}

async function loadHistory() {
    try {
        const res = await API.get(CONFIG.API.HISTORY(FARM_ID));
        Analysis.history = res.history || [];
    } catch (e) {
        Analysis.history = [];
    }
}

async function runAnalysis() {
    if (!Analysis.farm) return;
    setLoadingState(true);
    try {
        const result = await API.post(CONFIG.API.ANALYZE(FARM_ID), {});
        if (result.success === false) throw new Error(result.message || "Analysis failed.");

        Analysis.satellite = result.satellite || {};
        Analysis.indices = result.indices || {};
        Analysis.health = result.statistics?.crop_health || {};
        Analysis.advisory = result.advisory || [];
        Analysis.visualization = result.visualization || {};
        
        if (result.weather) {
            Analysis.weather = result.weather;
            renderWeather();
        }

        renderSatellite();
        renderIndices();
        renderHealth();
        renderAdvisory();
        renderAlerts();
        renderCharts();
        renderTimeline();

        toast("Satellite analysis completed successfully.");
    } catch (error) {
        console.error(error);
        toast(error.message, "danger");
    } finally {
        setLoadingState(false);
    }
}

function renderSatellite() {
    const s = Analysis.satellite;
    const viz = Analysis.visualization;
    if (!s) return;

    setText("captureDate", formatDate(s.capture_date));
    setText("captureDateCard", formatDate(s.capture_date));
    setText("cloudCover", `${s.cloud_cover ?? "--"}%`);
    setText("cloudCoverCard", `${s.cloud_cover ?? "--"}%`);
    setText("qualityScore", s.quality?.quality || s.quality || "Good");
    setText("qualityCard", s.quality?.quality || s.quality || "Good");
    setText("confidenceScore", `${s.quality?.score ? s.quality.score.toFixed(0) : "90"}%`);

    if (Analysis.satellite?.farm?.area_ha && UI.overviewArea) {
        UI.overviewArea.textContent = `${Number(Analysis.satellite.farm.area_ha).toFixed(2)} ha`;
    }

    updateImage("rgbImage", viz.rgb);
    updateImage("ndviImage", viz.ndvi);
    updateImage("galleryRgb", viz.rgb);
    updateImage("galleryNdvi", viz.ndvi);
    updateImage("galleryNdwi", viz.ndwi);
    updateImage("galleryEvi", viz.evi);
}

function renderIndices() {
    const indices = Analysis.indices;
    ["ndvi", "ndwi", "evi", "savi", "ndmi"].forEach(key => {
        const item = indices[key.toUpperCase()];
        if (!item) return;
        const meanVal = item.mean ?? 0;
        setText(`${key}Value`, meanVal.toFixed(2));
        setText(`${key}Status`, getIndexStatus(meanVal));
        const bar = document.getElementById(`${key}Bar`);
        if (bar) {
            bar.style.width = `${Math.max(0, Math.min(meanVal, 1)) * 100}%`;
        }
    });
}

function renderHealth() {
    const h = Analysis.health;
    if (!h) return;
    if (UI.cropHealth) UI.cropHealth.textContent = h.healthy > 50 ? "Healthy" : "Moderate";
    setText("healthyPercent", `${h.healthy ?? 0}%`);
    setText("moderatePercent", `${h.moderate ?? 0}%`);
    setText("poorPercent", `${h.poor ?? 0}%`);
}

function renderAdvisory() {
    const container = document.getElementById("adviceContainer");
    const modalContent = document.getElementById("modalAdviceContent");
    const advList = Analysis.advisory;

    if (!container) return;

    if (!Array.isArray(advList) || !advList.length) {
        container.className = "d-flex flex-column gap-3 flex-grow-1 justify-content-center text-muted text-center p-3";
        container.innerHTML = `<div class="small"><i class="bi bi-check2-circle text-success me-1"></i> No critical field intervention required at this time.</div>`;
        if (modalContent) {
            modalContent.innerHTML = `<div class="text-muted small">No active advisories generated yet.</div>`;
        }
        return;
    }

    container.className = "d-flex flex-column gap-2 flex-grow-1 justify-content-start overflow-auto";
    container.style.maxHeight = "340px";
    container.style.scrollbarWidth = "thin";

    const cardsHtml = advList.map(adv => {
        const level = (adv.level || "info").toLowerCase();
        let borderCol = "#38bdf8";
        let badgeBg = "rgba(56, 189, 248, 0.15)";
        let badgeColor = "#38bdf8";
        let icon = "bi-info-circle";

        if (level === "danger") {
            borderCol = "#ef4444";
            badgeBg = "rgba(239, 68, 68, 0.15)";
            badgeColor = "#f87171";
            icon = "bi-exclamation-octagon";
        } else if (level === "warning") {
            borderCol = "#f59e0b";
            badgeBg = "rgba(245, 158, 11, 0.15)";
            badgeColor = "#fbbf24";
            icon = "bi-exclamation-triangle";
        } else if (level === "success") {
            borderCol = "#10b981";
            badgeBg = "rgba(16, 185, 129, 0.15)";
            badgeColor = "#34d399";
            icon = "bi-check-circle";
        }

        const title = adv.title || "Crop Advisory";
        const message = adv.message || adv.recommendation || "";

        return `
        <div class="inner-glass-card p-3 d-flex flex-column gap-1" style="border-left: 3px solid ${borderCol}; background: rgba(255,255,255,0.03); border-radius: 10px;">
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi ${icon}" style="color: ${badgeColor}; font-size: 0.95rem;"></i>
                    <strong class="text-white" style="font-size: 0.9rem;">${title}</strong>
                </div>
                <span class="badge px-2 py-1" style="background: ${badgeBg}; color: ${badgeColor}; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; border-radius: 6px;">${level}</span>
            </div>
            <p class="mb-0" style="font-size: 0.82rem; line-height: 1.5; color: rgba(255, 255, 255, 0.75);">
                ${message}
            </p>
        </div>
        `;
    }).join("");

    container.innerHTML = cardsHtml;

    if (modalContent) {
        modalContent.innerHTML = cardsHtml;
    }
}

function renderAlerts() {
    const container = document.getElementById("alertsContainer");
    if (!container) return;
    container.innerHTML = "";
    const alerts = [];
    
    if (Analysis.indices.NDVI?.mean < 0.40) {
        alerts.push({ type: "danger", icon: "bi-exclamation-triangle", text: "Vegetation health is below optimal thresholds." });
    } else {
        alerts.push({ type: "success", icon: "bi-check-circle", text: "No critical stress detected across field vectors." });
    }

    alerts.forEach(a => {
        container.innerHTML += `<div class="alert alert-${a.type}"><i class="bi ${a.icon}"></i> ${a.text}</div>`;
    });
}

function renderTimeline() {
    const container = document.getElementById("historyContainer");
    if (!container) return;
    container.innerHTML = "";
    const history = Analysis.history;
    
    if (!history.length) {
        container.innerHTML = `<div class="text-muted">No historical timeline records found.</div>`;
        return;
    }

    history.forEach(item => {
        const ndviMean = item.indices?.NDVI?.mean;
        const qualityLabel = item.satellite?.quality?.quality;
        container.innerHTML += `
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div>
                <strong>${formatDate(item.created_at)}</strong>
                <p>NDVI: ${ndviMean != null ? ndviMean.toFixed(2) : "--"} | Quality: ${qualityLabel ?? "N/A"}</p>
            </div>
        </div>`;
    });
}

function renderCharts() {
    renderNDVIChart();
    renderHealthChart();
}

function renderNDVIChart() {
    const canvas = document.getElementById("ndviTrendChart");
    if (!canvas || typeof Chart === "undefined") return;
    if (Analysis.charts.ndvi) Analysis.charts.ndvi.destroy();

    const labels = [];
    const values = [];

    if (Analysis.history && Analysis.history.length) {
        Analysis.history.forEach(h => {
            labels.push(formatDate(h.created_at));
            values.push(h.indices?.NDVI?.mean ?? null);
        });
    }

    Analysis.charts.ndvi = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{ label: "NDVI Trend", data: values, tension: 0.3, fill: true, borderColor: "#2e7d32", backgroundColor: "rgba(46, 125, 50, 0.1)" }]
        },
        options: { responsive: true }
    });
}

function renderHealthChart() {
    const canvas = document.getElementById("healthChart");
    if (!canvas || typeof Chart === "undefined") return;
    if (Analysis.charts.health) Analysis.charts.health.destroy();

    const h = Analysis.health;
    Analysis.charts.health = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Healthy", "Moderate", "Poor"],
            datasets: [{ data: [h.healthy || 0, h.moderate || 0, h.poor || 0], backgroundColor: ["#2e7d32", "#fbc02d", "#d32f2f"] }]
        },
        options: { responsive: true }
    });
}

function setLoadingState(loading) {
    Analysis.loading = loading;
    [UI.refreshButton, UI.rerunButton].forEach(btn => {
        if (btn) {
            btn.disabled = loading;
            btn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm"></span> Processing...` : `🛰 Analyze Again`;
        }
    });
}

function updateImage(id, url) {
    const img = document.getElementById(id);
    if (img && url) img.src = url;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatDate(dateStr) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(CONFIG.DATE_FORMAT, { day: "numeric", month: "short", year: "numeric" });
}

function formatShortDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(CONFIG.DATE_FORMAT, { weekday: "short" });
}

function getIndexStatus(val) {
    if (val >= 0.6) return "Optimal";
    if (val >= 0.4) return "Moderate";
    return "Stressed";
}

/* ==========================================================
   IMAGE ZOOM + DOWNLOAD
   The fullscreen/download buttons in each image card had no
   handlers at all — wiring them here via delegation so any
   future image card works automatically too.
========================================================== */

function openImageLightbox(src, alt) {
    let overlay = document.getElementById("imageLightbox");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "imageLightbox";
        overlay.className = "image-lightbox-overlay";
        overlay.innerHTML = `
            <span class="lightbox-close">&times;</span>
            <img id="lightboxImg" src="" alt="">
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay || e.target.classList.contains("lightbox-close")) {
                overlay.classList.remove("show");
            }
        });
    }

    document.getElementById("lightboxImg").src = src;
    document.getElementById("lightboxImg").alt = alt || "";
    overlay.classList.add("show");
}

document.addEventListener("click", (e) => {
    const zoomBtn = e.target.closest(".image-actions .btn-success");
    const downloadBtn = e.target.closest(".image-actions .btn-outline-secondary");

    if (zoomBtn) {
        const img = zoomBtn.closest(".image-card")?.querySelector("img.analysis-image");
        if (img && img.src) openImageLightbox(img.src, img.alt);
    }

    if (downloadBtn) {
        const img = downloadBtn.closest(".image-card")?.querySelector("img.analysis-image");

        if (img && img.src) {
            const a = document.createElement("a");
            a.href = img.src;
            a.download = `${img.alt || "image"}_${FARM_ID}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    }
});

function exportPDF() {
    const report = document.querySelector(".analysis-layout");
    if (!report || typeof html2pdf === "undefined") {
        toast("PDF export dependencies unavailable.", "danger");
        return;
    }
    html2pdf().from(report).save(`TerraMind_Report_${FARM_ID}.pdf`);
}

function exportCSV() {
    if (!Analysis.indices) return;
    let csv = "Index,Mean\n";
    Object.keys(Analysis.indices).forEach(k => {
        csv += `${k},${Analysis.indices[k].mean}\n`;
    });
    downloadFile(csv, `indices_${FARM_ID}.csv`, "text/csv");
}

function exportGeoJSON() {
    if (!Analysis.farm || !Analysis.farm.boundary) {
        toast("Farm boundary data missing.", "danger");
        return;
    }
    downloadFile(JSON.stringify(Analysis.farm.boundary), `farm_${FARM_ID}.geojson`, "application/json");
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function toast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        document.body.appendChild(container);
    }
    const t = document.createElement("div");
    t.className = `alert alert-${type === "danger" ? "danger" : "success"} shadow`;
    t.style.position = "fixed";
    t.style.bottom = "20px";
    t.style.right = "20px";
    t.style.zIndex = "9999";
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function showLoader(msg) {
    if (typeof window.showSatelliteLoader === "function") {
        window.showSatelliteLoader();
        return;
    }
    const overlay = document.getElementById("analysisLoadingOverlay");
    if (overlay) {
        overlay.style.display = "flex";
        return;
    }
    let loader = document.getElementById("loadingOverlay");
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "loadingOverlay";
        loader.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:10000;";
        loader.innerHTML = `<div class="spinner-border text-success" role="status"></div>`;
        document.body.appendChild(loader);
    }
    loader.style.display = "flex";
}

function hideLoader() {
    if (typeof window.hideSatelliteLoader === "function") {
        window.hideSatelliteLoader();
    }
    const overlay = document.getElementById("analysisLoadingOverlay");
    if (overlay) overlay.style.display = "none";
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "none";
}
