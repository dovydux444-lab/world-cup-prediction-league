const API = "";
const tokenKey = "wcPredictionLeague.token";

let token = localStorage.getItem(tokenKey) || "";
let current = null;
let authMode = "login";
let selectedAdminUserId = "";
let adminClock = null;
let stateTimer = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const FLAGS = {
  Algeria: "ðŸ‡©ðŸ‡¿", Argentina: "ðŸ‡¦ðŸ‡·", Australia: "ðŸ‡¦ðŸ‡º", Austria: "ðŸ‡¦ðŸ‡¹", Belgium: "ðŸ‡§ðŸ‡ª", "Bosnia & Herzegovina": "ðŸ‡§ðŸ‡¦",
  Brazil: "ðŸ‡§ðŸ‡·", Canada: "ðŸ‡¨ðŸ‡¦", "Cape Verde": "ðŸ‡¨ðŸ‡»", Colombia: "ðŸ‡¨ðŸ‡´", Croatia: "ðŸ‡­ðŸ‡·", Curacao: "ðŸ‡¨ðŸ‡¼",
  "Czech Republic": "ðŸ‡¨ðŸ‡¿", "DR Congo": "ðŸ‡¨ðŸ‡©", Ecuador: "ðŸ‡ªðŸ‡¨", Egypt: "ðŸ‡ªðŸ‡¬", England: "ðŸ´", France: "ðŸ‡«ðŸ‡·",
  Germany: "ðŸ‡©ðŸ‡ª", Ghana: "ðŸ‡¬ðŸ‡­", Haiti: "ðŸ‡­ðŸ‡¹", Iran: "ðŸ‡®ðŸ‡·", Iraq: "ðŸ‡®ðŸ‡¶", "Ivory Coast": "ðŸ‡¨ðŸ‡®",
  Japan: "ðŸ‡¯ðŸ‡µ", Jordan: "ðŸ‡¯ðŸ‡´", Mexico: "ðŸ‡²ðŸ‡½", Morocco: "ðŸ‡²ðŸ‡¦", Netherlands: "ðŸ‡³ðŸ‡±", "New Zealand": "ðŸ‡³ðŸ‡¿",
  Norway: "ðŸ‡³ðŸ‡´", Panama: "ðŸ‡µðŸ‡¦", Paraguay: "ðŸ‡µðŸ‡¾", Portugal: "ðŸ‡µðŸ‡¹", Qatar: "ðŸ‡¶ðŸ‡¦", "Saudi Arabia": "ðŸ‡¸ðŸ‡¦",
  Scotland: "ðŸ´", Senegal: "ðŸ‡¸ðŸ‡³", "South Africa": "ðŸ‡¿ðŸ‡¦", "South Korea": "ðŸ‡°ðŸ‡·", Spain: "ðŸ‡ªðŸ‡¸", Sweden: "ðŸ‡¸ðŸ‡ª",
  Switzerland: "ðŸ‡¨ðŸ‡­", Tunisia: "ðŸ‡¹ðŸ‡³", Turkey: "ðŸ‡¹ðŸ‡·", Uruguay: "ðŸ‡ºðŸ‡¾", USA: "ðŸ‡ºðŸ‡¸", Uzbekistan: "ðŸ‡ºðŸ‡¿",
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
  if (!code) return `<span class="${className} fallback">${FLAGS[name] || "ðŸ³ï¸"}</span>`;
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
  if (!response.ok) throw new Error(payload.error || "Ä®vyko klaida.");
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

function renderParticipants() {
  const target = $("#participantsList");
  if (!target) return;
  if (!current?.standings?.length) {
    target.innerHTML = `<p>Prisijunkite, kad matytumÄ—te dalyvius.</p>`;
    return;
  }
  target.innerHTML = current.standings.map((user, index) => `
    <p class="participant-row"><b>#${index + 1} ${safe(user.username)}</b><span>${user.points} tÅ¡k.</span></p>
  `).join("");
}

function renderServerRequired() {
  $("#nav").innerHTML = `<button class="active">Paleidimas</button>`;
  $("#pageTitle").textContent = "Reikia paleisti serverÄ¯";
  $("#userPanel").innerHTML = `<span class="pill">Lokali reali versija</span>`;
  $("#view").innerHTML = `
    <section class="panel">
      <h3>Å ita versija nebeatidaroma tiesiai kaip failas</h3>
      <p class="message">Kad veiktÅ³ prisijungimai, serverinis uÅ¾rakinimas, automatinis taÅ¡kÅ³ skaiÄiavimas ir Sportmonks importas, puslapÄ¯ reikia paleisti per Netlify arba lokalÅ³ serverÄ¯.</p>
      <div class="stack">
        <label>1. PowerShell komanda
          <input readonly value="cd C:\\Users\\User\\Documents\\Codex\\2026-06-05\\sukurk-moderni-fifa-world-cup-prediction\\outputs">
        </label>
        <label>2. Paleidimas
          <input readonly value="node server.cjs">
        </label>
        <label>3. NarÅ¡yklÄ—s adresas
          <input readonly value="http://127.0.0.1:4173">
        </label>
        <p class="message">Ä®kÄ—lus Ä¯ Netlify, naudok Netlify duotÄ… svetainÄ—s adresÄ….</p>
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
  if (adminClock) {
    clearInterval(adminClock);
    adminClock = null;
  }
  const route = routeName();
  const titles = { login: "Prisijungimas", predictions: "Mano spÄ—jimai", matches: "VisÅ³ rungtyniÅ³ sÄ…raÅ¡as", finished: "UÅ¾baigti maÄai", leaderboard: "LyderiÅ³ lentelÄ—", stats: "Mano statistika", rules: "TaisyklÄ—s", admin: "Admin panelÄ—" };
  $("#pageTitle").textContent = titles[route] || titles.predictions;
  renderNav(route);
  renderUserPanel();
  renderParticipants();
  if (route === "login") return renderAuth();
  if (!current) return;
  if (route === "predictions") return renderPredictions();
  if (route === "matches") return renderMatches();
  if (route === "finished") return renderFinishedMatches();
  if (route === "leaderboard") return renderLeaderboard();
  if (route === "stats") return renderStats();
  if (route === "rules") return renderRules();
  if (route === "admin") return renderAdmin();
}

function renderNav(active) {
  const items = token ? [
    ["predictions", "Mano spÄ—jimai"],
    ["matches", "Visos rungtynÄ—s"],
    ["finished", "UÅ¾baigti maÄai"],
    ["leaderboard", "LyderiÅ³ lentelÄ—"],
    ["stats", "Mano statistika"],
    ["rules", "TaisyklÄ—s"],
    ...(current?.user?.isAdmin ? [["admin", "Admin panelÄ—"]] : []),
  ] : [["login", "Prisijungimas"]];
  $("#nav").innerHTML = items.map(([id, label]) => `<button class="${id === active ? "active" : ""}" data-route="${id}">${label}</button>`).join("");
  $$("#nav button").forEach((button) => button.addEventListener("click", () => {
    location.hash = button.dataset.route;
    render();
  }));
}

function renderUserPanel() {
  $("#userPanel").innerHTML = current?.user
    ? `<span class="pill">${safe(current.user.username)}${current.user.isAdmin ? " Â· admin" : ""}</span><button class="ghost" id="logoutBtn">Atsijungti</button>`
    : `<span class="pill">NeprisijungÄ™s</span>`;
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
  return match.locked ? "UÅ¾rakinta" : "Atvira";
}

function pickFromScore(prediction) {
  if (!prediction) return "";
  if (prediction.predictionType === "outcome") return prediction.outcome || "";
  if (Number(prediction.homeScore) > Number(prediction.awayScore)) return "home";
  if (Number(prediction.homeScore) < Number(prediction.awayScore)) return "away";
  return "draw";
}

function scoreOptions(value = "") {
  return Array.from({ length: 13 }, (_, number) => `<option value="${number}" ${Number(value) === number ? "selected" : ""}>${number}</option>`).join("");
}

function predictionText(prediction, match) {
  if (!prediction) return "";
  if (prediction.predictionType === "outcome") {
    const labels = { home: `${match.home} laimÄ—s`, draw: "Lygiosios", away: `${match.away} laimÄ—s` };
    return `Baigtis: ${labels[prediction.outcome] || "-"}`;
  }
  return `Tikslus rezultatas: ${prediction.homeScore}:${prediction.awayScore}`;
}

function lockAge(iso) {
  if (!iso) return "-";
  let seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const days = Math.floor(seconds / 86400);
  seconds -= days * 86400;
  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  return `${days}d ${hours}val ${minutes}min ${seconds}s`;
}

function lockTime(prediction) {
  const iso = prediction.createdAt || prediction.updatedAt;
  return `<span class="lock-time" data-lock-iso="${safe(iso || "")}"><b>${lockAge(iso)}</b><small>${iso ? new Date(iso).toLocaleString("lt-LT") : "-"}</small></span>`;
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
        ${prediction ? `
          <div class="prediction-summary locked-summary">
            <small>JÅ«sÅ³ spÄ—jimas</small>
            <b>${predictionText(prediction, match)}</b>
            <span>UÅ¾rakinta Â· ${prediction.points || 0} tÅ¡k.</span>
            <em>Keisti gali tik adminas, jei papraÅ¡ysi iki rungtyniÅ³.</em>
          </div>` : `<div class="prediction-summary muted">SpÄ—jimo dar nÄ—ra</div>`}
        ${editable && !prediction ? `
          <form class="prediction-form" data-predict="${match.id}">
            <div class="prediction-choice-title">SpÄ—ti tik baigtÄ¯ <span>2 tÅ¡k.</span></div>
            <div class="winner-picker" role="radiogroup" aria-label="Baigties pasirinkimas">
              <button class="pick-option" type="button" data-outcome-pick="home" ${match.locked ? "disabled" : ""} title="IÅ¡saugoti baigtÄ¯: ${safe(match.home)} laimÄ—s">
                ${flagImg(match.home)}<span>${TEAM_CODES[match.home] || safe(match.home)}</span>
              </button>
              <button class="pick-option" type="button" data-outcome-pick="draw" ${match.locked ? "disabled" : ""} title="IÅ¡saugoti baigtÄ¯: lygiosios">
                <span class="draw-mark">X</span><span>Lygiosios</span>
              </button>
              <button class="pick-option" type="button" data-outcome-pick="away" ${match.locked ? "disabled" : ""} title="IÅ¡saugoti baigtÄ¯: ${safe(match.away)} laimÄ—s">
                ${flagImg(match.away)}<span>${TEAM_CODES[match.away] || safe(match.away)}</span>
              </button>
            </div>
            <div class="prediction-choice-title">Arba spÄ—ti tikslÅ³ rezultatÄ… <span>7 tÅ¡k.</span></div>
            <div class="score-pick">
              <label><span>${TEAM_CODES[match.home] || safe(match.home)}</span><select name="homeScore" ${match.locked ? "disabled" : ""}>${scoreOptions()}</select></label>
              <span class="score-divider">:</span>
              <label><span>${TEAM_CODES[match.away] || safe(match.away)}</span><select name="awayScore" ${match.locked ? "disabled" : ""}>${scoreOptions()}</select></label>
            </div>
            <div class="row-actions">
              <button class="primary" type="submit" data-save-mode="exact" ${match.locked ? "disabled" : ""}>IÅ¡saugoti tikslÅ³ rezultatÄ…</button>
            </div>
          </form>` : ""}
      </div>
    </article>`;
}

function attachPredictionForms() {
  $$("[data-predict] [data-outcome-pick]").forEach((button) => button.addEventListener("click", async () => {
    const form = button.closest("[data-predict]");
    const pick = button.dataset.outcomePick;
    button.disabled = true;
    const saved = await savePrediction(form.dataset.predict, { predictionType: "outcome", outcome: pick });
    if (!saved) button.disabled = false;
  }));
  $$("[data-predict]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const homeScore = Number(data.get("homeScore"));
    const awayScore = Number(data.get("awayScore"));
    savePrediction(form.dataset.predict, { predictionType: "exact", homeScore, awayScore });
  }));
}

