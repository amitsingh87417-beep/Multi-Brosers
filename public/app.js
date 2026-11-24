(function () {
  const PAGE_SIZE = 24;
  let allItems = [];
  let activePlatform = "ALL";
  let searchQuery = "";
  let visibleCount = PAGE_SIZE;

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeHttpUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "#";
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch {}
    return "#";
  }

  function getYouTubeEmbedUrl(url) {
    const safe = safeHttpUrl(url);
    if (safe === "#") return "";
    try {
      const u = new URL(safe);
      let videoId = "";
      if (u.hostname.includes("youtu.be")) {
        videoId = u.pathname.replace(/^\//, "").split("/")[0];
      } else if (u.hostname.includes("youtube.com")) {
        if (u.pathname === "/watch") {
          videoId = u.searchParams.get("v") || "";
        } else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
          videoId = u.pathname.split("/")[2] || "";
        }
      }
      if (/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
      }
    } catch {}
    return "";
  }

  function getFilteredItems() {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchPlatform =
        activePlatform === "ALL" ||
        String(item.platform || "").toLowerCase() === activePlatform.toLowerCase();
      if (!matchPlatform) return false;
      if (!q) return true;
      const hay = `${item.title || ""} ${item.category || ""} ${item.platform || ""} ${item.url || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function openPreview(item) {
    const drawer = document.getElementById("previewDrawer");
    const titleEl = document.getElementById("previewTitle");
    const platformEl = document.getElementById("previewPlatform");
    const extLink = document.getElementById("previewExternalLink");
    const stage = document.getElementById("previewStage");
    if (!drawer || !titleEl || !platformEl || !extLink || !stage) return;

    const cleanUrl = safeHttpUrl(item.url);
    titleEl.textContent = item.title || "Untitled Item";
    platformEl.textContent = item.platform || "Link";
    extLink.href = cleanUrl;

    const ytEmbed = item.platform === "YouTube" ? getYouTubeEmbedUrl(cleanUrl) : "";
    if (ytEmbed) {
      stage.innerHTML = `<iframe src="${esc(ytEmbed)}" title="${esc(item.title || "YouTube Video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      stage.innerHTML = `
        <div class="fallback-box">
          <p><strong>${esc(item.platform || "Platform")}</strong> content requires opening directly or may restrict inline frame embedding.</p>
          <a href="${esc(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="primary-link">Open in New Tab &#8599;</a>
        </div>
      `;
    }

    drawer.classList.remove("hidden");
    drawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function render() {
    const grid = document.getElementById("itemsGrid");
    const stats = document.getElementById("wallStats");
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (!grid || !stats || !loadMoreBtn) return;

    const filtered = getFilteredItems();
    const sliced = filtered.slice(0, visibleCount);

    stats.textContent = `Showing ${sliced.length} of ${filtered.length} filtered (${allItems.length} total)`;

    if (!sliced.length) {
      grid.innerHTML = `<div class="item-card"><p>No matching items found. Try another keyword or platform tab.</p></div>`;
    } else {
      grid.innerHTML = sliced
        .map((item) => {
          const cleanUrl = safeHttpUrl(item.url);
          return `
            <article class="item-card">
              <div>
                <div class="item-top">
                  <span class="platform-pill">${esc(item.platform || "Other")}</span>
                  <span class="item-cat">${esc(item.category || "General")}</span>
                </div>
                <h3 class="item-title">${esc(item.title || "Untitled")}</h3>
                <div class="item-url">${esc(cleanUrl)}</div>
              </div>
              <div class="card-actions">
                <button type="button" class="primary-btn" data-preview-id="${esc(item.id)}">Preview / Open</button>
                <a href="${esc(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="secondary-btn">Direct Link &#8599;</a>
              </div>
            </article>
          `;
        })
        .join("");

      grid.querySelectorAll("button[data-preview-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const found = allItems.find((x) => String(x.id) === String(btn.dataset.previewId));
          if (found) openPreview(found);
        });
      });
    }

    loadMoreBtn.style.display = sliced.length < filtered.length ? "inline-flex" : "none";
  }

  async function init() {
    try {
      const res = await fetch("items.json", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) allItems = data;
      }
    } catch {}

    document.querySelectorAll("#platformTabs .tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#platformTabs .tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activePlatform = btn.dataset.platform || "ALL";
        visibleCount = PAGE_SIZE;
        render();
      });
    });

    const searchInp = document.getElementById("searchInput");
    if (searchInp) {
      searchInp.addEventListener("input", () => {
        searchQuery = searchInp.value || "";
        visibleCount = PAGE_SIZE;
        render();
      });
    }

    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        activePlatform = "ALL";
        searchQuery = "";
        visibleCount = PAGE_SIZE;
        if (searchInp) searchInp.value = "";
        document.querySelectorAll("#platformTabs .tab-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.platform === "ALL");
        });
        render();
      });
    }

    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        visibleCount += PAGE_SIZE;
        render();
      });
    }

    const closePreviewBtn = document.getElementById("closePreviewBtn");
    if (closePreviewBtn) {
      closePreviewBtn.addEventListener("click", () => {
        const drawer = document.getElementById("previewDrawer");
        const stage = document.getElementById("previewStage");
        if (stage) stage.innerHTML = "";
        if (drawer) drawer.classList.add("hidden");
      });
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
