const API = "";
const tokenKey = "wcPredictionLeague.token";

let token = localStorage.getItem(tokenKey) || "";
let current = null;
let authMode = "login";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const FLAGS = {
  Algeria: "🇩🇿", Argentina: "🇦🇷", Australia: "🇦🇺", Austria: "🇦🇹", Belgium: "🇧🇪", "Bosnia & Herzegovina": "🇧🇦",
  Brazil: "🇧🇷", Canada: "🇨🇦", "Cape Verde": "🇨🇻", Colombia: "🇨🇴", Croatia: "🇭🇷", Curacao: "🇨🇼",
  "Czech Republic": "🇨🇿", "DR Congo": "🇨🇩", Ecuador: "🇪🇨", Egypt: "🇪🇬", England: "🏴", France: "🇫🇷",
  Germany: "🇩🇪", Ghana: "🇬🇭", Haiti: "🇭🇹", Iran: "🇮🇷", Iraq: "🇮🇶", "Ivory Coast": "🇨🇮",
  Japan: "🇯🇵", Jordan: "🇯🇴", Mexico: "🇲🇽", Morocco: "🇲🇦", Netherlands: "🇳🇱", "New Zealand": "🇳🇿",
  Norway: "🇳🇴", Panama: "🇵🇦", Paraguay: "🇵🇾", Portugal: "🇵🇹", Qatar: "🇶🇦", "Saudi Arabia": "🇸🇦",
  Scotland: "🏴", Senegal: "🇸🇳", "South Africa": "🇿🇦", "South Korea": "🇰🇷", Spain: "🇪🇸", Sweden: "🇸🇪",
  Switzerland: "🇨🇭", Tunisia: "🇹🇳", Turkey: "🇹🇷", Uruguay: "🇺🇾", USA: "🇺🇸", Uzbekistan: "🇺🇿",
};
const FLAG_CODES = {
  Algeria: "dz", Argentina: "ar", Australia: "au", Austria: "at", Belgium: "be", "Bosnia & Herzegovina": "ba",
  Brazil: "br", Canada: "ca", "Cape Verde": "cv", Colombia: "co", Croatia: "hr", Curacao: "cw",
  "Czech Republic": "cz", "DR Congo": "cd", Ecuador: "ec", Egypt: "eg", England: "gb-eng", France: "fr",
  Germany: "de", Ghana: "gh", Haiti: "ht", Iran: "ir", Iraq: "iq", "Ivory Coast": "ci",
  Japan: "jp", Jordan: "jo", Mexico: "mx", Morocco: "ma", Netherlands: "nl", "New Zealand": "nz",
  Norway: "no", Panama: "pa", Paraguay: "py", Portugal: "pt", Qatar: "qa", "Saudi Arabia": "sa",
  Scotland: "gb-sct", Senegal: "sn", "South Africa": "za", "South Korea": "kr", Spain: "es", Sweden: "se",
  Switzerland: "ch", Tunisia: "tn", Turkey: "tr", Uruguay: "uy", USA: "us", Uzbekistan: "uz",
};
const flagImg = (name, className = "flag-img") => {
  const code = FLAG_CODES[name];
  if (!code) return `<span class="${className} fallback">${FLAGS[name] || "🏳️"}</span>`;
  return `<img class="${className}" src="https://flagcdn.com/w80/${code}.png" srcset="https://flagcdn.com/w160/${code}.png 2x" alt="${safe(name)} flag" loading="lazy">`;
};
const team = (name) => `<span class="team">${flagImg(name)}${safe(name)}</span>`;
const TEAM_CODES = {
  Algeria: "ALG", Argentina: "ARG", Australia: "AUS", Austria: "AUT", Belgium: "BEL", "Bosnia & Herzegovina": "BIH",
  Brazil: "BRA", Canada: "CAN", "Cape Verde": "CPV", Colombia: "COL", Croatia: "CRO", Curacao: "CUW",
  "Czech Republic": "CZE", "DR Congo": "COD", Ecuador: "ECU", Egypt: "EGY", England: "ENG", France: "FRA",
  Germany: "GER", Ghana: "GHA", Haiti: "HAI", Iran: "IRN", Iraq: "IRQ", "Ivory Coast": "CIV",
  Japan: "JPN", Jordan: "JOR", Mexico: "MEX", Morocco: "MAR", Netherlands: "NED", "New Zealand": "NZL",
  Norway: "NOR", Panama: "PAN", Paraguay: "PAR", Portugal: "POR", Qatar: "QAT", "Saudi Arabia": "KSA",
  Scotland: "SCO", Senegal: "SEN", "South Africa": "RSA", "South Korea": "KOR", Spain: "ESP", Sweden: "SWE",
  Switzerland: "SUI", Tunisia: "TUN", Turkey: "TUR", Uruguay: "URU", USA: "USA", Uzbekistan: "UZB",
};
const teamBadge = (name, side = "") => `
  <span class="team-badge ${side}">
    <span class="flag-disc">${flagImg(name, "flag-photo")}</span>
    <span class="team-copy"><b>${safe(name)}</b><small>${TEAM_CODES[name] || "TBD"}</small></span>
  </span>`;
