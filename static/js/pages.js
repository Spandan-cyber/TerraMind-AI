/* ==========================================================
   TerraMind — Shared Pages Script
   (My Farms, History, Weather, Profile, Settings)

   dashboard.html keeps dashboard.js.
   analysis.html keeps analysis.js.
   Every other page loads this single file instead.
   Each init function checks for its own container element
   first, so loading this on any page only runs the parts
   that are actually present on that page.
========================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    initLogout();
    initFarmsPage();
    initHistoryPage();
    initWeatherPage();
    initProfilePage();
    initAdvisoryPage();
    initSettingsPage();
});

/* ==========================================================
   SHARED HELPERS
========================================================== */

async function apiGet(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res.json();
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

/* ==========================================================
   LOGOUT
   Bound via [data-logout] so both the sidebar link and any
   in-page button can trigger it without id collisions.
========================================================== */

function initLogout() {
    document.querySelectorAll("[data-logout]").forEach(el => {
        el.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                const res = await fetch("/api/logout", { method: "POST" });
                const result = await res.json();
                if (result.success) {
                    window.location = "/login";
                }
            } catch (err) {
                console.error(err);
                alert("Logout failed.");
            }
        });
    });
}

/* ==========================================================
   MY FARMS
========================================================== */

async function initFarmsPage() {
    const grid = document.getElementById("farmGrid");
    if (!grid) return;

    try {
        const farms = await apiGet("/api/farms");

        if (!farms.length) {
            grid.innerHTML = `
                <div class="glass-card" style="grid-column:1/-1;text-align:center;">
                    <h5>No Farms Yet</h5>
                    <p style="color:var(--muted);margin-top:8px;">
                        Create your first farm to begin monitoring.
                    </p>
                    <a href="/add-farm" class="btn btn-success" style="margin-top:16px;display:inline-block;">
                        Add Farm
                    </a>
                </div>`;
            return;
        }

        grid.innerHTML = farms.map(farm => `
            <div class="glass-card">
                <h5>${farm.farm_name}</h5>
                <p style="color:var(--muted);margin:6px 0 14px;">
                    ${farm.crop || "Crop Not Selected"}
                </p>
                <p style="margin-bottom:6px;">
                    <strong>Area:</strong> ${Number(farm.area || 0).toFixed(2)} ha
                </p>
                <p style="color:var(--muted);margin-bottom:18px;">
                    ${farm.village || ""} ${farm.district ? "· " + farm.district : ""}
                </p>
                <div style="display:flex;gap:10px;">
                    <a href="/analysis/${farm.id}" class="btn btn-success" style="flex:1;text-align:center;">
                        Analyze
                    </a>
                    <button class="btn btn-outline-success delete-farm-btn" data-id="${farm.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join("");

        grid.querySelectorAll(".delete-farm-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Delete this farm? This cannot be undone.")) return;

                try {
                    const res = await fetch(`/api/farms/${btn.dataset.id}`, { method: "DELETE" });
                    if (res.ok) {
                        initFarmsPage();
                    } else {
                        alert("Unable to delete farm.");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Something went wrong.");
                }
            });
        });
    }
    catch (err) {
        console.error(err);
        grid.innerHTML = `<p>Failed to load farms.</p>`;
    }
}

/* ==========================================================
   ANALYSIS HISTORY
========================================================== */

async function initHistoryPage() {
    const container = document.getElementById("historyContainer");
    if (!container) return;

    try {
        const data = await apiGet("/api/history");
        const history = Array.isArray(data) ? data : (data.history || []);

        if (!history.length) {
            container.innerHTML = `<div class="glass-card">No previous analyses available.</div>`;
            return;
        }

        container.innerHTML = history.map(item => {
            const ndviMean = item.indices?.NDVI?.mean;
            const captureDate = item.satellite?.capture_date || "--";
            const quality = item.satellite?.quality?.quality || "--";

            return `
                <div class="glass-card" style="margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <strong>${item.farm_name || "Unknown Farm"}</strong>
                            <p style="color:var(--muted);margin-top:4px;">
                                ${captureDate} &middot; Quality: ${quality}
                            </p>
                        </div>
                        <div style="text-align:right;">
                            <small style="color:var(--muted);">NDVI</small>
                            <h4>${ndviMean != null ? ndviMean.toFixed(2) : "--"}</h4>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }
    catch (err) {
        console.error(err);
        container.innerHTML = `<p>Failed to load history.</p>`;
    }
}

/* ==========================================================
   WEATHER
   One big card per farm, each with its own current
   conditions + 7-day forecast.
========================================================== */

async function initWeatherPage() {
    const container = document.getElementById("weatherContainer");
    if (!container) return;

    let farms;

    try {
        farms = await apiGet("/api/farms");
    }
    catch (err) {
        console.error(err);
        container.innerHTML = `<p>Failed to load your farms.</p>`;
        return;
    }

    if (!farms.length) {
        container.innerHTML = `
            <div class="glass-card" style="text-align:center;">
                <h5>No Farms Yet</h5>
                <p style="color:var(--muted);margin-top:8px;">
                    Add a farm to see weather for its location.
                </p>
                <a href="/add-farm" class="btn btn-success" style="margin-top:16px;display:inline-block;">
                    Add Farm
                </a>
            </div>`;
        return;
    }

    container.innerHTML = farms.map(farm => `
        <div class="glass-card weather-farm-card" data-farm-id="${farm.id}" style="margin-bottom:26px;">
            <h5 style="margin-bottom:16px;">${farm.farm_name}</h5>
            <div class="weather-farm-body">Loading weather...</div>
        </div>
    `).join("");

    // Fetch each farm's weather independently so a slow/failed
    // one doesn't block the others from rendering.
    farms.forEach(farm => loadFarmWeather(farm));
}

async function loadFarmWeather(farm) {
    const card = document.querySelector(`.weather-farm-card[data-farm-id="${farm.id}"] .weather-farm-body`);
    if (!card) return;

    try {
        const data = await apiGet(`/api/weather?farm_id=${farm.id}`);

        if (!data.available) {
            card.innerHTML = `<p style="color:var(--muted);">${data.error || "Weather unavailable for this farm."}</p>`;
            return;
        }

        const current = data.current;

        let html = `
            <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
                <div>
                    <h1 style="font-size:56px;font-weight:700;margin:0;">
                        ${Math.round(current.temperature)}&deg;<span style="font-size:24px;">C</span>
                    </h1>
                    <p style="color:var(--muted);margin-top:4px;">${current.condition}</p>
                </div>
                <div class="summary-grid" style="flex:1;margin:0;min-width:280px;">
                    <div class="summary-card">
                        <div>💧</div>
                        <div><small>Humidity</small><h3>${current.humidity}%</h3></div>
                    </div>
                    <div class="summary-card">
                        <div>💨</div>
                        <div><small>Wind</small><h3>${current.wind_speed} km/h</h3></div>
                    </div>
                    <div class="summary-card">
                        <div>🌧</div>
                        <div><small>Rain</small><h3>${current.rain_probability}%</h3></div>
                    </div>
                    <div class="summary-card">
                        <div>☀️</div>
                        <div><small>UV</small><h3>${current.uv_index}</h3></div>
                    </div>
                </div>
            </div>
        `;

        const forecast = data.forecast_7day || [];

        if (forecast.length) {
            html += `
                <div style="margin-top:24px;">
                    <strong style="color:var(--muted);font-size:13px;">7-DAY FORECAST</strong>
                    <div class="image-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-top:10px;">
                        ${forecast.map(day => `
                            <div class="glass-card" style="text-align:center;padding:16px;">
                                <strong>${day.date}</strong>
                                <p style="margin:8px 0;">${day.temp_min_c}&deg; / ${day.temp_max_c}&deg;</p>
                                <small style="color:var(--muted);">${day.rain_probability_pct ?? 0}% rain</small>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        card.innerHTML = html;
    }
    catch (err) {
        console.error(err);
        card.innerHTML = `<p style="color:var(--muted);">Failed to load weather for this farm.</p>`;
    }
}

/* ==========================================================
   PROFILE
   Editable name/phone/photo. Email stays read-only since it's
   tied to the Supabase Auth account, not the profiles table.

   The header (avatar/name/email), the edit form, and the farm
   stats each live in their own container so re-rendering one
   never wipes out the others.
========================================================== */

function getInitials(name) {
    if (!name) return "U";
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join("");
}

function updateProfileAvatar(user, imageOverrideUrl) {
    const img = document.getElementById("profileImagePreview");
    const initials = document.getElementById("profileInitials");
    if (!img || !initials) return;

    const src = imageOverrideUrl || user.profile_image;

    if (src) {
        img.src = imageOverrideUrl ? src : `${src}?t=${Date.now()}`;
        img.style.display = "block";
        img.onerror = () => {
            img.style.display = "none";
            initials.style.display = "flex";
            initials.textContent = getInitials(user.full_name);
        };
        initials.style.display = "none";
    } else {
        img.style.display = "none";
        initials.style.display = "flex";
        initials.textContent = getInitials(user.full_name);
    }
}

async function initProfilePage() {
    const container = document.getElementById("profileContainer");
    if (!container) return;

    try {
        const res = await fetch("/api/me");

        if (!res.ok) {
            container.innerHTML = `<p>Unable to load profile. Please log in again.</p>`;
            return;
        }

        const user = await res.json();

        renderProfileHeader(user);
        renderProfileForm(user);
        renderProfileStats(user);
    }
    catch (err) {
        console.error(err);
        container.innerHTML = `<p>Failed to load profile.</p>`;
    }
}

function renderProfileHeader(user) {
    setText("profileName", user.full_name || "Unnamed Farmer");
    setText("profileEmail", user.email || "");
    updateProfileAvatar(user);
}

function renderProfileForm(user) {
    const formContainer = document.getElementById("profileFormContainer");
    if (!formContainer) return;

    formContainer.innerHTML = `
        <form id="profileForm">
            <div class="mb-3">
                <label class="form-label">Profile Photo</label>
                <input
                    type="file"
                    id="profileImage"
                    class="form-control"
                    accept="image/png,image/jpeg,image/webp">
                <small style="color:var(--muted);">JPG, PNG or WEBP &middot; Max 5 MB</small>
            </div>
            <div class="mb-3">
                <label class="form-label">Full Name</label>
                <input type="text" id="profileFullName" class="form-control" value="${user.full_name || ""}">
            </div>
            <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" value="${user.email || ""}" disabled>
                <small style="color:var(--muted);">Email is tied to your account and can't be changed here.</small>
            </div>
            <div class="mb-3">
                <label class="form-label">Phone</label>
                <input type="tel" id="profilePhone" class="form-control" value="${user.phone || ""}">
            </div>
            <button type="submit" class="btn btn-success">Save Changes</button>
            <span id="profileSaveStatus" style="margin-left:12px;color:var(--muted);"></span>
        </form>
    `;

    document.getElementById("profileForm").addEventListener("submit", saveProfile);

    // Live preview: swap the header avatar the moment a new photo is picked,
    // before the user even hits Save.
    document.getElementById("profileImage").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        updateProfileAvatar(user, previewUrl);
    });
}

