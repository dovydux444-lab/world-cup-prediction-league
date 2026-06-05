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
  const titles = { login: "Prisijungimas", predictions: "Mano spėjimai", matches: "Visų rungtynių sąrašas", finished: "Užbaigti mačai", leaderboard: "Lyderių lentelė", stats: "Mano statistika", rules: "Taisyklės", admin: "Admin panelė" };
  $("#pageTitle").textContent = titles[route] || titles.predictions;
  renderNav(route);
  renderUserPanel();
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
    ["predictions", "Mano spėjimai"],
    ["matches", "Visos rungtynės"],
    ["finished", "Užbaigti mačai"],
    ["leaderboard", "Lyderių lentelė"],
    ["stats", "Mano statistika"],
    ["rules", "Taisyklės"],
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
    const labels = { home: `${match.home} laimės`, draw: "Lygiosios", away: `${match.away} laimės` };
    return `Baigtis: ${labels[prediction.outcome] || "-"}`;
  }
  return `Tikslus rezultatas: ${prediction.homeScore}:${prediction.awayScore}`;
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
            <small>Jūsų spėjimas</small>
            <b>${predictionText(prediction, match)}</b>
            <span>Užrakinta · ${prediction.points || 0} tšk.</span>
            <em>Keisti gali tik adminas, jei paprašysi iki rungtynių.</em>
          </div>` : `<div class="prediction-summary muted">Spėjimo dar nėra</div>`}
        ${editable && !prediction ? `
          <form class="prediction-form" data-predict="${match.id}">
            <div class="prediction-choice-title">Spėti tik baigtį <span>2 tšk.</span></div>
            <div class="winner-picker" role="radiogroup" aria-label="Baigties pasirinkimas">
              <button class="pick-option" type="button" data-pick="home" data-mode="outcome" ${match.locked ? "disabled" : ""}>
                ${flagImg(match.home)}<span>${TEAM_CODES[match.home] || safe(match.home)}</span>
              </button>
              <button class="pick-option" type="button" data-pick="draw" data-mode="outcome" ${match.locked ? "disabled" : ""}>
                <span class="draw-mark">X</span><span>Lygiosios</span>
              </button>
              <button class="pick-option" type="button" data-pick="away" data-mode="outcome" ${match.locked ? "disabled" : ""}>
                ${flagImg(match.away)}<span>${TEAM_CODES[match.away] || safe(match.away)}</span>
              </button>
            </div>
            <div class="prediction-choice-title">Arba spėti tikslų rezultatą <span>7 tšk.</span></div>
            <div class="score-pick">
              <label><span>${TEAM_CODES[match.home] || safe(match.home)}</span><select name="homeScore" ${match.locked ? "disabled" : ""}>${scoreOptions()}</select></label>
              <span class="score-divider">:</span>
              <label><span>${TEAM_CODES[match.away] || safe(match.away)}</span><select name="awayScore" ${match.locked ? "disabled" : ""}>${scoreOptions()}</select></label>
            </div>
            <div class="row-actions">
              <button class="primary" type="submit" data-save-mode="exact" ${match.locked ? "disabled" : ""}>Išsaugoti tikslų rezultatą</button>
            </div>
          </form>` : ""}
      </div>
    </article>`;
}

