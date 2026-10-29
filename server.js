// Výprava na Pecku – malý server s hráči, body a pořadím.
// Data se ukládají do JSON souboru v DATA_DIR (na Railway připojte Volume a nastavte DATA_DIR=/data).
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const ADMIN_PIN = (process.env.ADMIN_PIN || "").trim();
const MAPY_API_KEY = (process.env.MAPY_API_KEY || "").trim();
const FILE = path.join(DATA_DIR, "players.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { players: {} };
try { db = JSON.parse(fs.readFileSync(FILE, "utf8")); if (!db.players) db.players = {}; } catch (e) { /* nový soubor */ }

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { const tmp = FILE + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, FILE); }
    catch (e) { console.error("Uložení selhalo:", e.message); }
  }, 150);
}

const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const pub = p => ({ id: p.id, name: p.name, av: p.av, ans: p.ans || {}, done: p.done || {}, unlocked: p.unlocked || {}, total: p.total || 0, updated: p.updated || 0 });
const fails = {}; // id -> [timestamps] špatných PINů

const app = express();
app.use(express.json({ limit: "200kb" }));
app.get(["/", "/index.html"], (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/api/config", (req, res) => res.json({ mapyKey: MAPY_API_KEY || null, admin: !!ADMIN_PIN }));

app.get("/api/players", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ players: Object.values(db.players).map(pub) });
});

app.post("/api/players", (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 16);
  const pin = String(req.body?.pin || "").trim();
  const av = Math.max(0, Math.min(11, parseInt(req.body?.av, 10) || 0));
  if (name.length < 2) return res.status(400).json({ error: "Napiš jméno, aspoň 2 písmena." });
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: "PIN musí mít přesně 4 číslice." });
  if (Object.values(db.players).some(p => norm(p.name) === norm(name))) return res.status(409).json({ error: "Rytíř s tímhle jménem už existuje. Zkus přezdívku." });
  if (Object.keys(db.players).length >= 60) return res.status(400).json({ error: "Výprava je plná." });
  const id = "p" + crypto.randomBytes(6).toString("hex");
  const token = crypto.randomBytes(18).toString("hex");
  db.players[id] = { id, name, av, pin, tokens: [token], ans: {}, done: {}, unlocked: {}, total: 0, created: Date.now(), updated: Date.now() };
  persist();
  res.json({ player: pub(db.players[id]), token });
});

app.post("/api/login", (req, res) => {
  const p = db.players[req.body?.id];
  if (!p) return res.status(404).json({ error: "Rytíř nenalezen." });
  const now = Date.now();
  fails[p.id] = (fails[p.id] || []).filter(t => now - t < 10 * 60 * 1000);
  if (fails[p.id].length >= 8) return res.status(429).json({ error: "Moc špatných pokusů. Zkus to za pár minut nebo požádej dospělého." });
  if (String(req.body?.pin || "") !== p.pin) { fails[p.id].push(now); return res.status(401).json({ error: "Špatný kód, zkus to znovu." }); }
  const token = crypto.randomBytes(18).toString("hex");
  p.tokens = [...(p.tokens || []), token].slice(-6);
  persist();
  res.json({ player: pub(p), token });
});

app.put("/api/players/:id", (req, res) => {
  const p = db.players[req.params.id];
  if (!p) return res.status(404).json({ error: "Rytíř nenalezen." });
  const token = req.get("x-token");
  if (!token || !(p.tokens || []).includes(token)) return res.status(401).json({ error: "Přihlas se znovu." });
  const { ans, done, unlocked, total } = req.body || {};
  if (ans && typeof ans === "object") p.ans = ans;
  if (done && typeof done === "object") p.done = done;
  if (unlocked && typeof unlocked === "object") p.unlocked = unlocked;
  if (Number.isFinite(total)) p.total = Math.max(0, Math.min(1000, total));
  p.updated = Date.now();
  persist();
  res.json({ player: pub(p) });
});

function admin(req, res, next) {
  if (!ADMIN_PIN) return res.status(403).json({ error: "Správa není zapnutá (chybí ADMIN_PIN)." });
  if (req.get("x-admin-pin") !== ADMIN_PIN) return res.status(401).json({ error: "Špatný kód správce." });
  next();
}
app.get("/api/admin/players", admin, (req, res) => res.json({ players: Object.values(db.players).map(p => ({ ...pub(p), pin: p.pin })) }));
app.delete("/api/admin/players/:id", admin, (req, res) => { delete db.players[req.params.id]; persist(); res.json({ ok: true }); });

app.listen(PORT, () => console.log(`Výprava na Pecku běží na portu ${PORT}, data v ${FILE}`));
