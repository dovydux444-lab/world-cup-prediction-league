const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

loadEnvFile();

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN || "";
const WORLD_CUP_LEAGUE_ID = process.env.SPORTMONKS_WORLD_CUP_LEAGUE_ID || "732";
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const LOCK_MINUTES = 5;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

let db = null;

function loadEnvFile() {
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

const id = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};
const verifyPassword = (password, stored) => {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), candidate);
};
const publicUser = (user) => ({ id: user.id, username: user.username, isAdmin: user.isAdmin });

async function ensureDb() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(await fsp.readFile(DB_FILE, "utf8"));
    return;
  }
  const base = new Date();
  const plus = (hours) => new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
  db = {
    sessions: {},
    users: [
      { id: id(), username: "admin67", passwordHash: hashPassword("admin123"), isAdmin: true, createdAt: nowIso() },
      { id: id(), username: "marius", passwordHash: hashPassword("marius123"), isAdmin: false, createdAt: nowIso() },
    ],
    matches: [
      { id: id(), externalId: "", group: "A grupė", home: "Brazilija", away: "Kroatija", kickoffUtc: plus(6), venue: "Demo stadionas", status: "scheduled", homeScore: null, awayScore: null, updatedAt: nowIso() },
      { id: id(), externalId: "", group: "B grupė", home: "Argentina", away: "Japonija", kickoffUtc: plus(28), venue: "Demo stadionas", status: "scheduled", homeScore: null, awayScore: null, updatedAt: nowIso() },
      { id: id(), externalId: "", group: "C grupė", home: "Prancūzija", away: "Marokas", kickoffUtc: plus(-3), venue: "Demo stadionas", status: "finished", homeScore: 2, awayScore: 1, updatedAt: nowIso() },
    ],
    predictions: [],
    bonusPredictions: [],
    sync: { lastRunAt: null, lastError: null, provider: "sportmonks", enabled: Boolean(SPORTMONKS_TOKEN) },
  };
  await saveDb();
}