const localDateValue = (iso) => {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const isCsv = response.headers.get("content-type")?.includes("text/csv");
  const payload = isCsv ? await response.text() : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Įvyko klaida.");
  return payload;
}

async function loadState() {
  if (location.protocol === "file:") {
    renderServerRequired();
    return;
  }
  current = token ? await request("/api/state").catch(() => null) : null;
  render();
}

function renderServerRequired() {
  $("#nav").innerHTML = `<button class="active">Paleidimas</button>`;
  $("#pageTitle").textContent = "Reikia paleisti serverį";
  $("#userPanel").innerHTML = `<span class="pill">Lokali reali versija</span>`;
  $("#view").innerHTML = `
    <section class="panel">
      <h3>Šita versija nebeatidaroma tiesiai kaip failas</h3>
      <p class="message">Kad veiktų prisijungimai, serverinis užrakinimas, automatinis taškų skaičiavimas ir Sportmonks importas, puslapį reikia paleisti per Netlify arba lokalų serverį.</p>
      <div class="stack">
        <label>1. PowerShell komanda
          <input readonly value="cd C:\\Users\\User\\Documents\\Codex\\2026-06-05\\sukurk-moderni-fifa-world-cup-prediction\\outputs">
        </label>
        <label>2. Paleidimas
          <input readonly value="node server.cjs">
        </label>
        <label>3. Naršyklės adresas
          <input readonly value="http://127.0.0.1:4173">
        </label>
        <p class="message">Įkėlus į Netlify, naudok Netlify duotą svetainės adresą.</p>
      </div>
    </section>`;
}

function routeName() {
  if (!token) return "login";
  const hash = location.hash.replace("#", "") || "predictions";
  if (hash === "admin" && !current?.user?.isAdmin) return "leaderboard";
  return hash;
}

function render() {
  const route = routeName();
  const titles = { login: "Prisijungimas", predictions: "Mano spėjimai", matches: "Visų rungtynių sąrašas", leaderboard: "Lyderių lentelė", stats: "Mano statistika", admin: "Admin panelė" };
  $("#pageTitle").textContent = titles[route] || titles.predictions;
  renderNav(route);
  renderUserPanel();
  if (route === "login") return renderAuth();
  if (!current) return;
  if (route === "predictions") return renderPredictions();
  if (route === "matches") return renderMatches();
  if (route === "leaderboard") return renderLeaderboard();
  if (route === "stats") return renderStats();
  if (route === "admin") return renderAdmin();
}

function renderNav(active) {
  const items = token ? [
    ["predictions", "Mano spėjimai"],
    ["matches", "Visos rungtynės"],
    ["leaderboard", "Lyderių lentelė"],
    ["stats", "Mano statistika"],
    ...(current?.user?.isAdmin ? [["admin", "Admin panelė"]] : []),
  ] : [["login", "Prisijungimas"]];
  $("#nav").innerHTML = items.map(([id, label]) => `<button class="${id === active ? "active" : ""}" data-route="${id}">${label}</button>`).join("");
  $$("#nav button").forEach((button) => button.addEventListener("click", () => {
    location.hash = button.dataset.route;
    render();
  }));
}

