const crypto = require("crypto");

const LOCK_MINUTES = 5;
const SPORTMONKS_WORLD_CUP_LEAGUE_ID = process.env.SPORTMONKS_WORLD_CUP_LEAGUE_ID || "732";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
  body: JSON.stringify(body),
});

const text = (statusCode, body, type = "text/plain; charset=utf-8", extraHeaders = {}) => ({
  statusCode,
  headers: { "content-type": type, "cache-control": "no-store", ...extraHeaders },
  body,
});

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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} nenustatytas Netlify Environment variables.`);
  return value;
}

async function supabase(path, options = {}) {
  const projectUrl = requireEnv("SUPABASE_URL")
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/$/, "");
  const url = `${projectUrl}/rest/v1/${path}`;
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  const payload = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${payload}`);
  return payload ? JSON.parse(payload) : null;
}

const one = async (path) => {
  const rows = await supabase(path);
  return rows?.[0] || null;
};

const publicUser = (user) => ({ id: user.id, username: user.username, isAdmin: user.is_admin });

async function currentUser(event) {
  const token = String(event.headers.authorization || event.headers.Authorization || "").replace("Bearer ", "");
  if (!token) return null;
  const session = await one(`sessions?token=eq.${encodeURIComponent(token)}&select=user_id`);
  if (!session) return null;
  return one(`users?id=eq.${encodeURIComponent(session.user_id)}&select=id,username,is_admin`);
}

function isLocked(match) {
  return new Date(match.kickoff_utc).getTime() - Date.now() <= LOCK_MINUTES * 60 * 1000;
}

function scorePrediction(match, prediction) {
  if (!match || match.status !== "finished" || match.home_score === null || match.away_score === null || !prediction) {
    return { points: 0, exact: 0, winner: 0 };
  }
  const actualHome = Number(match.home_score);
  const actualAway = Number(match.away_score);
  const actualDiff = actualHome - actualAway;
  const actualSign = Math.sign(actualDiff);
  const type = prediction.prediction_type || "exact";
  if (type === "outcome") {
    const outcomeSign = prediction.outcome === "home" ? 1 : prediction.outcome === "away" ? -1 : 0;
    return actualSign === outcomeSign ? { points: 2, exact: 0, winner: 1 } : { points: 0, exact: 0, winner: 0 };
  }
  const pickHome = Number(prediction.home_score);
  const pickAway = Number(prediction.away_score);
  if (actualHome === pickHome && actualAway === pickAway) return { points: 7, exact: 1, winner: 1 };
  return { points: 0, exact: 0, winner: 0 };
}

function bonusPoints(bonus) {
  const values = { semifinalist: 10, finalist: 20, champion: 40 };
  return bonus.awarded ? values[bonus.type] || 0 : 0;
}

async function recalculate() {
  const [matches, predictions] = await Promise.all([
    supabase("matches?select=*"),
    supabase("predictions?select=*"),
  ]);
  await Promise.all(predictions.map((prediction) => {
    const result = scorePrediction(matches.find((match) => match.id === prediction.match_id), prediction);
    return supabase(`predictions?id=eq.${prediction.id}`, {
      method: "PATCH",
      body: JSON.stringify({ points: result.points, exact: result.exact, winner: result.winner }),
    });
  }));
}

async function getState(user) {
  const [matches, predictions, bonuses, users, syncRows] = await Promise.all([
    supabase("matches?select=*&order=kickoff_utc.asc"),
    supabase(user.is_admin ? "predictions?select=*" : `predictions?user_id=eq.${user.id}&select=*`),
    supabase(user.is_admin ? "bonus_predictions?select=*" : `bonus_predictions?user_id=eq.${user.id}&select=*`),
    supabase("users?select=id,username,is_admin"),
    supabase("sync_log?select=*&order=created_at.desc&limit=1"),
  ]);
  const allPredictions = await supabase("predictions?select=*");
  const allBonuses = await supabase("bonus_predictions?select=*");
  const standings = users.map((item) => {
    const userPredictions = allPredictions.filter((prediction) => prediction.user_id === item.id);
    const userBonuses = allBonuses.filter((bonus) => bonus.user_id === item.id);
    return {
      id: item.id,
      username: item.username,
      points: userPredictions.reduce((sum, prediction) => sum + (prediction.points || 0), 0) + userBonuses.reduce((sum, bonus) => sum + bonusPoints(bonus), 0),
      exact: userPredictions.reduce((sum, prediction) => sum + (prediction.exact || 0), 0),
      winners: userPredictions.reduce((sum, prediction) => sum + (prediction.winner || 0), 0),
      bonus: userBonuses.reduce((sum, bonus) => sum + bonusPoints(bonus), 0),
    };
  }).sort((a, b) => b.points - a.points || b.exact - a.exact || a.username.localeCompare(b.username));

  return {
    user: publicUser(user),
    matches: matches.map((match) => ({
      id: match.id,
      externalId: match.external_id,
      group: match.stage,
      home: match.home_team,
      away: match.away_team,
      kickoffUtc: match.kickoff_utc,
      venue: match.venue,
      status: match.status,
      homeScore: match.home_score,
      awayScore: match.away_score,
      locked: isLocked(match),
    })),
    predictions: predictions.map((prediction) => ({
      id: prediction.id,
      userId: prediction.user_id,
      matchId: prediction.match_id,
      predictionType: prediction.prediction_type || "exact",
      outcome: prediction.outcome || null,
      homeScore: prediction.home_score,
      awayScore: prediction.away_score,
      points: prediction.points,
      exact: prediction.exact,
      winner: prediction.winner,
      createdAt: prediction.created_at,
      updatedAt: prediction.updated_at,
    })),
    bonusPredictions: bonuses.map((bonus) => ({
      id: bonus.id,
      userId: bonus.user_id,
      type: bonus.type,
      team: bonus.team,
      awarded: bonus.awarded,
    })),
    standings,
    sync: syncRows?.[0] || null,
  };
}

