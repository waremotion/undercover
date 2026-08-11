"use strict";

const LEGACY_WORD_HISTORY_KEY = "undercover_used_pairs_v3";
const WORD_HISTORY_KEYS = {
  fr: "sketchy_used_pairs_fr_v1",
  en: "sketchy_used_pairs_en_v1"
};
const SESSION_KEY = "sketchy_active_session_v2";
const LEGACY_SESSION_KEYS = ["undercover_active_session_v1", "sketchy_active_session_v1"];
const SESSION_VERSION = 2;
const OLD_NAME_KEYS = ["undercover_seating_order_v1", "undercover_names"];
const WORD_BANKS = { fr: WORD_PAIRS, en: WORD_PAIRS_EN };

const $ = id => document.getElementById(id);
const screens = [
  "homeScreen", "setupScreen", "nameEntryScreen", "orderReviewScreen",
  "passScreen", "secretScreen", "playScreen", "recallSelectScreen",
  "recallPassScreen", "recallSecretScreen", "eliminationScreen",
  "endScreen", "groupManageScreen"
];

let settings = { players: 13, under: 2, white: 1, category: "all" };
let game = null;
let selectedPlayerId = null;
let recallPlayerId = null;
let pendingNames = [];
let nameEntryIndex = 0;
let groupDraft = [];
let currentScreenId = "homeScreen";
let restoringSession = false;

const memoryStorage = new Map();
const safeStorage = {
  getItem(key) {
    try { return localStorage.getItem(key); }
    catch (error) { return memoryStorage.has(key) ? memoryStorage.get(key) : null; }
  },
  setItem(key, value) {
    const stored = String(value);
    memoryStorage.set(key, stored);
    try { localStorage.setItem(key, stored); } catch (error) {}
  },
  removeItem(key) {
    memoryStorage.delete(key);
    try { localStorage.removeItem(key); } catch (error) {}
  }
};