function renderUserPanel() {
  $("#userPanel").innerHTML = current?.user
    ? `<span class="pill">${safe(current.user.username)}${current.user.isAdmin ? " · admin" : ""}</span><button class="ghost" id="logoutBtn">Atsijungti</button>`
    : `<span class="pill">Neprisijungęs</span>`;
  $("#logoutBtn")?.addEventListener("click", () => {
    token = "";
    current = null;
    localStorage.removeItem(tokenKey);
    location.hash = "login";
    render();
  });
}

function renderAuth() {
  $("#view").innerHTML = $("#authTemplate").innerHTML;
  $$("[data-auth-tab]").forEach((button) => button.addEventListener("click", () => {
    authMode = button.dataset.authTab;
    $$("[data-auth-tab]").forEach((item) => item.classList.toggle("active", item === button));
    $(".primary").textContent = authMode === "login" ? "Prisijungti" : "Registruotis";
    $("#authMessage").textContent = "";
  }));
  $("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await request(`/api/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      token = payload.token;
      localStorage.setItem(tokenKey, token);
      location.hash = payload.user.isAdmin ? "admin" : "predictions";
      await loadState();
    } catch (error) {
      $("#authMessage").textContent = error.message;
      $("#authMessage").className = "message error";
    }
  });
}

function userPrediction(matchId) {
  return current.predictions.find((item) => item.matchId === matchId && item.userId === current.user.id);
}

function statusText(match) {
  if (match.status === "finished") return "Baigta";
  if (match.status === "live") return "Live";
  return match.locked ? "Užrakinta" : "Atvira";
}

function pickFromScore(prediction) {
  if (!prediction) return "";
  if (Number(prediction.homeScore) > Number(prediction.awayScore)) return "home";
  if (Number(prediction.homeScore) < Number(prediction.awayScore)) return "away";
  return "draw";
}

function formatMatchDate(iso) {
  return new Date(iso).toLocaleDateString("lt-LT", { weekday: "long", month: "long", day: "numeric" });
}

function groupedMatches(matches, editable) {
  const groups = matches.reduce((acc, match) => {
    const key = new Date(match.kickoffUtc).toISOString().slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});
  return Object.entries(groups).map(([date, items]) => `
    <section class="match-day">
      <div class="match-day-header">
        <span>${formatMatchDate(date)}</span>
        <small>${items.length} rungt.</small>
      </div>
      <div class="match-grid">${items.map((match) => matchCard(match, editable)).join("")}</div>
    </section>`).join("");
}

function matchCard(match, editable) {
  const prediction = userPrediction(match.id);
  const result = match.status === "finished" ? `${match.homeScore}:${match.awayScore}` : match.status === "live" ? "LIVE" : "-";
  const selectedPick = pickFromScore(prediction);
  return `
    <article class="match-card">
      <div class="match-card-main">
        <div class="match-top">
          <span class="stage-chip">${safe(match.group)}</span>
          <span class="status-chip ${match.locked ? "locked-chip" : "open-chip"}">${statusText(match)}</span>
        </div>
        <div class="match-teams">
          ${teamBadge(match.home, "home")}
          <div class="versus">
            <span>${result}</span>
            <small>${match.status === "finished" ? "FT" : "VS"}</small>
          </div>
          ${teamBadge(match.away, "away")}
        </div>
        <div class="match-meta">
          <span>${new Date(match.kickoffUtc).toLocaleString("lt-LT", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          <span>${safe(match.venue || "Stadionas bus patikslintas")}</span>
        </div>
        ${prediction ? `<div class="prediction-summary">Jūsų spėjimas <b>${prediction.homeScore}:${prediction.awayScore}</b><span>${prediction.points || 0} tšk.</span></div>` : `<div class="prediction-summary muted">Spėjimo dar nėra</div>`}
        ${editable ? `
          <form class="prediction-form" data-predict="${match.id}">
            <div class="winner-picker" role="radiogroup" aria-label="Baigties pasirinkimas">
              <button class="pick-option ${selectedPick === "home" ? "selected" : ""}" type="button" data-pick="home" ${match.locked ? "disabled" : ""}>
                ${flagImg(match.home)}<span>${TEAM_CODES[match.home] || safe(match.home)}</span>
              </button>
              <button class="pick-option ${selectedPick === "draw" ? "selected" : ""}" type="button" data-pick="draw" ${match.locked ? "disabled" : ""}>
                <span class="draw-mark">X</span><span>Lygiosios</span>
              </button>
              <button class="pick-option ${selectedPick === "away" ? "selected" : ""}" type="button" data-pick="away" ${match.locked ? "disabled" : ""}>
                ${flagImg(match.away)}<span>${TEAM_CODES[match.away] || safe(match.away)}</span>
              </button>
            </div>
            <input type="hidden" name="pick" value="${selectedPick}">
            <div class="score-pick">
            <label><span>${TEAM_CODES[match.home] || safe(match.home)}</span><input type="number" min="0" max="20" name="homeScore" value="${prediction?.homeScore ?? ""}" ${match.locked ? "disabled" : ""} required></label>
            <span class="score-divider">:</span>
            <label><span>${TEAM_CODES[match.away] || safe(match.away)}</span><input type="number" min="0" max="20" name="awayScore" value="${prediction?.awayScore ?? ""}" ${match.locked ? "disabled" : ""} required></label>
            </div>
            <button class="primary" type="submit" ${match.locked ? "disabled" : ""}>Išsaugoti</button>
          </form>` : ""}
      </div>
    </article>`;
}

