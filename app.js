(function () {
  const BATCH_SIZE = 24;
  const MAX_LIVE_FRAMES = 12;

  let currentUrl = "https://growglobalsocial.vercel.app/";
  let totalSlots = 12;
  let visibleSlots = 12;
  let loadedFramesSet = new Set();

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeHttpUrl(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return "";
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withProto);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch {}
    return "";
  }

  function detectPlatform(urlStr) {
    try {
      const u = new URL(urlStr);
      const host = u.hostname.toLowerCase();
      if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
      if (host.includes("instagram.com")) return "Instagram";
      if (host.includes("facebook.com") || host.includes("fb.watch")) return "Facebook";
      return "Website";
    } catch {
      return "Website";
    }
  }

  function getEmbeddableUrl(urlStr, platform) {
    if (platform !== "YouTube") return "";
    try {
      const u = new URL(urlStr);
      let videoId = "";
      if (u.hostname.toLowerCase().includes("youtu.be")) {
        videoId = u.pathname.replace(/^\//, "").split("/")[0];
      } else if (u.pathname === "/watch") {
        videoId = u.searchParams.get("v") || "";
      } else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/")[2] || "";
      }
      if (/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
      }
    } catch {}
    return "";
  }

  function updateBadges(platform) {
    const activeBadge = document.getElementById("activeCountBadge");
    const statusEl = document.getElementById("wallStatusText");
    if (activeBadge) {
      activeBadge.textContent = `Active Slots: ${totalSlots} (Showing ${Math.min(visibleSlots, totalSlots)})`;
    }
    if (statusEl) {
      statusEl.textContent = `Platform: ${platform} • Live frames loaded: ${loadedFramesSet.size}/${MAX_LIVE_FRAMES} max safe cap.`;
    }
  }

  function renderFrameInsideStage(stageEl, slotIndex, urlStr, platform) {
    if (!stageEl) return;
    if (loadedFramesSet.size >= MAX_LIVE_FRAMES && !loadedFramesSet.has(slotIndex)) {
      stageEl.innerHTML = `<div class="slot-placeholder-msg">Safe cap reached (${MAX_LIVE_FRAMES} live frames). Use "Open Direct" or clear an active frame first.</div>`;
      return;
    }

    const ytEmbed = getEmbeddableUrl(urlStr, platform);
    if (ytEmbed) {
      loadedFramesSet.add(slotIndex);
      stageEl.innerHTML = `<iframe src="${esc(ytEmbed)}" title="Slot #${slotIndex} YouTube Player" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      updateBadges(platform);
      return;
    }

    // Attempt iframe for general websites, while noting social/X-Frame restrictions
    loadedFramesSet.add(slotIndex);
    stageEl.innerHTML = `
      <iframe src="${esc(urlStr)}" title="Slot #${slotIndex} Preview" loading="lazy" referrerpolicy="no-referrer"></iframe>
    `;
    updateBadges(platform);
  }

  function renderWall() {
    const grid = document.getElementById("wallGrid");
    const colsSelect = document.getElementById("columnsSelect");
    const modeSelect = document.getElementById("renderModeSelect");
    const showMoreBtn = document.getElementById("showMoreBtn");
    if (!grid) return;

    const cols = colsSelect ? colsSelect.value : "4";
    grid.className = `wall-grid cols-${cols}`;

    if (!currentUrl || totalSlots <= 0) {
      grid.innerHTML = "";
      if (showMoreBtn) showMoreBtn.classList.add("hidden");
      updateBadges("None");
      return;
    }

    const platform = detectPlatform(currentUrl);
    const mode = modeSelect ? modeSelect.value : "smart";
    const limit = Math.min(visibleSlots, totalSlots);

    const cardsHtml = [];
    for (let i = 1; i <= limit; i++) {
      const hasFrame = loadedFramesSet.has(i);
      const ytEmbed = getEmbeddableUrl(currentUrl, platform);
      let stageContent = `<div class="slot-placeholder-msg">Click <b>Load Frame</b> to open preview or <b>Open Direct</b> in a new tab.<br><small>${platform === "Instagram" || platform === "Facebook" ? "Note: Social links often block inline frames." : "Supports YouTube &amp; frame-friendly sites."}</small></div>`;

      if (mode === "smart" && hasFrame) {
        const srcUrl = ytEmbed || currentUrl;
        stageContent = `<iframe src="${esc(srcUrl)}" title="Slot #${i}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen></iframe>`;
      }

      cardsHtml.push(`
        <article class="slot-card" data-slot="${i}">
          <div class="slot-head">
            <span class="slot-index">#${i}</span>
            <span class="slot-platform">${esc(platform)}</span>
          </div>
          <div class="slot-body">
            <div class="slot-url">${esc(currentUrl)}</div>
            <div class="slot-stage" id="stage-${i}">${stageContent}</div>
            <div class="slot-actions">
              <button type="button" class="slot-btn primary-mini" data-load-slot="${i}">${hasFrame ? "Reload Frame" : "Load Frame"}</button>
              <a href="${esc(currentUrl)}" target="_blank" rel="noopener noreferrer" class="slot-btn">Open Direct &#8599;</a>
            </div>
          </div>
        </article>
      `);
    }

    grid.innerHTML = cardsHtml.join("");

    grid.querySelectorAll("button[data-load-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.loadSlot);
        const stage = document.getElementById(`stage-${idx}`);
        renderFrameInsideStage(stage, idx, currentUrl, platform);
        renderWall();
      });
    });

    if (showMoreBtn) {
      if (limit < totalSlots) {
        showMoreBtn.classList.remove("hidden");
        showMoreBtn.textContent = `Show More Slots (${limit} of ${totalSlots} shown)`;
      } else {
        showMoreBtn.classList.add("hidden");
      }
    }

    updateBadges(platform);
  }

  function launchWall() {
    const urlInp = document.getElementById("targetUrlInput");
    const countInp = document.getElementById("tabCountInput");
    const cleaned = sanitizeHttpUrl(urlInp ? urlInp.value : "");

    if (!cleaned) {
      const statusEl = document.getElementById("wallStatusText");
      if (statusEl) statusEl.textContent = "Please enter a valid http:// or https:// URL first.";
      return;
    }

    if (urlInp) urlInp.value = cleaned;
    currentUrl = cleaned;

    const requested = Math.max(1, Math.min(1000, Number(countInp ? countInp.value : 12) || 12));
    if (countInp) countInp.value = String(requested);

    totalSlots = requested;
    visibleSlots = Math.min(requested, BATCH_SIZE);
    loadedFramesSet.clear();
    renderWall();
  }

  function init() {
    document.getElementById("launchBtn")?.addEventListener("click", launchWall);

    document.getElementById("clearBtn")?.addEventListener("click", () => {
      totalSlots = 0;
      visibleSlots = 0;
      loadedFramesSet.clear();
      renderWall();
    });

    document.getElementById("columnsSelect")?.addEventListener("change", renderWall);
    document.getElementById("renderModeSelect")?.addEventListener("change", () => {
      loadedFramesSet.clear();
      renderWall();
    });

    document.getElementById("showMoreBtn")?.addEventListener("click", () => {
      visibleSlots = Math.min(totalSlots, visibleSlots + BATCH_SIZE);
      renderWall();
    });

    document.getElementById("loadAllEmbedsBtn")?.addEventListener("click", () => {
      if (!currentUrl || totalSlots <= 0) return;
      const platform = detectPlatform(currentUrl);
      const limit = Math.min(visibleSlots, totalSlots, MAX_LIVE_FRAMES);
      loadedFramesSet.clear();
      for (let i = 1; i <= limit; i++) {
        loadedFramesSet.add(i);
      }
      renderWall();
      updateBadges(platform);
    });

    document.getElementById("presetYtBtn")?.addEventListener("click", () => {
      const inp = document.getElementById("targetUrlInput");
      if (inp) inp.value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    });

    document.getElementById("presetIgBtn")?.addEventListener("click", () => {
      const inp = document.getElementById("targetUrlInput");
      if (inp) inp.value = "https://www.instagram.com/";
    });

    document.getElementById("presetFbBtn")?.addEventListener("click", () => {
      const inp = document.getElementById("targetUrlInput");
      if (inp) inp.value = "https://www.facebook.com/";
    });

    launchWall();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