function renderProfileStats(user) {
    const statsContainer = document.getElementById("profileStats");
    if (!statsContainer) return;

    statsContainer.innerHTML = `
        <p style="margin-bottom:10px;"><strong>Total Farms:</strong> ${user.farm_count}</p>
        <p style="margin-bottom:10px;"><strong>Total Area:</strong> ${user.total_area} ha</p>
        <p><strong>Healthy Farms:</strong> ${user.healthy_farms}</p>
    `;
}

async function saveProfile(e) {
    e.preventDefault();

    const status = document.getElementById("profileSaveStatus");
    const fullName = document.getElementById("profileFullName").value.trim();
    const phone = document.getElementById("profilePhone").value.trim();

    status.textContent = "Saving...";

    try {
        const formData = new FormData();

        formData.append("full_name", fullName);
        formData.append("phone", phone);

        const image = document.getElementById("profileImage").files[0];

        if (image) {
            formData.append("profile_image", image);
        }

        const res = await fetch("/api/profile", {
            method: "PUT",
            body: formData
        });

        const result = await res.json();

        if (result.success) {
            status.textContent = "Saved.";
            setTimeout(() => { status.textContent = ""; }, 2000);

            // Refresh everything from the server so the header shows the
            // real saved photo URL, not just the local preview blob.
            initProfilePage();
        } else {
            status.textContent = result.message || "Failed";
        }
    }
    catch (err) {
        console.error(err);
        status.textContent = "Failed";
    }
}