function attachPredictionForms() {
  $$("[data-predict] .pick-option").forEach((button) => button.addEventListener("click", () => {
    const form = button.closest("[data-predict]");
    const pick = button.dataset.pick;
    const home = form.elements.homeScore;
    const away = form.elements.awayScore;
    form.elements.pick.value = pick;
    $$(".pick-option", form).forEach((item) => item.classList.toggle("selected", item === button));
    if (pick === "home" && Number(home.value || 0) <= Number(away.value || 0)) {
      home.value = 2;
      away.value = 1;
    }
    if (pick === "draw" && home.value !== away.value) {
      home.value = 1;
      away.value = 1;
    }
    if (pick === "away" && Number(away.value || 0) <= Number(home.value || 0)) {
      home.value = 1;
      away.value = 2;
    }
  }));
  $$("[data-predict]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const homeScore = Number(data.get("homeScore"));
    const awayScore = Number(data.get("awayScore"));
    const pick = String(data.get("pick") || "");
    if (!pick) {
      alert("Pirmiausia pasirinkite, kas laimės: pirma komanda, lygiosios arba antra komanda.");
      return;
    }
    if ((pick === "home" && homeScore <= awayScore) || (pick === "away" && awayScore <= homeScore) || (pick === "draw" && homeScore !== awayScore)) {
      alert("Tikslus rezultatas turi atitikti pasirinktą baigtį.");
      return;
    }
    try {
      await request("/api/predictions", {
        method: "POST",
        body: JSON.stringify({ matchId: form.dataset.predict, homeScore, awayScore }),
      });
      await loadState();
    } catch (error) {
      alert(error.message);
    }
  }));
}

function renderPredictions() {
  $("#view").innerHTML = `
    <div class="grid">
      <section class="panel span-8"><h3>Rungtynių spėjimai</h3><div class="match-list">${groupedMatches(current.matches, true)}</div></section>
      <section class="panel span-4">
        <h3>Turnyro bonusai</h3>
        <form id="bonusForm" class="form">
          ${bonusField("groupWinner", "Grupės nugalėtojas", 5)}
          ${bonusField("semifinalist", "Pusfinalininkas", 10)}
          ${bonusField("finalist", "Finalininkas", 20)}
          ${bonusField("champion", "Čempionas", 40)}
          <button class="primary" type="submit">Išsaugoti bonusus</button>
        </form>
      </section>
    </div>`;
  attachPredictionForms();
  $("#bonusForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request("/api/bonus", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
    await loadState();
  });
}

function bonusField(type, label, points) {
  const existing = current.bonusPredictions.find((item) => item.userId === current.user.id && item.type === type);
  return `<label>${label} · ${points} tšk.<input name="${type}" value="${safe(existing?.team || "")}" placeholder="Komanda"></label>`;
}