async function savePrediction(matchId, payload) {
  try {
    await request("/api/predictions", {
      method: "POST",
      body: JSON.stringify({ matchId, ...payload }),
    });
    await loadState();
    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

function renderPredictions() {
  const openMatches = current.matches.filter((match) => match.status !== "finished");
  $("#view").innerHTML = `
    <div class="grid">
      <section class="panel span-8"><h3>RungtyniÅ³ spÄ—jimai</h3><div class="match-list">${openMatches.length ? groupedMatches(openMatches, true) : `<p class="message">Å iuo metu nÄ—ra atvirÅ³ rungtyniÅ³.</p>`}</div></section>
      <section class="panel span-4">
        <h3>Turnyro bonusai</h3>
        <form id="bonusForm" class="form">
          ${bonusField("semifinalist", "Pusfinalininkas", 10)}
          ${bonusField("finalist", "Finalininkas", 20)}
          ${bonusField("champion", "ÄŒempionas", 40)}
          <button class="primary" type="submit">IÅ¡saugoti bonusus</button>
          <p class="message">Pasirinkus ir iÅ¡saugojus bonusÄ…, jis uÅ¾sirakina ir jo pakeisti nebegalima.</p>
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
  const disabled = existing ? "disabled" : "";
  return `<label>${label} Â· ${points} tÅ¡k.
    <select name="${type}" ${disabled}>
      <option value="">Pasirink komandÄ…</option>
      ${teamOptions(existing?.team)}
    </select>
    ${existing ? `<span class="locked-note">UÅ¾rakinta: ${team(existing.team)}</span>` : ""}
  </label>`;
}

function teamOptions(selected = "") {
  const names = [...new Set(current.matches.flatMap((match) => [match.home, match.away]))].sort((a, b) => a.localeCompare(b));
  return names.map((name) => `<option value="${safe(name)}" ${name === selected ? "selected" : ""}>${safe(name)}</option>`).join("");
}

function renderMatches() {
  const openMatches = current.matches.filter((match) => match.status !== "finished");
  $("#view").innerHTML = `<section class="panel"><h3>Visos rungtynÄ—s</h3><div class="match-list">${openMatches.length ? groupedMatches(openMatches, false) : `<p class="message">Visos importuotos rungtynÄ—s jau uÅ¾baigtos.</p>`}</div></section>`;
}

function renderFinishedMatches() {
  const finished = current.matches.filter((match) => match.status === "finished").sort((a, b) => new Date(b.kickoffUtc) - new Date(a.kickoffUtc));
  $("#view").innerHTML = `<section class="panel"><h3>UÅ¾baigti maÄai</h3><div class="match-list">${finished.length ? groupedMatches(finished, false) : `<p class="message">UÅ¾baigtÅ³ maÄÅ³ dar nÄ—ra.</p>`}</div></section>`;
}

function renderLeaderboard() {
  $("#view").innerHTML = `<section class="panel"><h3>LyderiÅ³ lentelÄ—</h3><div class="table-wrap"><table><thead><tr><th>Vieta</th><th>Vartotojas</th><th>TaÅ¡kai</th><th>TikslÅ«s rezultatai</th><th>Teisingos baigtys</th></tr></thead><tbody>${current.standings.map((user, index) => `<tr><td class="rank">#${index + 1}</td><td>${safe(user.username)}</td><td><b>${user.points}</b></td><td>${user.exact}</td><td>${user.winners}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function renderStats() {
  const user = current.standings.find((item) => item.id === current.user.id);
  const picks = current.predictions.filter((item) => item.userId === current.user.id);
  $("#view").innerHTML = `
    <div class="grid">
      <div class="stat span-4"><strong>${user.points}</strong><small>TaÅ¡kai</small></div>
      <div class="stat span-4"><strong>${user.exact}</strong><small>TikslÅ«s rezultatai</small></div>
      <div class="stat span-4"><strong>${user.winners}</strong><small>Teisingos baigtys</small></div>
      <section class="panel span-12"><h3>Mano aktyvumas</h3><p class="message">IÅ¡saugota spÄ—jimÅ³: <b>${picks.length}</b>. BonusÅ³ taÅ¡kai: <b>${user.bonus}</b>.</p></section>
    </div>`;
}

function renderRules() {
  $("#view").innerHTML = `
    <div class="grid">
      <section class="panel span-7">
        <h3>Kaip Å¾aisti</h3>
        <div class="rules-list">
          <div class="rule-step"><b>1</b><span>Vienoje rungtyniÅ³ kortelÄ—je padarai vienÄ… spÄ—jimÄ….</span></div>
          <div class="rule-step"><b>2</b><span>Gali rinktis vienÄ… iÅ¡ dviejÅ³ keliÅ³: spÄ—ti tik baigtÄ¯ arba spÄ—ti tikslÅ³ rezultatÄ….</span></div>
          <div class="rule-step"><b>3</b><span>Baigtis reiÅ¡kia: pirma komanda laimÄ—s, lygiosios arba antra komanda laimÄ—s. UÅ¾ pataikymÄ… gauni 2 taÅ¡kus.</span></div>
          <div class="rule-step"><b>4</b><span>Tikslus rezultatas reiÅ¡kia, kad turi idealiai pataikyti skaiÄius, pvz. <b>2:1</b>. UÅ¾ pataikymÄ… gauni 7 taÅ¡kus.</span></div>
          <div class="rule-step"><b>5</b><span>Paspaudus iÅ¡saugoti, spÄ—jimas uÅ¾sirakina iÅ¡ karto. Jei reikia taisyti iki rungtyniÅ³, reikia kreiptis Ä¯ adminÄ….</span></div>
          <div class="rule-step"><b>6</b><span>Po rungtyniÅ³ adminas Ä¯veda galutinÄ¯ rezultatÄ…, o sistema automatiÅ¡kai paskaiÄiuoja taÅ¡kus.</span></div>
        </div>
      </section>
      <section class="panel span-5">
        <h3>Kas laimi</h3>
        <p class="message">LygÄ… laimi vartotojas, surinkÄ™s daugiausiai taÅ¡kÅ³. Jei taÅ¡kÅ³ vienodai, aukÅ¡Äiau rodomas tas, kuris turi daugiau tiksliai atspÄ—tÅ³ rezultatÅ³. Tikslus rezultatas duoda 7 taÅ¡kus, o ne 7+2.</p>
        <div class="stat"><strong>#1</strong><small>Daugiausiai taÅ¡kÅ³ lyderiÅ³ lentelÄ—je</small></div>
      </section>
      <section class="panel span-12">
        <h3>TaÅ¡kÅ³ sistema</h3>
        <div class="score-rules">
          ${ruleCard("7", "Tikslus rezultatas", "SpÄ—jai 2:1, rungtynÄ—s baigÄ—si 2:1. Gauni 7 taÅ¡kus.")}
          ${ruleCard("2", "Teisinga baigtis", "Pasirinkai, kad Brazilija laimÄ—s, ir ji laimÄ—jo. Tikslaus rezultato Äia nereikia.")}
          ${ruleCard("2", "Teisingos lygiosios", "Pasirinkai lygiosios, rungtynÄ—s baigÄ—si 2:2. Gauni 2 taÅ¡kus.")}
          ${ruleCard("0", "Nepataikyta", "SpÄ—jai, kad pirma komanda laimÄ—s, bet laimÄ—jo antra komanda arba buvo lygiosios.")}
        </div>
      </section>
      <section class="panel span-12">
        <h3>Turnyro bonusai</h3>
        <div class="bonus-grid">
          <div><b>10 tÅ¡k.</b><span>Pusfinalininkas</span></div>
          <div><b>20 tÅ¡k.</b><span>Finalininkas</span></div>
          <div><b>40 tÅ¡k.</b><span>ÄŒempionas</span></div>
        </div>
        <p class="message">BonusÅ³ pasirinkimai uÅ¾sirakina po iÅ¡saugojimo ir jÅ³ pakeisti nebegalima.</p>
      </section>
    </div>`;
}

function ruleCard(points, title, example) {
  return `<article class="rule-card"><strong>${points}</strong><div><b>${title}</b><p>${example}</p></div></article>`;
}

function renderAdmin() {
  if (!selectedAdminUserId && current.standings.length) selectedAdminUserId = current.standings[0].id;
  $("#view").innerHTML = `
    <div class="grid">
      <section class="panel span-5">
        <h3>Sukurti / redaguoti rungtynes</h3>
        <form id="matchForm" class="form">
          <input type="hidden" name="id">
          <label>GrupÄ— / etapas<input name="group" required></label>
          <label>NamÅ³ komanda<input name="home" required></label>
          <label>IÅ¡vykos komanda<input name="away" required></label>
          <label>Stadionas<input name="venue"></label>
          <label>PradÅ¾ia<input name="kickoffUtc" type="datetime-local" required></label>
          <button class="primary" type="submit">IÅ¡saugoti rungtynes</button>
        </form>
      </section>
      <section class="panel span-7"><h3>RungtyniÅ³ valdymas</h3><div class="table-wrap">${adminMatchesTable()}</div></section>
      <section class="panel span-4"><h3>UÅ¾siregistravÄ™ vartotojai</h3>${adminUsersPanel()}</section>
      <section class="panel span-8"><h3>Vartotojo profilis</h3>${adminUserProfile()}</section>
      <section class="panel span-6"><h3>VisÅ³ vartotojÅ³ spÄ—jimai</h3><div class="table-wrap">${adminPredictionsTable()}</div></section>
      <section class="panel span-6"><h3>BonusÅ³ patvirtinimas</h3><div class="table-wrap">${adminBonusTable()}</div></section>
      <section class="panel span-12">
        <div class="row-actions">
          <button class="success" id="syncBtn" type="button">Importuoti / atnaujinti iÅ¡ Sportmonks</button>
          <button class="success" id="defaultCsvBtn" type="button">Importuoti paruoÅ¡tÄ… World Cup 2026 CSV</button>
          <label class="ghost upload-btn">Ä®kelti CSV failÄ…<input id="csvFile" type="file" accept=".csv,text/csv"></label>
          <button class="success" id="recalcBtn" type="button">PerskaiÄiuoti taÅ¡kus</button>
          <button class="ghost" id="csvBtn" type="button">Eksportuoti CSV</button>
        </div>
        <p class="message">Sync: ${safe(current.sync?.lastRunAt || "dar nevykdyta")} ${current.sync?.lastError ? `Â· Klaida: ${safe(current.sync.lastError)}` : ""}</p>
      </section>
    </div>`;
  attachAdmin();
  adminClock = setInterval(() => {
    if (routeName() !== "admin") return;
    $$("[data-lock-iso]").forEach((node) => {
      const iso = node.dataset.lockIso;
      node.innerHTML = `<b>${lockAge(iso)}</b><small>${iso ? new Date(iso).toLocaleString("lt-LT") : "-"}</small>`;
    });
  }, 1000);
}

function adminUsersPanel() {
  return `<div class="admin-user-list">${current.standings.map((user) => `
    <button class="admin-user-card ${selectedAdminUserId === user.id ? "active" : ""}" type="button" data-admin-user="${user.id}">
      <span>
        <b>${safe(user.username)}</b>
        <small>${user.points} tÅ¡k. Â· ${user.exact} tikslÅ«s Â· ${user.winners} baigtys</small>
      </span>
      <strong>#${current.standings.findIndex((item) => item.id === user.id) + 1}</strong>
    </button>`).join("")}</div>`;
}

function adminUserProfile() {
  const user = current.standings.find((item) => item.id === selectedAdminUserId);
  if (!user) return `<p class="message">Pasirink vartotojÄ….</p>`;
  const predictions = current.predictions.filter((prediction) => prediction.userId === user.id);
  const bonuses = current.bonusPredictions.filter((bonus) => bonus.userId === user.id && bonus.type !== "groupWinner");
  return `
    <div class="profile-head">
      <div><b>${safe(user.username)}</b><span>${user.points} tÅ¡k. Â· ${predictions.length} spÄ—j.</span></div>
      <small>Adminas gali keisti arba iÅ¡trinti spÄ—jimus, kai vartotojas papraÅ¡o korekcijos.</small>
    </div>
    <div class="table-wrap">${adminPredictionsTable(user.id)}</div>
    <h4>Bonusai</h4>
    <div class="bonus-grid compact">
      ${bonuses.length ? bonuses.map((bonus) => `<div><b>${safe(bonusLabel(bonus.type))}</b><span>${team(bonus.team)} Â· ${bonus.awarded ? "uÅ¾skaityta" : "laukiama"}</span></div>`).join("") : `<p class="message">BonusÅ³ dar nÄ—ra.</p>`}
    </div>`;
}

function adminMatchesTable() {
  return `<table><thead><tr><th>RungtynÄ—s</th><th>Rezultatas</th><th>Veiksmai</th></tr></thead><tbody>${current.matches.map((match) => `
    <tr>
      <td>${safe(match.group)}<br><b>${team(match.home)} - ${team(match.away)}</b><br><span class="meta">${new Date(match.kickoffUtc).toLocaleString("lt-LT")} Â· ${safe(match.status)}</span></td>
      <td><form class="row-actions result-form" data-result="${match.id}"><input name="homeScore" type="number" min="0" max="20" value="${match.homeScore ?? ""}"><input name="awayScore" type="number" min="0" max="20" value="${match.awayScore ?? ""}"><button class="primary" type="submit">Rezultatas</button></form></td>
      <td><button class="ghost" data-edit="${match.id}" type="button">Redaguoti</button></td>
    </tr>`).join("")}</tbody></table>`;
}

function adminPredictionsTable(userId = "") {
  const source = userId ? current.predictions.filter((prediction) => prediction.userId === userId) : current.predictions;
  const rows = source.map((prediction) => {
    const match = current.matches.find((item) => item.id === prediction.matchId);
    return `<tr>
      <td>${safe(userName(prediction.userId))}</td>
      <td>${team(match?.home)} - ${team(match?.away)}</td>
      <td>${predictionText(prediction, match)}</td>
      <td>${prediction.points || 0}</td>
      <td>${lockTime(prediction)}</td>
      <td>${adminPredictionControls(prediction)}</td>
    </tr>`;
  }).join("");
  return `<table><thead><tr><th>Vartotojas</th><th>RungtynÄ—s</th><th>SpÄ—jimas</th><th>TaÅ¡kai</th><th>UÅ¾rakinta prieÅ¡</th><th>Admin</th></tr></thead><tbody>${rows || `<tr><td colspan="6">SpÄ—jimÅ³ dar nÄ—ra.</td></tr>`}</tbody></table>`;
}

function adminPredictionControls(prediction) {
  return `<form class="admin-prediction-form stack" data-admin-prediction="${prediction.id}">
    <select name="predictionType">
      <option value="outcome" ${prediction.predictionType === "outcome" ? "selected" : ""}>Baigtis</option>
      <option value="exact" ${prediction.predictionType !== "outcome" ? "selected" : ""}>Tikslus rezultatas</option>
    </select>
    <select name="outcome">
      <option value="home" ${prediction.outcome === "home" ? "selected" : ""}>Pirma komanda</option>
      <option value="draw" ${prediction.outcome === "draw" ? "selected" : ""}>Lygiosios</option>
      <option value="away" ${prediction.outcome === "away" ? "selected" : ""}>Antra komanda</option>
    </select>
    <div class="score-pick compact">
      <select name="homeScore">${scoreOptions(prediction.homeScore ?? 0)}</select>
      <span class="score-divider">:</span>
      <select name="awayScore">${scoreOptions(prediction.awayScore ?? 0)}</select>
    </div>
    <div class="row-actions">
      <button class="primary" type="submit">Pakeisti</button>
      <button class="danger" type="button" data-delete-prediction="${prediction.id}">Trinti</button>
    </div>
  </form>`;
}

function adminBonusTable() {
  const rows = current.bonusPredictions.filter((bonus) => bonus.type !== "groupWinner").map((bonus) => `<tr><td>${safe(userName(bonus.userId))}</td><td>${safe(bonusLabel(bonus.type))}</td><td>${team(bonus.team)}</td><td><input type="checkbox" data-bonus="${bonus.id}" ${bonus.awarded ? "checked" : ""}></td></tr>`).join("");
  return `<table><thead><tr><th>Vartotojas</th><th>Tipas</th><th>Komanda</th><th>Ä®vykdyta</th></tr></thead><tbody>${rows || `<tr><td colspan="4">BonusÅ³ dar nÄ—ra.</td></tr>`}</tbody></table>`;
}

function bonusLabel(type) {
  return { semifinalist: "Pusfinalininkas", finalist: "Finalininkas", champion: "ÄŒempionas" }[type] || type;
}

function userName(userId) {
  return current.standings.find((item) => item.id === userId)?.username || userId;
}

function attachAdmin() {
  $$("[data-admin-user]").forEach((button) => button.addEventListener("click", () => {
    selectedAdminUserId = button.dataset.adminUser;
    renderAdmin();
  }));
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
  $$(".admin-prediction-form").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    await request("/api/admin/prediction", {
      method: "POST",
      body: JSON.stringify({
        id: form.dataset.adminPrediction,
        predictionType: data.predictionType,
        outcome: data.outcome,
        homeScore: Number(data.homeScore),
        awayScore: Number(data.awayScore),
      }),
    });
    await loadState();
  }));
  $$("[data-delete-prediction]").forEach((button) => button.addEventListener("click", async () => {
    await request("/api/admin/prediction", {
      method: "POST",
      body: JSON.stringify({ id: button.dataset.deletePrediction, delete: true }),
    });
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
stateTimer = setInterval(() => {
  if (token && routeName() !== "admin") loadState();
}, 60000);
loadState();