function readJson(key, fallback) {
  try {
    const raw = safeStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function t(key, vars = {}) {
  return SketchyI18n.t(key, vars);
}

function currentLanguage() {
  return SketchyI18n.getLanguage();
}

function wordBank(language = currentLanguage()) {
  return WORD_BANKS[language] || WORD_BANKS.fr;
}

function wordHistoryKey(language = currentLanguage()) {
  return WORD_HISTORY_KEYS[language] || WORD_HISTORY_KEYS.fr;
}

function migrateLegacyStorage() {
  const currentFrench = safeStorage.getItem(WORD_HISTORY_KEYS.fr);
  const legacyFrench = safeStorage.getItem(LEGACY_WORD_HISTORY_KEY);
  if (currentFrench === null && legacyFrench !== null) {
    safeStorage.setItem(WORD_HISTORY_KEYS.fr, legacyFrench);
  }
  safeStorage.removeItem(LEGACY_WORD_HISTORY_KEY);
  OLD_NAME_KEYS.forEach(key => safeStorage.removeItem(key));

  if (safeStorage.getItem(SESSION_KEY) === null) {
    for (const legacyKey of LEGACY_SESSION_KEYS) {
      const legacy = readJson(legacyKey, null);
      if (legacy && legacy.game) {
        const migrated = {
          ...legacy,
          version: SESSION_VERSION,
          game: {
            ...legacy.game,
            language: legacy.game.language || "fr",
            currentStarterId: legacy.game.currentStarterId ?? legacy.game.lastStarterId ?? null,
            whiteGuessResolved: Boolean(legacy.game.whiteGuessResolved)
          }
        };
        safeStorage.setItem(SESSION_KEY, JSON.stringify(migrated));
        break;
      }
    }
  }
  LEGACY_SESSION_KEYS.forEach(key => safeStorage.removeItem(key));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normalize(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function pairKey(pair) {
  return [normalize(pair[0]), normalize(pair[1])].sort().join("|||");
}

function getUsed(language = currentLanguage()) {
  return new Set(readJson(wordHistoryKey(language), []));
}

function saveUsed(used, language = currentLanguage()) {
  safeStorage.setItem(wordHistoryKey(language), JSON.stringify([...used]));
}

function currentPool(language = currentLanguage()) {
  return wordBank(language).filter(pair => settings.category === "all" || pair[2] === settings.category);
}

function updatePairCount() {
  $("pairCountPill").textContent = t("top.pairs", { count: wordBank().length });
}

function updatePoolStatus() {
  const language = currentLanguage();
  const pool = currentPool(language);
  const used = getUsed(language);
  const remaining = pool.filter(pair => !used.has(pairKey(pair))).length;
  const plural = currentLanguage() === "fr" && remaining > 1 ? "s" : currentLanguage() === "en" && remaining !== 1 ? "s" : "";
  $("poolStatus").textContent = t("setup.pool", {
    remaining,
    plural,
    category: t(`category.phrase.${settings.category}`)
  });
}

function updateSettingsUI() {
  $("playersValue").textContent = settings.players;
  $("underValue").textContent = settings.under;
  $("whiteValue").textContent = settings.white;
  $("categorySelect").value = settings.category;

  const civilians = settings.players - settings.under - settings.white;
  const cPlural = currentLanguage() === "fr" ? (civilians > 1 ? "s" : "") : (civilians !== 1 ? "s" : "");
  $("balanceNotice").textContent = civilians < 3
    ? t("setup.minCivilians")
    : t("setup.composition", {
        civilians,
        cPlural,
        under: settings.under,
        white: settings.white
      });

  updatePairCount();
  updatePoolStatus();
}

function pickPair(language) {
  const pool = currentPool(language);
  const used = getUsed(language);
  let available = pool.filter(pair => !used.has(pairKey(pair)));

  if (!available.length) {
    pool.forEach(pair => used.delete(pairKey(pair)));
    available = [...pool];
  }

  if (!available.length) throw new Error("No word pair available");

  const chosen = available[Math.floor(Math.random() * available.length)];
  used.add(pairKey(chosen));
  saveUsed(used, language);

  const reverse = Math.random() < 0.5;
  return {
    civil: reverse ? chosen[1] : chosen[0],
    undercover: reverse ? chosen[0] : chosen[1],
    category: chosen[2]
  };
}

function isValidSession(session) {
  if (!session || session.version !== SESSION_VERSION || !session.game) return false;
  const storedGame = session.game;
  if (!storedGame.pair || !Array.isArray(storedGame.players) || storedGame.players.length < 4) return false;
  if (!storedGame.players.every(player =>
    Number.isInteger(player.id) &&
    typeof player.name === "string" && player.name.trim() &&
    ["civil", "under", "white"].includes(player.role) &&
    typeof player.alive === "boolean"
  )) return false;
  return Array.isArray(storedGame.revealOrder) && Number.isInteger(storedGame.revealIndex);
}

function getStoredSession() {
  const session = readJson(SESSION_KEY, null);
  if (!isValidSession(session)) {
    if (session !== null) safeStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

function saveSession() {
  if (!game || restoringSession) return;
  safeStorage.setItem(SESSION_KEY, JSON.stringify({
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    settings: { ...settings },
    game,
    currentScreenId,
    selectedPlayerId,
    recallPlayerId,
    groupDraft
  }));
}

function clearActiveSession() {
  safeStorage.removeItem(SESSION_KEY);
  updateResumeCard();
}

function formatSavedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(currentLanguage() === "en" ? "en-GB" : "fr-FR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    }).format(date);
  } catch (error) {
    return "";
  }
}

function updateResumeCard() {
  const card = $("resumeSessionCard");
  const session = getStoredSession();
  card.classList.toggle("hidden", !session);
  if (!session) return;

  const storedGame = session.game;
  const alive = storedGame.players.filter(player => player.alive).length;
  const when = formatSavedTime(session.savedAt);
  const state = storedGame.winner
    ? t("resume.state.finished")
    : storedGame.revealIndex < storedGame.revealOrder.length
      ? t("resume.state.distribution")
      : t("resume.state.vote", { vote: storedGame.voteNumber || 1 });
  const date = when ? t("resume.date", { date: when }) : "";
  $("resumeSessionMeta").textContent = t("resume.meta", {
    players: storedGame.players.length,
    alive,
    state,
    date
  });
}

function showScreen(id) {
  currentScreenId = id;
  screens.forEach(screenId => {
    const element = $(screenId);
    if (element) element.classList.toggle("hidden", screenId !== id);
  });
  saveSession();
  requestAnimationFrame(() => {
    try { scrollTo({ top: 0, left: 0, behavior: "smooth" }); }
    catch (error) { scrollTo(0, 0); }
  });
}

function showStartError(message) {
  $("startError").textContent = message;
  $("startError").classList.remove("hidden");
}

function clearStartError() {
  $("startError").classList.add("hidden");
  $("startError").textContent = "";
}

function showNameEntryError(message) {
  $("nameEntryError").textContent = message;
  $("nameEntryError").classList.remove("hidden");
}

function clearNameEntryError() {
  $("nameEntryError").classList.add("hidden");
  $("nameEntryError").textContent = "";
}