function renderMatches() {
  $("#view").innerHTML = `<section class="panel"><h3>Visos rungtynės</h3><div class="match-list">${groupedMatches(current.matches, false)}</div></section>`;
}

function renderLeaderboard() {
  $("#view").innerHTML = `<section class="panel"><h3>Lyderių lentelė</h3><div class="table-wrap"><table><thead><tr><th>Vieta</th><th>Vartotojas</th><th>Taškai</th><th>Tikslūs rezultatai</th><th>Teisingi nugalėtojai</th></tr></thead><tbody>${current.standings.map((user, index) => `<tr><td class="rank">#${index + 1}</td><td>${safe(user.username)}</td><td><b>${user.points}</b></td><td>${user.exact}</td><td>${user.winners}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function renderStats() {
  const user = current.standings.find((item) => item.id === current.user.id);
  const picks = current.predictions.filter((item) => item.userId === current.user.id);
  $("#view").innerHTML = `
    <div class="grid">
      <div class="stat span-4"><strong>${user.points}</strong><small>Taškai</small></div>
      <div class="stat span-4"><strong>${user.exact}</strong><small>Tikslūs rezultatai</small></div>
      <div class="stat span-4"><strong>${user.winners}</strong><small>Teisingi nugalėtojai</small></div>
      <section class="panel span-12"><h3>Mano aktyvumas</h3><p class="message">Išsaugota spėjimų: <b>${picks.length}</b>. Bonusų taškai: <b>${user.bonus}</b>.</p></section>
    </div>`;
}

function renderAdmin() {
  $("#view").innerHTML = `
    <div class="grid">
      <section class="panel span-5">
        <h3>Sukurti / redaguoti rungtynes</h3>
        <form id="matchForm" class="form">
          <input type="hidden" name="id">
          <label>Grupė / etapas<input name="group" required></label>
          <label>Namų komanda<input name="home" required></label>
          <label>Išvykos komanda<input name="away" required></label>
          <label>Stadionas<input name="venue"></label>
          <label>Pradžia<input name="kickoffUtc" type="datetime-local" required></label>
          <button class="primary" type="submit">Išsaugoti rungtynes</button>
        </form>
      </section>
      <section class="panel span-7"><h3>Rungtynių valdymas</h3><div class="table-wrap">${adminMatchesTable()}</div></section>
      <section class="panel span-6"><h3>Visų vartotojų spėjimai</h3><div class="table-wrap">${adminPredictionsTable()}</div></section>
      <section class="panel span-6"><h3>Bonusų patvirtinimas</h3><div class="table-wrap">${adminBonusTable()}</div></section>
      <section class="panel span-12">
        <div class="row-actions">
          <button class="success" id="syncBtn" type="button">Importuoti / atnaujinti iš Sportmonks</button>
          <button class="success" id="defaultCsvBtn" type="button">Importuoti paruoštą World Cup 2026 CSV</button>
          <label class="ghost upload-btn">Įkelti CSV failą<input id="csvFile" type="file" accept=".csv,text/csv"></label>
          <button class="success" id="recalcBtn" type="button">Perskaičiuoti taškus</button>
          <button class="ghost" id="csvBtn" type="button">Eksportuoti CSV</button>
        </div>
        <p class="message">Sync: ${safe(current.sync?.lastRunAt || "dar nevykdyta")} ${current.sync?.lastError ? `· Klaida: ${safe(current.sync.lastError)}` : ""}</p>
      </section>
    </div>`;
  attachAdmin();
}

function adminMatchesTable() {
  return `<table><thead><tr><th>Rungtynės</th><th>Rezultatas</th><th>Veiksmai</th></tr></thead><tbody>${current.matches.map((match) => `
    <tr>
      <td>${safe(match.group)}<br><b>${team(match.home)} - ${team(match.away)}</b><br><span class="meta">${new Date(match.kickoffUtc).toLocaleString("lt-LT")} · ${safe(match.status)}</span></td>
      <td><form class="row-actions result-form" data-result="${match.id}"><input name="homeScore" type="number" min="0" max="20" value="${match.homeScore ?? ""}"><input name="awayScore" type="number" min="0" max="20" value="${match.awayScore ?? ""}"><button class="primary" type="submit">Rezultatas</button></form></td>
      <td><button class="ghost" data-edit="${match.id}" type="button">Redaguoti</button></td>
    </tr>`).join("")}</tbody></table>`;
}