function attachPredictionForms() {
  $$("[data-predict] .pick-option").forEach((button) => button.addEventListener("click", () => {
    const form = button.closest("[data-predict]");
    const pick = button.dataset.pick;
    savePrediction(form.dataset.predict, { predictionType: "outcome", outcome: pick });
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
  } catch (error) {
    alert(error.message);
  }
}

function renderPredictions() {
  const openMatches = current.matches.filter((match) => match.status !== "finished");
  $("#view").innerHTML = `
    <div class="grid">
      <section class="panel span-8"><h3>Rungtynių spėjimai</h3><div class="match-list">${openMatches.length ? groupedMatches(openMatches, true) : `<p class="message">Šiuo metu nėra atvirų rungtynių.</p>`}</div></section>
      <section class="panel span-4">
        <h3>Turnyro bonusai</h3>
        <form id="bonusForm" class="form">
          ${bonusField("semifinalist", "Pusfinalininkas", 10)}
          ${bonusField("finalist", "Finalininkas", 20)}
          ${bonusField("champion", "Čempionas", 40)}
          <button class="primary" type="submit">Išsaugoti bonusus</button>
          <p class="message">Pasirinkus ir išsaugojus bonusą, jis užsirakina ir jo pakeisti nebegalima.</p>
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
  return `<label>${label} · ${points} tšk.
    <select name="${type}" ${disabled}>
      <option value="">Pasirink komandą</option>
      ${teamOptions(existing?.team)}
    </select>
    ${existing ? `<span class="locked-note">Užrakinta: ${team(existing.team)}</span>` : ""}
  </label>`;
}

function teamOptions(selected = "") {
  const names = [...new Set(current.matches.flatMap((match) => [match.home, match.away]))].sort((a, b) => a.localeCompare(b));
  return names.map((name) => `<option value="${safe(name)}" ${name === selected ? "selected" : ""}>${safe(name)}</option>`).join("");
}

function renderMatches() {
  const openMatches = current.matches.filter((match) => match.status !== "finished");
  $("#view").innerHTML = `<section class="panel"><h3>Visos rungtynės</h3><div class="match-list">${openMatches.length ? groupedMatches(openMatches, false) : `<p class="message">Visos importuotos rungtynės jau užbaigtos.</p>`}</div></section>`;
}

function renderFinishedMatches() {
  const finished = current.matches.filter((match) => match.status === "finished").sort((a, b) => new Date(b.kickoffUtc) - new Date(a.kickoffUtc));
  $("#view").innerHTML = `<section class="panel"><h3>Užbaigti mačai</h3><div class="match-list">${finished.length ? groupedMatches(finished, false) : `<p class="message">Užbaigtų mačų dar nėra.</p>`}</div></section>`;
}

function renderLeaderboard() {
  $("#view").innerHTML = `<section class="panel"><h3>Lyderių lentelė</h3><div class="table-wrap"><table><thead><tr><th>Vieta</th><th>Vartotojas</th><th>Taškai</th><th>Tikslūs rezultatai</th><th>Teisingos baigtys</th></tr></thead><tbody>${current.standings.map((user, index) => `<tr><td class="rank">#${index + 1}</td><td>${safe(user.username)}</td><td><b>${user.points}</b></td><td>${user.exact}</td><td>${user.winners}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function renderStats() {
  const user = current.standings.find((item) => item.id === current.user.id);
  const picks = current.predictions.filter((item) => item.userId === current.user.id);
  $("#view").innerHTML = `
    <div class="grid">
      <div class="stat span-4"><strong>${user.points}</strong><small>Taškai</small></div>
      <div class="stat span-4"><strong>${user.exact}</strong><small>Tikslūs rezultatai</small></div>
      <div class="stat span-4"><strong>${user.winners}</strong><small>Teisingos baigtys</small></div>
      <section class="panel span-12"><h3>Mano aktyvumas</h3><p class="message">Išsaugota spėjimų: <b>${picks.length}</b>. Bonusų taškai: <b>${user.bonus}</b>.</p></section>
    </div>`;
}

function renderRules() {
  $("#view").innerHTML = `
    <div class="grid">
      <section class="panel span-7">
        <h3>Kaip žaisti</h3>
        <div class="rules-list">
          <div class="rule-step"><b>1</b><span>Vienoje rungtynių kortelėje padarai vieną spėjimą.</span></div>
          <div class="rule-step"><b>2</b><span>Gali rinktis vieną iš dviejų kelių: spėti tik baigtį arba spėti tikslų rezultatą.</span></div>
          <div class="rule-step"><b>3</b><span>Baigtis reiškia: pirma komanda laimės, lygiosios arba antra komanda laimės. Už pataikymą gauni 2 taškus.</span></div>
          <div class="rule-step"><b>4</b><span>Tikslus rezultatas reiškia, kad turi idealiai pataikyti skaičius, pvz. <b>2:1</b>. Už pataikymą gauni 7 taškus.</span></div>
          <div class="rule-step"><b>5</b><span>Paspaudus išsaugoti, spėjimas užsirakina iš karto. Jei reikia taisyti iki rungtynių, reikia kreiptis į adminą.</span></div>
          <div class="rule-step"><b>6</b><span>Po rungtynių adminas įveda galutinį rezultatą, o sistema automatiškai paskaičiuoja taškus.</span></div>
        </div>
      </section>
      <section class="panel span-5">
        <h3>Kas laimi</h3>
        <p class="message">Lygą laimi vartotojas, surinkęs daugiausiai taškų. Jei taškų vienodai, aukščiau rodomas tas, kuris turi daugiau tiksliai atspėtų rezultatų. Tikslus rezultatas duoda 7 taškus, o ne 7+2.</p>
        <div class="stat"><strong>#1</strong><small>Daugiausiai taškų lyderių lentelėje</small></div>
      </section>
      <section class="panel span-12">
        <h3>Taškų sistema</h3>
        <div class="score-rules">
          ${ruleCard("7", "Tikslus rezultatas", "Spėjai 2:1, rungtynės baigėsi 2:1. Gauni 7 taškus.")}
          ${ruleCard("2", "Teisinga baigtis", "Pasirinkai, kad Brazilija laimės, ir ji laimėjo. Tikslaus rezultato čia nereikia.")}
          ${ruleCard("2", "Teisingos lygiosios", "Pasirinkai lygiosios, rungtynės baigėsi 2:2. Gauni 2 taškus.")}
          ${ruleCard("0", "Nepataikyta", "Spėjai, kad pirma komanda laimės, bet laimėjo antra komanda arba buvo lygiosios.")}
        </div>
      </section>
      <section class="panel span-12">
        <h3>Turnyro bonusai</h3>
        <div class="bonus-grid">
          <div><b>10 tšk.</b><span>Pusfinalininkas</span></div>
          <div><b>20 tšk.</b><span>Finalininkas</span></div>
          <div><b>40 tšk.</b><span>Čempionas</span></div>
        </div>
        <p class="message">Bonusų pasirinkimai užsirakina po išsaugojimo ir jų pakeisti nebegalima.</p>
      </section>
    </div>`;
}

function ruleCard(points, title, example) {
  return `<article class="rule-card"><strong>${points}</strong><div><b>${title}</b><p>${example}</p></div></article>`;
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
    return `<tr>
      <td>${safe(userName(prediction.userId))}</td>
      <td>${team(match?.home)} - ${team(match?.away)}</td>
      <td>${predictionText(prediction, match)}</td>
      <td>${prediction.points || 0}</td>
      <td>${adminPredictionControls(prediction)}</td>
    </tr>`;
  }).join("");
  return `<table><thead><tr><th>Vartotojas</th><th>Rungtynės</th><th>Spėjimas</th><th>Taškai</th><th>Admin</th></tr></thead><tbody>${rows || `<tr><td colspan="5">Spėjimų dar nėra.</td></tr>`}</tbody></table>`;
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
  return `<table><thead><tr><th>Vartotojas</th><th>Tipas</th><th>Komanda</th><th>Įvykdyta</th></tr></thead><tbody>${rows || `<tr><td colspan="4">Bonusų dar nėra.</td></tr>`}</tbody></table>`;
}

function bonusLabel(type) {
  return { semifinalist: "Pusfinalininkas", finalist: "Finalininkas", champion: "Čempionas" }[type] || type;
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
setInterval(() => {
  if (token) loadState();
}, 30000);
loadState();