async function sportmonksFetch(endpoint, params = {}) {
  const token = requireEnv("SPORTMONKS_TOKEN");
  const url = new URL(`https://api.sportmonks.com/v3/football/${endpoint}`);
  url.searchParams.set("api_token", token);
  url.searchParams.set("include", "participants;scores;state;venue");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, value);
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sportmonks ${response.status}: ${await response.text()}`);
  return response.json();
}

const participantName = (fixture, location) => fixture.participants?.find((item) => item.meta?.location === location)?.name || "";
const scoreValue = (fixture, location) => {
  const score = fixture.scores?.find((item) => item.description === "CURRENT" && item.score?.participant === location);
  return Number.isFinite(score?.score?.goals) ? score.score.goals : null;
};

async function upsertFixture(fixture) {
  const externalId = String(fixture.id);
  const stateName = String(fixture.state?.name || fixture.state?.short_name || "").toLowerCase();
  const finished = ["finished", "ended", "ft", "after extra time", "after penalties"].some((name) => stateName.includes(name));
  const payload = {
    external_id: externalId,
    stage: fixture.round?.name || fixture.stage?.name || "World Cup 2026",
    home_team: participantName(fixture, "home") || fixture.name?.split(" vs ")[0] || "Home",
    away_team: participantName(fixture, "away") || fixture.name?.split(" vs ")[1] || "Away",
    kickoff_utc: fixture.starting_at ? new Date(`${fixture.starting_at.replace(" ", "T")}Z`).toISOString() : nowIso(),
    venue: fixture.venue?.name || "",
    status: finished ? "finished" : stateName.includes("live") || stateName.includes("1st") || stateName.includes("2nd") ? "live" : "scheduled",
    home_score: scoreValue(fixture, "home"),
    away_score: scoreValue(fixture, "away"),
    updated_at: nowIso(),
  };
  await supabase("matches?on_conflict=external_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

async function importCsv(csv) {
  const rows = parseCsv(csv);
  if (!rows.length) return { ok: false, message: "CSV faile nėra rungtynių." };
  const matches = rows.map((row) => {
    const kickoff = new Date(row.kickoff_utc);
    return {
      external_id: row.external_id || null,
      stage: row.stage || "World Cup 2026",
      home_team: row.home_team,
      away_team: row.away_team,
      kickoff_utc: Number.isNaN(kickoff.getTime()) ? "" : kickoff.toISOString(),
      venue: row.venue || "",
      status: "scheduled",
      home_score: null,
      away_score: null,
      updated_at: nowIso(),
    };
  });
  if (matches.some((match) => !match.home_team || !match.away_team || !match.kickoff_utc)) {
    return { ok: false, message: "CSV turi turėti external_id, stage, home_team, away_team, kickoff_utc, venue stulpelius." };
  }
  await supabase("matches?stage=eq.Demo&external_id=is.null", { method: "DELETE" });
  await supabase("matches?on_conflict=external_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(matches),
  });
  await recalculate();
  await supabase("sync_log", {
    method: "POST",
    body: JSON.stringify({ provider: "csv", ok: true, message: `Importuota ${matches.length} rungtynių iš CSV`, created_at: nowIso() }),
  });
  return { ok: true, message: `Importuota ${matches.length} rungtynių iš CSV`, created_at: nowIso() };
}

async function syncSportmonks(mode = "all") {
  try {
    const attempts = mode === "latest"
      ? [
        ["livescores/latest", { filters: `fixtureLeagues:${SPORTMONKS_WORLD_CUP_LEAGUE_ID}` }],
        ["livescores", { filters: `fixtureLeagues:${SPORTMONKS_WORLD_CUP_LEAGUE_ID}` }],
      ]
      : [
        ["fixtures/between/date/2026-06-01/2026-07-31", { filters: `fixtureLeagues:${SPORTMONKS_WORLD_CUP_LEAGUE_ID}` }],
        ["fixtures/between/date/2026-06-01/2026-07-31", { filters: `leagues:${SPORTMONKS_WORLD_CUP_LEAGUE_ID}` }],
        ["fixtures/between/date/2026-06-01/2026-07-31", {}],
        ["livescores", { filters: `fixtureLeagues:${SPORTMONKS_WORLD_CUP_LEAGUE_ID}` }],
      ];
    let payload = { data: [] };
    let usedEndpoint = "";
    const errors = [];
    for (const [endpoint, params] of attempts) {
      try {
        const candidate = await sportmonksFetch(endpoint, params);
        if (candidate.data?.length) {
          payload = candidate;
          usedEndpoint = `${endpoint}${params.filters ? `?filters=${params.filters}` : ""}`;
          break;
        }
        errors.push(`${endpoint}: 0 rungtynių`);
      } catch (error) {
        errors.push(`${endpoint}: ${error.message}`);
      }
    }
    await Promise.all((payload.data || []).map(upsertFixture));
    if (payload.data?.length) {
      await supabase("matches?stage=eq.Demo&external_id=is.null", { method: "DELETE" });
    }
    await recalculate();
    await supabase("sync_log", {
      method: "POST",
      body: JSON.stringify({
        provider: "sportmonks",
        ok: Boolean(payload.data?.length),
        message: payload.data?.length
          ? `Atnaujinta ${payload.data.length} rungtynių per ${usedEndpoint}`
          : `Sportmonks grąžino 0 rungtynių. Bandymai: ${errors.join(" | ")}`,
        created_at: nowIso(),
      }),
    });
    return {
      ok: Boolean(payload.data?.length),
      message: payload.data?.length
        ? `Atnaujinta ${payload.data.length} rungtynių per ${usedEndpoint}`
        : `Sportmonks grąžino 0 rungtynių. Bandymai: ${errors.join(" | ")}`,
      created_at: nowIso(),
    };
  } catch (error) {
    await supabase("sync_log", {
      method: "POST",
      body: JSON.stringify({ provider: "sportmonks", ok: false, message: error.message, created_at: nowIso() }),
    });
    return { ok: false, message: error.message, created_at: nowIso() };
  }
}

function normalizePath(event) {
  return `/${(event.path || "").replace(/^\/api\/?/, "").replace(/^\/\.netlify\/functions\/api\/?/, "")}`;
}

exports.handler = async (event) => {
  try {
    const pathname = normalizePath(event);
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    if (pathname === "/auth/register" && method === "POST") {
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (username.length < 3 || password.length < 4) return json(400, { error: "Username arba password per trumpas." });
      const existing = await one(`users?username=eq.${encodeURIComponent(username)}&select=id`);
      if (existing) return json(409, { error: "Toks username jau yra." });
      const [user] = await supabase("users", {
        method: "POST",
        body: JSON.stringify({ username, password_hash: hashPassword(password), is_admin: false }),
      });
      const token = id();
      await supabase("sessions", { method: "POST", body: JSON.stringify({ token, user_id: user.id }) });
      return json(201, { token, user: publicUser(user) });
    }

    if (pathname === "/auth/login" && method === "POST") {
      const user = await one(`users?username=eq.${encodeURIComponent(String(body.username || "").trim().toLowerCase())}&select=*`);
      if (!user || !verifyPassword(String(body.password || ""), user.password_hash)) return json(401, { error: "Neteisingi prisijungimo duomenys." });
      const token = id();
      await supabase("sessions", { method: "POST", body: JSON.stringify({ token, user_id: user.id }) });
      return json(200, { token, user: publicUser(user) });
    }

    const user = await currentUser(event);
    if (!user) return json(401, { error: "Reikia prisijungti." });

    if (pathname === "/state" && method === "GET") return json(200, await getState(user));

    if (pathname === "/predictions" && method === "POST") {
      const match = await one(`matches?id=eq.${encodeURIComponent(body.matchId)}&select=*`);
      if (!match) return json(404, { error: "Rungtynės nerastos." });
      if (isLocked(match)) return json(423, { error: "Spėjimas užrakintas 5 minutės prieš rungtynes." });
      const existing = await one(`predictions?user_id=eq.${user.id}&match_id=eq.${match.id}&select=id`);
      if (existing) return json(423, { error: "Šis spėjimas jau užrakintas. Keisti gali tik adminas." });
      const predictionType = body.predictionType === "outcome" ? "outcome" : "exact";
      const payload = { user_id: user.id, match_id: match.id, prediction_type: predictionType, updated_at: nowIso() };
      if (predictionType === "outcome") {
        if (!["home", "draw", "away"].includes(body.outcome)) return json(400, { error: "Pasirinkite baigtį." });
        payload.outcome = body.outcome;
        payload.home_score = null;
        payload.away_score = null;
      } else {
        const homeScore = Number(body.homeScore);
        const awayScore = Number(body.awayScore);
        if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 12 || awayScore > 12) {
          return json(400, { error: "Tikslus rezultatas turi būti nuo 0 iki 12." });
        }
        payload.outcome = null;
        payload.home_score = homeScore;
        payload.away_score = awayScore;
      }
      await supabase("predictions", { method: "POST", body: JSON.stringify(payload) });
      await recalculate();
      return json(200, { ok: true });
    }

    if (pathname === "/bonus" && method === "POST") {
      await Promise.all(["semifinalist", "finalist", "champion"].map(async (type) => {
        const team = String(body[type] || "").trim();
        const existing = await one(`bonus_predictions?user_id=eq.${user.id}&type=eq.${type}&select=id`);
        if (existing) return null;
        if (!team) return null;
        return supabase("bonus_predictions?on_conflict=user_id,type", {
          method: "POST",
          headers: { prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ user_id: user.id, type, team }),
        });
      }));
      return json(200, { ok: true });
    }

    if (!user.is_admin) return json(403, { error: "Reikia admin teisių." });

    if (pathname === "/admin/prediction" && method === "POST") {
      const prediction = await one(`predictions?id=eq.${encodeURIComponent(body.id)}&select=*`);
      if (!prediction) return json(404, { error: "Spėjimas nerastas." });
      if (body.delete) {
        await supabase(`predictions?id=eq.${prediction.id}`, { method: "DELETE" });
        await recalculate();
        return json(200, { ok: true });
      }
      const predictionType = body.predictionType === "outcome" ? "outcome" : "exact";
      const payload = { prediction_type: predictionType, updated_at: nowIso() };
      if (predictionType === "outcome") {
        if (!["home", "draw", "away"].includes(body.outcome)) return json(400, { error: "Pasirinkite baigtį." });
        payload.outcome = body.outcome;
        payload.home_score = null;
        payload.away_score = null;
      } else {
        const homeScore = Number(body.homeScore);
        const awayScore = Number(body.awayScore);
        if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 12 || awayScore > 12) {
          return json(400, { error: "Tikslus rezultatas turi būti nuo 0 iki 12." });
        }
        payload.outcome = null;
        payload.home_score = homeScore;
        payload.away_score = awayScore;
      }
      await supabase(`predictions?id=eq.${prediction.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      await recalculate();
      return json(200, { ok: true });
    }

    if (pathname === "/admin/matches" && method === "POST") {
      const payload = {
        stage: String(body.group || "").trim(),
        home_team: String(body.home || "").trim(),
        away_team: String(body.away || "").trim(),
        kickoff_utc: new Date(body.kickoffUtc).toISOString(),
        venue: String(body.venue || "").trim(),
        updated_at: nowIso(),
      };
      if (body.id) await supabase(`matches?id=eq.${body.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await supabase("matches", { method: "POST", body: JSON.stringify({ ...payload, status: "scheduled" }) });
      return json(200, { ok: true });
    }

    if (pathname === "/admin/result" && method === "POST") {
      await supabase(`matches?id=eq.${body.matchId}`, {
        method: "PATCH",
        body: JSON.stringify({ home_score: Number(body.homeScore), away_score: Number(body.awayScore), status: "finished", updated_at: nowIso() }),
      });
      await recalculate();
      return json(200, { ok: true });
    }

    if (pathname === "/admin/bonus-award" && method === "POST") {
      await supabase(`bonus_predictions?id=eq.${body.id}`, { method: "PATCH", body: JSON.stringify({ awarded: Boolean(body.awarded) }) });
      return json(200, { ok: true });
    }

    if (pathname === "/admin/sync" && method === "POST") return json(200, await syncSportmonks("all"));

    if (pathname === "/admin/import-csv" && method === "POST") return json(200, await importCsv(String(body.csv || "")));

    if (pathname === "/admin/recalculate" && method === "POST") {
      await recalculate();
      return json(200, { ok: true });
    }

    if (pathname === "/admin/csv" && method === "GET") {
      const state = await getState(user);
      const lines = [["vieta", "vartotojas", "taskai", "tikslus_rezultatai", "teisingos_baigtys"]];
      state.standings.forEach((item, index) => lines.push([index + 1, item.username, item.points, item.exact, item.winners]));
      const csv = lines.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
      return text(200, csv, "text/csv; charset=utf-8", { "content-disposition": "attachment; filename=world-cup-leaderboard.csv" });
    }

    return json(404, { error: "API kelias nerastas." });
  } catch (error) {
    return json(500, { error: error.message });
  }
};

exports._syncSportmonks = syncSportmonks;