function adminPredictionsTable() {
  const rows = current.predictions.map((prediction) => {
    const match = current.matches.find((item) => item.id === prediction.matchId);
    return `<tr><td>${safe(userName(prediction.userId))}</td><td>${team(match?.home)} - ${team(match?.away)}</td><td>${prediction.homeScore}:${prediction.awayScore}</td><td>${prediction.points || 0}</td></tr>`;
  }).join("");
  return `<table><thead><tr><th>Vartotojas</th><th>Rungtynės</th><th>Spėjimas</th><th>Taškai</th></tr></thead><tbody>${rows || `<tr><td colspan="4">Spėjimų dar nėra.</td></tr>`}</tbody></table>`;
}

function adminBonusTable() {
  const rows = current.bonusPredictions.map((bonus) => `<tr><td>${safe(userName(bonus.userId))}</td><td>${safe(bonus.type)}</td><td>${safe(bonus.team)}</td><td><input type="checkbox" data-bonus="${bonus.id}" ${bonus.awarded ? "checked" : ""}></td></tr>`).join("");
  return `<table><thead><tr><th>Vartotojas</th><th>Tipas</th><th>Komanda</th><th>Įvykdyta</th></tr></thead><tbody>${rows || `<tr><td colspan="4">Bonusų dar nėra.</td></tr>`}</tbody></table>`;
}

function userName(userId) {
  return current.standings.find((item) => item.id === userId)?.username || userId;
}

function attachAdmin() {
  $("#matchForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.kickoffUtc = new Date(data.kickoffUtc).toISOString();
    await request("/api/admin/matches", { method: "POST", body: JSON.stringify(data) });
    await loadState();
  });
  $$("[data-edit]").forEach((button) => button.addEventListener("click", () => {
    const match = current.matches.find((item) => item.id === button.dataset.edit);
    const form = $("#matchForm");
    form.elements.id.value = match.id;
    form.elements.group.value = match.group;
    form.elements.home.value = match.home;
    form.elements.away.value = match.away;
    form.elements.venue.value = match.venue || "";
    form.elements.kickoffUtc.value = localDateValue(match.kickoffUtc);
  }));
  $$(".result-form").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    await request("/api/admin/result", { method: "POST", body: JSON.stringify({ matchId: form.dataset.result, homeScore: data.get("homeScore"), awayScore: data.get("awayScore") }) });
    await loadState();
  }));
  $$("[data-bonus]").forEach((box) => box.addEventListener("change", async () => {
    await request("/api/admin/bonus-award", { method: "POST", body: JSON.stringify({ id: box.dataset.bonus, awarded: box.checked }) });
    await loadState();
  }));
  $("#syncBtn").addEventListener("click", async () => {
    await request("/api/admin/sync", { method: "POST", body: "{}" });
    await loadState();
  });
  $("#defaultCsvBtn").addEventListener("click", async () => {
    const csv = await fetch("/world-cup-2026-fixtures.csv").then((response) => response.text());
    const result = await request("/api/admin/import-csv", { method: "POST", body: JSON.stringify({ csv }) });
    alert(result.message);
    await loadState();
  });
  $("#csvFile").addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const result = await request("/api/admin/import-csv", { method: "POST", body: JSON.stringify({ csv: await file.text() }) });
    alert(result.message);
    event.currentTarget.value = "";
    await loadState();
  });
  $("#recalcBtn").addEventListener("click", async () => {
    await request("/api/admin/recalculate", { method: "POST", body: "{}" });
    await loadState();
  });
  $("#csvBtn").addEventListener("click", async () => {
    const csv = await request("/api/admin/csv", { headers: { accept: "text/csv" } });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "world-cup-leaderboard.csv";
    link.click();
    URL.revokeObjectURL(url);
  });
}

window.addEventListener("hashchange", render);
setInterval(() => {
  if (token) loadState();
}, 30000);
loadState();