async function saveDb() {
  await fsp.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireUser(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const userId = db.sessions[token];
  return db.users.find((user) => user.id === userId) || null;
}

function requireAdmin(req) {
  const user = requireUser(req);
  return user?.isAdmin ? user : null;
}

function isLocked(match) {
  return new Date(match.kickoffUtc).getTime() - Date.now() <= LOCK_MINUTES * 60 * 1000;
}

function scorePrediction(match, prediction) {
  if (!match || match.status !== "finished" || match.homeScore === null || match.awayScore === null || !prediction) {
    return { points: 0, exact: 0, winner: 0 };
  }
  const actualHome = Number(match.homeScore);
  const actualAway = Number(match.awayScore);
  const pickHome = Number(prediction.homeScore);
  const pickAway = Number(prediction.awayScore);
  const actualDiff = actualHome - actualAway;
  const pickDiff = pickHome - pickAway;
  const actualSign = Math.sign(actualDiff);
  const pickSign = Math.sign(pickDiff);
  if (actualHome === pickHome && actualAway === pickAway) return { points: 10, exact: 1, winner: 1 };
  if (actualSign !== 0 && actualSign === pickSign && actualDiff === pickDiff) return { points: 5, exact: 0, winner: 1 };
  if (actualSign !== 0 && actualSign === pickSign) return { points: 3, exact: 0, winner: 1 };
  if (actualSign === 0 && pickSign === 0) return { points: 1, exact: 0, winner: 0 };
  if (actualHome === pickHome || actualAway === pickAway) return { points: 2, exact: 0, winner: 0 };
  return { points: 0, exact: 0, winner: 0 };
}

function bonusPoints(bonus) {
  const values = { groupWinner: 5, semifinalist: 10, finalist: 20, champion: 40 };
  return bonus.awarded ? values[bonus.type] || 0 : 0;
}

function recalculate() {
  db.predictions.forEach((prediction) => {
    const result = scorePrediction(db.matches.find((match) => match.id === prediction.matchId), prediction);
    prediction.points = result.points;
    prediction.exact = result.exact;
    prediction.winner = result.winner;
  });
}

function standings() {
  recalculate();
  return db.users.map((user) => {
    const predictions = db.predictions.filter((prediction) => prediction.userId === user.id);
    const bonus = db.bonusPredictions.filter((item) => item.userId === user.id).reduce((sum, item) => sum + bonusPoints(item), 0);
    return {
      id: user.id,
      username: user.username,
      points: predictions.reduce((sum, item) => sum + (item.points || 0), 0) + bonus,
      exact: predictions.reduce((sum, item) => sum + (item.exact || 0), 0),
      winners: predictions.reduce((sum, item) => sum + (item.winner || 0), 0),
      bonus,
    };
  }).sort((a, b) => b.points - a.points || b.exact - a.exact || a.username.localeCompare(b.username));
}

function serializeMatch(match) {
  return { ...match, locked: isLocked(match) };
}

async function sportmonksFetch(endpoint) {
  const url = new URL(`https://api.sportmonks.com/v3/football/${endpoint}`);
  url.searchParams.set("api_token", SPORTMONKS_TOKEN);
  url.searchParams.set("include", "participants;scores;state;venue");
  url.searchParams.set("filters", `fixtureLeagues:${WORLD_CUP_LEAGUE_ID}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sportmonks ${response.status}: ${await response.text()}`);
  return response.json();
}

function participantName(fixture, location) {
  const participant = fixture.participants?.find((item) => item.meta?.location === location);
  return participant?.name || "";
}

function scoreValue(fixture, location) {
  const score = fixture.scores?.find((item) => item.description === "CURRENT" && item.score?.participant === location);
  return Number.isFinite(score?.score?.goals) ? score.score.goals : null;
}

function upsertFixture(fixture) {
  const externalId = String(fixture.id);
  const existing = db.matches.find((match) => match.externalId === externalId);
  const stateName = String(fixture.state?.name || fixture.state?.short_name || "").toLowerCase();
  const homeScore = scoreValue(fixture, "home");
  const awayScore = scoreValue(fixture, "away");
  const finished = ["finished", "ended", "ft", "after extra time", "after penalties"].some((name) => stateName.includes(name));
  const payload = {
    externalId,
    group: fixture.round?.name || fixture.stage?.name || "World Cup 2026",
    home: participantName(fixture, "home") || fixture.name?.split(" vs ")[0] || "Home",
    away: participantName(fixture, "away") || fixture.name?.split(" vs ")[1] || "Away",
    kickoffUtc: fixture.starting_at ? new Date(`${fixture.starting_at.replace(" ", "T")}Z`).toISOString() : nowIso(),
    venue: fixture.venue?.name || "",
    status: finished ? "finished" : stateName.includes("live") || stateName.includes("1st") || stateName.includes("2nd") ? "live" : "scheduled",
    homeScore,
    awayScore,
    updatedAt: nowIso(),
  };
  if (existing) Object.assign(existing, payload);
  else db.matches.push({ id: id(), ...payload });
}

async function syncSportmonks(mode = "latest") {
  if (!SPORTMONKS_TOKEN) {
    db.sync = { lastRunAt: nowIso(), lastError: "SPORTMONKS_TOKEN nėra nustatytas", provider: "sportmonks", enabled: false };
    await saveDb();
    return db.sync;
  }
  try {
    const endpoint = mode === "all" ? "livescores" : "livescores/latest";
    const payload = await sportmonksFetch(endpoint);
    (payload.data || []).forEach(upsertFixture);
    recalculate();
    db.sync = { lastRunAt: nowIso(), lastError: null, provider: "sportmonks", enabled: true };
    await saveDb();
  } catch (error) {
    db.sync = { lastRunAt: nowIso(), lastError: error.message, provider: "sportmonks", enabled: true };
    await saveDb();
  }
  return db.sync;
}

async function routeApi(req, res, pathname) {
  if (pathname === "/api/auth/register" && req.method === "POST") {
    const body = await readJson(req);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (username.length < 3 || password.length < 4) return sendJson(res, 400, { error: "Username arba password per trumpas." });
    if (db.users.some((user) => user.username.toLowerCase() === username)) return sendJson(res, 409, { error: "Toks username jau yra." });
    const user = { id: id(), username, passwordHash: hashPassword(password), isAdmin: false, createdAt: nowIso() };
    const token = id();
    db.users.push(user);
    db.sessions[token] = user.id;
    await saveDb();
    return sendJson(res, 201, { token, user: publicUser(user) });
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readJson(req);
    const user = db.users.find((item) => item.username.toLowerCase() === String(body.username || "").trim().toLowerCase());
    if (!user || !verifyPassword(String(body.password || ""), user.passwordHash)) return sendJson(res, 401, { error: "Neteisingi prisijungimo duomenys." });
    const token = id();
    db.sessions[token] = user.id;
    await saveDb();
    return sendJson(res, 200, { token, user: publicUser(user) });
  }

  if (pathname === "/api/session" && req.method === "GET") {
    const user = requireUser(req);
    return sendJson(res, 200, { user: user ? publicUser(user) : null });
  }

  const user = requireUser(req);
  if (!user) return sendJson(res, 401, { error: "Reikia prisijungti." });

  if (pathname === "/api/state" && req.method === "GET") {
    recalculate();
    await saveDb();
    return sendJson(res, 200, {
      user: publicUser(user),
      matches: db.matches.map(serializeMatch).sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc)),
      predictions: db.predictions.filter((item) => user.isAdmin || item.userId === user.id),
      bonusPredictions: db.bonusPredictions.filter((item) => user.isAdmin || item.userId === user.id),
      standings: standings(),
      sync: db.sync,
    });
  }

  if (pathname === "/api/predictions" && req.method === "POST") {
    const body = await readJson(req);
    const match = db.matches.find((item) => item.id === body.matchId);
    if (!match) return sendJson(res, 404, { error: "Rungtynės nerastos." });
    if (isLocked(match)) return sendJson(res, 423, { error: "Spėjimas užrakintas 5 minutės prieš rungtynes." });
    const homeScore = Number(body.homeScore);
    const awayScore = Number(body.awayScore);
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) return sendJson(res, 400, { error: "Įveskite teisingą rezultatą." });
    const existing = db.predictions.find((item) => item.userId === user.id && item.matchId === match.id);
    const payload = { userId: user.id, matchId: match.id, homeScore, awayScore, updatedAt: nowIso() };
    if (existing) Object.assign(existing, payload);
    else db.predictions.push({ id: id(), createdAt: nowIso(), points: 0, exact: 0, winner: 0, ...payload });
    recalculate();
    await saveDb();
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/bonus" && req.method === "POST") {
    const body = await readJson(req);
    ["groupWinner", "semifinalist", "finalist", "champion"].forEach((type) => {
      const team = String(body[type] || "").trim();
      const existing = db.bonusPredictions.find((item) => item.userId === user.id && item.type === type);
      if (!team && existing) db.bonusPredictions = db.bonusPredictions.filter((item) => item !== existing);
      else if (team && existing) existing.team = team;
      else if (team) db.bonusPredictions.push({ id: id(), userId: user.id, type, team, awarded: false });
    });
    await saveDb();
    return sendJson(res, 200, { ok: true });
  }

  const admin = requireAdmin(req);
  if (!admin) return sendJson(res, 403, { error: "Reikia admin teisių." });

  if (pathname === "/api/admin/matches" && req.method === "POST") {
    const body = await readJson(req);
    const payload = {
      group: String(body.group || "").trim(),
      home: String(body.home || "").trim(),
      away: String(body.away || "").trim(),
      kickoffUtc: new Date(body.kickoffUtc).toISOString(),
      venue: String(body.venue || "").trim(),
      updatedAt: nowIso(),
    };
    if (!payload.group || !payload.home || !payload.away || payload.kickoffUtc === "Invalid Date") return sendJson(res, 400, { error: "Užpildykite rungtynių duomenis." });
    if (body.id) Object.assign(db.matches.find((item) => item.id === body.id), payload);
    else db.matches.push({ id: id(), externalId: "", status: "scheduled", homeScore: null, awayScore: null, ...payload });
    await saveDb();
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/result" && req.method === "POST") {
    const body = await readJson(req);
    const match = db.matches.find((item) => item.id === body.matchId);
    if (!match) return sendJson(res, 404, { error: "Rungtynės nerastos." });
    match.homeScore = Number(body.homeScore);
    match.awayScore = Number(body.awayScore);
    match.status = "finished";
    match.updatedAt = nowIso();
    recalculate();
    await saveDb();
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/bonus-award" && req.method === "POST") {
    const body = await readJson(req);
    const bonus = db.bonusPredictions.find((item) => item.id === body.id);
    if (!bonus) return sendJson(res, 404, { error: "Bonusas nerastas." });
    bonus.awarded = Boolean(body.awarded);
    await saveDb();
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/sync" && req.method === "POST") return sendJson(res, 200, await syncSportmonks("all"));
  if (pathname === "/api/admin/recalculate" && req.method === "POST") {
    recalculate();
    await saveDb();
    return sendJson(res, 200, { ok: true });
  }
  if (pathname === "/api/admin/csv" && req.method === "GET") {
    const lines = [["vieta", "vartotojas", "taskai", "tikslus_rezultatai", "teisingi_nugaletojai"]];
    standings().forEach((item, index) => lines.push([index + 1, item.username, item.points, item.exact, item.winners]));
    const csv = lines.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=world-cup-leaderboard.csv" });
    return res.end(csv);
  }

  sendJson(res, 404, { error: "API kelias nerastas." });
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const file = path.join(__dirname, requested);
  if (!file.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const data = await fsp.readFile(file);
    res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

async function start() {
  await ensureDb();
  setInterval(() => syncSportmonks("latest"), 60 * 1000).unref();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname.startsWith("/api/")) return routeApi(req, res, url.pathname);
      return serveStatic(req, res, url.pathname);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  });
  server.listen(PORT, HOST, () => {
    console.log(`World Cup Prediction League: http://${HOST}:${PORT}`);
    console.log(`Admin: admin67 / admin123`);
    if (!SPORTMONKS_TOKEN) console.log("SPORTMONKS_TOKEN nenustatytas, todėl live importas veiks tik įrašius raktą.");
  });
}

start();