/* ==========================================================
   AI ADVISORIES
========================================================== */

const ADVISORY_LEVEL_STYLES = {
    danger:  { color: "#dc3545", icon: "⚠️" },
    warning: { color: "#f0ad4e", icon: "🔶" },
    success: { color: "var(--accent, #2e7d32)", icon: "✅" },
    info:    { color: "#3b82f6", icon: "ℹ️" }
};

function getAdvisoryStyle(level) {
    return ADVISORY_LEVEL_STYLES[(level || "").toLowerCase()] || ADVISORY_LEVEL_STYLES.info;
}

async function initAdvisoryPage() {
    const container = document.getElementById("adviceContainer");
    if (!container) return;

    try {
        const data = await apiGet("/api/advisory");

        if (!data.length) {
            container.innerHTML = `
                <div class="glass-card">
                    No advisory available yet. Run an analysis on a farm first.
                </div>`;
            return;
        }

        container.innerHTML = data.map(item => {
            const style = getAdvisoryStyle(item.level);
            const title = item.title || "Recommendation";
            const message = item.message || "";

            return `
                <div class="glass-card" style="margin-bottom:14px;border-left:4px solid ${style.color};">
                    <div style="display:flex;align-items:flex-start;gap:12px;">
                        <span style="font-size:20px;">${style.icon}</span>
                        <div>
                            <strong>${title}</strong>
                            <p style="color:var(--muted);margin-top:4px;">${message}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }
    catch (err) {
        console.error(err);
        container.innerHTML = `<p>Failed to load advisory.</p>`;
    }
}

/* ==========================================================
   SETTINGS
   (Logout is handled generically by initLogout() via
   [data-logout] — nothing else needed here yet.)
========================================================== */

function initSettingsPage() {
    // Reserved for future settings (units, notifications, password change)
    // once there are backend endpoints to support them.
}