'use strict';

const CATEGORY_LABELS = {
  all: 'le mélange complet',
  food: 'la cuisine',
  objects: 'les objets',
  places: 'les lieux et voyages',
  nature: 'les animaux et la nature',
  culture: 'la culture et les loisirs',
  daily: 'la vie quotidienne'
};

const STORAGE_KEY = 'undercover_used_pairs_v3';
const SESSION_KEY = 'undercover_active_session_v1';
const SESSION_VERSION = 1;
const OLD_NAME_KEYS = ['undercover_seating_order_v1', 'undercover_names'];
const $ = id => document.getElementById(id);
const screens = [
  'homeScreen', 'setupScreen', 'nameEntryScreen', 'orderReviewScreen',
  'passScreen', 'secretScreen', 'playScreen', 'recallSelectScreen',
  'recallPassScreen', 'recallSecretScreen', 'eliminationScreen',
  'endScreen', 'groupManageScreen'
];

let settings = { players: 13, under: 2, white: 1, category: 'all' };
let game = null;
let selectedPlayerId = null;
let recallPlayerId = null;
let pendingNames = [];
let nameEntryIndex = 0;
let groupDraft = [];
let currentScreenId = 'homeScreen';
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
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

function pairKey(pair) {
  return [normalize(pair[0]), normalize(pair[1])].sort().join('|||');
}

function getUsed() {
  return new Set(readJson(STORAGE_KEY, []));
}

function saveUsed(used) {
  safeStorage.setItem(STORAGE_KEY, JSON.stringify([...used]));
}

function currentPool() {
  return WORD_PAIRS.filter(pair => settings.category === 'all' || pair[2] === settings.category);
}

function updatePoolStatus() {
  const pool = currentPool();
  const used = getUsed();
  const remaining = pool.filter(pair => !used.has(pairKey(pair))).length;
  $('poolStatus').textContent = `${remaining} duo${remaining > 1 ? 's' : ''} inédit${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''} dans ${CATEGORY_LABELS[settings.category]}.`;
}

function updateSettingsUI() {
  $('playersValue').textContent = settings.players;
  $('underValue').textContent = settings.under;
  $('whiteValue').textContent = settings.white;
  $('categorySelect').value = settings.category;

  const civilians = settings.players - settings.under - settings.white;
  $('balanceNotice').textContent = civilians < 3
    ? 'Il faut conserver au moins 3 Civils.'
    : `Composition : ${civilians} Civil${civilians > 1 ? 's' : ''}, ${settings.under} Undercover et ${settings.white} Mr White.`;
  updatePoolStatus();
}

function pickPair() {
  const pool = currentPool();
  const used = getUsed();
  let available = pool.filter(pair => !used.has(pairKey(pair)));

  if (!available.length) {
    pool.forEach(pair => used.delete(pairKey(pair)));
    available = [...pool];
  }

  const chosen = available[Math.floor(Math.random() * available.length)];
  used.add(pairKey(chosen));
  saveUsed(used);

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
    typeof player.name === 'string' && player.name.trim() &&
    ['civil', 'under', 'white'].includes(player.role) &&
    typeof player.alive === 'boolean'
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
  const payload = {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    settings: { ...settings },
    game,
    currentScreenId,
    selectedPlayerId,
    recallPlayerId,
    groupDraft
  };
  safeStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

function clearActiveSession() {
  safeStorage.removeItem(SESSION_KEY);
  updateResumeCard();
}

function formatSavedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  } catch (error) {
    return '';
  }
}

function updateResumeCard() {
  const card = $('resumeSessionCard');
  if (!card) return;
  const session = getStoredSession();
  card.classList.toggle('hidden', !session);
  if (!session) return;

  const storedGame = session.game;
  const alive = storedGame.players.filter(player => player.alive).length;
  const when = formatSavedTime(session.savedAt);
  const state = storedGame.winner
    ? 'partie terminée'
    : storedGame.revealIndex < storedGame.revealOrder.length
      ? 'distribution des mots'
      : `vote ${storedGame.voteNumber || 1}`;
  $('resumeSessionMeta').textContent = `${storedGame.players.length} joueurs · ${alive} encore en jeu · ${state}${when ? ` · sauvegardée le ${when}` : ''}.`;
}

function showScreen(id) {
  currentScreenId = id;
  screens.forEach(screenId => {
    const element = $(screenId);
    if (element) element.classList.toggle('hidden', screenId !== id);
  });
  saveSession();
  requestAnimationFrame(() => {
    try { scrollTo({ top: 0, left: 0, behavior: 'smooth' }); }
    catch (error) { scrollTo(0, 0); }
  });
}

function showStartError(message) {
  $('startError').textContent = message;
  $('startError').classList.remove('hidden');
}

function clearStartError() {
  $('startError').classList.add('hidden');
  $('startError').textContent = '';
}

function showNameEntryError(message) {
  $('nameEntryError').textContent = message;
  $('nameEntryError').classList.remove('hidden');
}

function clearNameEntryError() {
  $('nameEntryError').classList.add('hidden');
  $('nameEntryError').textContent = '';
}

function beginNameEntry() {
  settings.category = $('categorySelect').value;
  pendingNames = [];
  nameEntryIndex = 0;
  clearStartError();
  renderNameEntryStep();
  showScreen('nameEntryScreen');
}

function renderNameEntryStep() {
  const number = nameEntryIndex + 1;
  const total = settings.players;
  $('nameEntryProgressText').textContent = `Personne ${number} sur ${total}`;
  $('nameEntryProgress').style.width = `${(nameEntryIndex / total) * 100}%`;
  $('nameEntryTitle').textContent = number === 1 ? 'Quel est ton prénom ?' : 'À ton tour';
  $('nameEntryInstruction').textContent = number === 1
    ? 'Tu es la première personne de la ronde. Entre ton prénom.'
    : 'Entre ton prénom, puis passe le téléphone à la personne suivante dans le même sens.';
  $('saveNameAndPassBtn').textContent = number === total
    ? 'Valider le dernier prénom'
    : 'Valider et passer à mon voisin';
  $('singleNameInput').value = '';
  clearNameEntryError();
  setTimeout(() => {
    try { $('singleNameInput').focus({ preventScroll: true }); }
    catch (error) { $('singleNameInput').focus(); }
  }, 180);
}

function saveCurrentName() {
  const input = $('singleNameInput');
  const name = input.value.trim();
  if (!name) {
    showNameEntryError('Entre un prénom avant de continuer.');
    input.focus();
    return;
  }
  if (pendingNames.some(existing => normalize(existing) === normalize(name))) {
    showNameEntryError('Ce prénom est déjà utilisé. Ajoute une initiale ou un surnom.');
    input.focus();
    return;
  }

  pendingNames.push(name);
  nameEntryIndex += 1;
  try { input.blur(); } catch (error) {}

  if (nameEntryIndex >= settings.players) {
    renderOrderReview(pendingNames);
    showScreen('orderReviewScreen');
    return;
  }
  renderNameEntryStep();
}

function renderOrderReview(names) {
  $('orderReviewList').innerHTML = names.map((name, index) => `
    <div class="orderRow">
      <span>${index + 1}</span>
      <strong>${escapeHtml(name)}</strong>
      <small>${index === names.length - 1 ? 'puis retour au n° 1' : `passe au n° ${index + 2}`}</small>
    </div>`).join('');
}

function startGameWithNames(names) {
  if (!Array.isArray(names) || names.length !== settings.players) {
    throw new Error('Nombre de joueurs incohérent');
  }

  settings.category = $('categorySelect').value;
  const pair = pickPair();
  const roles = [
    ...Array(settings.players - settings.under - settings.white).fill('civil'),
    ...Array(settings.under).fill('under'),
    ...Array(settings.white).fill('white')
  ];
  const shuffledRoles = shuffle(roles);

  game = {
    pair,
    players: names.map((name, id) => ({ id, name, role: shuffledRoles[id], alive: true })),
    revealOrder: [...Array(settings.players).keys()],
    revealIndex: 0,
    voteNumber: 1,
    eliminated: null,
    winner: null,
    lastStarterId: null,
    currentStarterId: null,
    whiteGuessResolved: false
  };
  selectedPlayerId = null;
  recallPlayerId = null;
  groupDraft = [];
  updatePoolStatus();
  showPass();
  updateResumeCard();
}

function safeStartGameWithNames(names) {
  clearStartError();
  try { startGameWithNames(names); }
  catch (error) {
    console.error(error);
    showStartError('La partie n’a pas pu démarrer. Recharge la page puis réessaie.');
    showScreen('setupScreen');
  }
}

function showPass() {
  if (game.revealIndex >= game.revealOrder.length) {
    beginPlay();
    return;
  }
  const id = game.revealOrder[game.revealIndex];
  $('passPlayerName').textContent = game.players[id].name;
  $('revealProgress').style.width = `${(game.revealIndex / game.revealOrder.length) * 100}%`;
  showScreen('passScreen');
}

function revealSecret() {
  const player = game.players[game.revealOrder[game.revealIndex]];
  if (player.role === 'white') {
    $('secretRole').textContent = 'MR WHITE';
    $('secretWord').textContent = 'AUCUN MOT';
    $('secretWord').classList.add('whiteWord');
    $('secretTip').textContent = 'Bluffe grâce aux indices entendus et tente de découvrir le mot des Civils.';
  } else {
    $('secretRole').textContent = 'TON MOT';
    $('secretWord').textContent = player.role === 'civil' ? game.pair.civil : game.pair.undercover;
    $('secretWord').classList.remove('whiteWord');
    $('secretTip').textContent = 'Mémorise-le. Ne le prononce jamais et ne montre pas cet écran.';
  }
  showScreen('secretScreen');
}

function hideAndPass() {
  game.revealIndex += 1;
  showPass();
}

function chooseStarter() {
  const candidates = game.players.filter(player => player.alive && player.role !== 'white');
  if (!candidates.length) return null;
  const alternatives = candidates.length > 1
    ? candidates.filter(player => player.id !== game.lastStarterId)
    : candidates;
  const pool = alternatives.length ? alternatives : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderPlayScreen() {
  let starter = game.players.find(player => player.id === game.currentStarterId && player.alive && player.role !== 'white');
  if (!starter) {
    starter = chooseStarter();
    if (!starter) {
      finishGame(evaluateWinner() || 'white_survival');
      return;
    }
    game.lastStarterId = starter.id;
    game.currentStarterId = starter.id;
  }
  $('startPlayerName').textContent = starter.name;
  renderVoteGrid();
  showScreen('playScreen');
}

function beginPlay() {
  const starter = chooseStarter();
  if (!starter) {
    finishGame(evaluateWinner() || 'white_survival');
    return;
  }
  game.lastStarterId = starter.id;
  game.currentStarterId = starter.id;
  renderPlayScreen();
}

function renderVoteGrid() {
  const alive = game.players.filter(player => player.alive);
  $('aliveStatus').textContent = `${alive.length} en jeu`;
  $('roundStatus').textContent = `Vote ${game.voteNumber}`;
  $('voteGrid').innerHTML = '';

  game.players.forEach(player => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `playerTile${!player.alive ? ' out' : ''}${selectedPlayerId === player.id ? ' selected' : ''}`;
    button.textContent = player.name;
    button.disabled = !player.alive;
    button.onclick = () => {
      selectedPlayerId = player.id;
      renderVoteGrid();
      $('eliminateBtn').disabled = false;
      saveSession();
    };
    $('voteGrid').appendChild(button);
  });
  $('eliminateBtn').disabled = selectedPlayerId === null;
}

function openRecallSelect() {
  if (!game) return;
  recallPlayerId = null;
  $('recallPlayerGrid').innerHTML = '';
  game.players.filter(player => player.alive).forEach(player => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recallPlayerTile';
    button.textContent = player.name;
    button.onclick = () => prepareRecall(player.id);
    $('recallPlayerGrid').appendChild(button);
  });
  showScreen('recallSelectScreen');
}

function prepareRecall(id) {
  const player = game && game.players.find(candidate => candidate.id === id && candidate.alive);
  if (!player) { showScreen('playScreen'); return; }
  recallPlayerId = id;
  $('recallPlayerName').textContent = player.name;
  showScreen('recallPassScreen');
}

function openRecallSecret() {
  const player = game && game.players.find(candidate => candidate.id === recallPlayerId && candidate.alive);
  if (!player) { showScreen('playScreen'); return; }
  hideRecallWord();
  showScreen('recallSecretScreen');
}

function showRecallWord() {
  const player = game && game.players.find(candidate => candidate.id === recallPlayerId && candidate.alive);
  if (!player) return;
  const isWhite = player.role === 'white';
  $('recallBadge').textContent = isWhite ? 'MR WHITE' : 'TON MOT';
  $('recallWord').textContent = isWhite
    ? 'AUCUN MOT'
    : (player.role === 'civil' ? game.pair.civil : game.pair.undercover);
  $('recallWord').classList.toggle('whiteWord', isWhite);
  $('recallWord').classList.remove('hidden');
  $('recallPrompt').classList.add('hidden');
  $('recallTip').textContent = isWhite
    ? 'Tu dois continuer à bluffer grâce aux indices entendus.'
    : 'Mémorise-le sans le prononcer et sans montrer l’écran.';
  $('holdRecallBtn').textContent = 'Relâche pour cacher';
}

function hideRecallWord() {
  if (!$('recallWord')) return;
  $('recallWord').classList.add('hidden');
  $('recallPrompt').classList.remove('hidden');
  $('recallPrompt').textContent = 'Maintiens le bouton pour afficher';
  $('recallBadge').textContent = 'RAPPEL SECRET';
  $('recallTip').textContent = 'Le mot disparaît dès que tu relâches.';
  $('holdRecallBtn').textContent = 'Maintenir pour voir mon mot';
}

function finishRecall() {
  hideRecallWord();
  recallPlayerId = null;
  renderPlayScreen();
}

function renderEliminationScreen() {
  const player = game.eliminated;
  if (!player) { renderPlayScreen(); return; }
  $('eliminatedName').textContent = player.name;
  const label = player.role === 'civil' ? 'CIVIL' : player.role === 'under' ? 'UNDERCOVER' : 'MR WHITE';
  $('eliminatedRole').textContent = label;
  $('eliminatedRole').className = `revealRole ${player.role}`;

  if (player.role === 'white') {
    $('eliminatedInfo').textContent = game.whiteGuessResolved
      ? 'Mauvaise réponse : Mr White est éliminé. Le mot des Civils reste secret.'
      : 'Il n’avait aucun mot.';
    $('whiteGuessBox').classList.toggle('hidden', game.whiteGuessResolved);
    $('continueBtn').classList.toggle('hidden', !game.whiteGuessResolved);
  } else {
    $('eliminatedInfo').textContent = 'Son mot reste secret jusqu’à la fin.';
    $('whiteGuessBox').classList.add('hidden');
    $('continueBtn').classList.remove('hidden');
  }
  $('whiteGuessInput').value = '';
  showScreen('eliminationScreen');
}

function eliminateSelected() {
  if (selectedPlayerId === null) return;
  const player = game.players[selectedPlayerId];
  player.alive = false;
  game.eliminated = { ...player };
  game.whiteGuessResolved = false;
  selectedPlayerId = null;
  renderEliminationScreen();
}

function checkWhiteGuess() {
  const guess = normalize($('whiteGuessInput').value);
  if (!guess) {
    $('whiteGuessInput').classList.add('shake');
    setTimeout(() => $('whiteGuessInput').classList.remove('shake'), 400);
    return;
  }
  if (guess === normalize(game.pair.civil)) {
    finishGame('white');
  } else {
    game.whiteGuessResolved = true;
    renderEliminationScreen();
  }
}

function evaluateWinner() {
  const alive = game.players.filter(player => player.alive);
  const civilians = alive.filter(player => player.role === 'civil').length;
  const undercovers = alive.filter(player => player.role === 'under').length;
  const whites = alive.filter(player => player.role === 'white').length;
  if (undercovers === 0 && whites === 0) return 'civil';
  if (undercovers > 0 && undercovers >= civilians + whites) return 'under';
  if (whites > 0 && whites >= civilians + undercovers) return 'white_survival';
  return null;
}

function continueAfterElimination() {
  const winner = evaluateWinner();
  if (winner) { finishGame(winner); return; }
  game.voteNumber += 1;
  game.eliminated = null;
  game.whiteGuessResolved = false;
  game.currentStarterId = null;
  selectedPlayerId = null;
  beginPlay();
}

function winnerData(type) {
  return {
    civil: ['Victoire des Civils !', 'Tous les intrus ont été éliminés.'],
    under: ['Victoire des Undercover !', 'Ils sont désormais assez nombreux pour contrôler le vote.'],
    white: ['Victoire de Mr White !', 'Il a trouvé exactement le mot des Civils.'],
    white_survival: ['Victoire de Mr White !', 'Il a survécu jusqu’au duel final.']
  }[type];
}

function renderEndScreen() {
  const data = winnerData(game.winner);
  if (!data) { renderPlayScreen(); return; }
  $('winnerTitle').textContent = data[0];
  $('winnerText').textContent = data[1];
  $('finalWords').innerHTML = `
    <div class="wordTile"><strong>Mot des Civils</strong><span>${escapeHtml(game.pair.civil)}</span></div>
    <div class="wordTile"><strong>Mot des Undercover</strong><span>${escapeHtml(game.pair.undercover)}</span></div>`;
  showScreen('endScreen');
}

function finishGame(type) {
  game.winner = type;
  game.currentStarterId = null;
  renderEndScreen();
}

function openGroupManager() {
  groupDraft = game.players.map((player, index) => ({ index, name: player.name, active: true }));
  renderGroupManager();
  showScreen('groupManageScreen');
}

function activeGroupNames() {
  return groupDraft.filter(player => player.active).map(player => player.name);
}

function fitRolesToPlayerCount(count) {
  settings.players = count;
  settings.under = Math.min(settings.under, Math.max(1, count - 3));
  settings.white = Math.min(settings.white, Math.max(0, count - settings.under - 3));
}

function renderGroupManager(message = '') {
  const activeCount = groupDraft.filter(player => player.active).length;
  $('groupManageList').innerHTML = groupDraft.map((player, index) => `
    <div class="groupMember${player.active ? '' : ' removed'}">
      <div class="groupNumber">${index + 1}</div>
      <strong>${escapeHtml(player.name)}</strong>
      <button type="button" class="memberToggle ${player.active ? 'remove' : 'restore'}" data-member-index="${index}">${player.active ? 'Retirer' : 'Rajouter'}</button>
    </div>`).join('');
  $('groupManageList').querySelectorAll('[data-member-index]').forEach(button => {
    button.onclick = () => toggleGroupMember(Number(button.dataset.memberIndex));
  });

  const projectedUnder = Math.min(settings.under, Math.max(1, activeCount - 3));
  const projectedWhite = Math.min(settings.white, Math.max(0, activeCount - projectedUnder - 3));
  const civilians = activeCount - projectedUnder - projectedWhite;
  $('groupManageSummary').textContent = `${activeCount} joueur${activeCount > 1 ? 's' : ''} : ${civilians} Civil${civilians > 1 ? 's' : ''}, ${projectedUnder} Undercover et ${projectedWhite} Mr White.`;
  $('groupManageNotice').textContent = message || 'Cette liste est conservée uniquement dans la session active afin de pouvoir reprendre la partie sur ce téléphone.';
  $('startWithGroupBtn').disabled = activeCount < 4;
}

function toggleGroupMember(index) {
  const member = groupDraft[index];
  if (!member) return;
  const activeCount = groupDraft.filter(player => player.active).length;
  if (member.active && activeCount <= 4) {
    renderGroupManager('Il faut garder au moins 4 joueurs. Tu peux rajouter une personne retirée.');
    return;
  }
  member.active = !member.active;
  renderGroupManager();
  saveSession();
}

function startWithManagedGroup() {
  const names = activeGroupNames();
  if (names.length < 4) {
    renderGroupManager('Il faut au moins 4 joueurs pour relancer une partie.');
    return;
  }
  fitRolesToPlayerCount(names.length);
  pendingNames = [...names];
  safeStartGameWithNames(names);
}

function normalizeRestoredScreen(screenId) {
  if (screenId === 'secretScreen') return 'passScreen';
  if (['recallSelectScreen', 'recallPassScreen', 'recallSecretScreen'].includes(screenId)) return 'playScreen';
  if (!screens.includes(screenId)) return null;
  return screenId;
}

function restoreSession() {
  const session = getStoredSession();
  if (!session) {
    updateResumeCard();
    return;
  }

  restoringSession = true;
  try {
    game = session.game;
    settings = {
      players: game.players.length,
      under: Number(session.settings?.under) || game.players.filter(player => player.role === 'under').length,
      white: Number(session.settings?.white) || game.players.filter(player => player.role === 'white').length,
      category: CATEGORY_LABELS[session.settings?.category] ? session.settings.category : 'all'
    };
    selectedPlayerId = Number.isInteger(session.selectedPlayerId) ? session.selectedPlayerId : null;
    recallPlayerId = null;
    groupDraft = Array.isArray(session.groupDraft) ? session.groupDraft : [];
    pendingNames = game.players.map(player => player.name);
    updateSettingsUI();

    const requestedScreen = normalizeRestoredScreen(session.currentScreenId);
    if (requestedScreen === 'groupManageScreen' && groupDraft.length) {
      renderGroupManager();
      showScreen('groupManageScreen');
    } else if (game.winner) {
      renderEndScreen();
    } else if (requestedScreen === 'eliminationScreen' && game.eliminated) {
      renderEliminationScreen();
    } else if (game.revealIndex < game.revealOrder.length) {
      showPass();
    } else {
      renderPlayScreen();
    }
  } finally {
    restoringSession = false;
    saveSession();
    updateResumeCard();
  }
}

function detectPlatform() {
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  return isIOS ? { id: 'ios', label: 'iOS' }
    : isAndroid ? { id: 'android', label: 'Android' }
      : { id: 'web', label: 'Web' };
}

function applyPlatformLabel() {
  const platform = detectPlatform();
  document.documentElement.dataset.platform = platform.id;
  $('platformLabel').textContent = platform.label;
  document.title = `Undercover Party — ${platform.label}`;
}

function bindReliableTap(element, handler) {
  if (!element) return;
  let lastTouch = 0;
  let running = false;
  const invoke = event => {
    if (event && event.type === 'touchend') {
      lastTouch = Date.now();
      if (event.cancelable) event.preventDefault();
    } else if (Date.now() - lastTouch < 700) return;
    if (running) return;
    running = true;
    const active = document.activeElement;
    if (active && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName)) {
      try { active.blur(); } catch (error) {}
    }
    requestAnimationFrame(() => {
      try { handler(event); }
      finally { running = false; }
    });
  };
  element.addEventListener('touchend', invoke, { passive: false });
  element.addEventListener('click', invoke);
  element.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      invoke(event);
    }
  });
}

function bindRecallHold() {
  const button = $('holdRecallBtn');
  const start = event => { if (event.cancelable) event.preventDefault(); showRecallWord(); };
  const end = event => { if (event && event.cancelable) event.preventDefault(); hideRecallWord(); };
  if ('PointerEvent' in window) {
    button.addEventListener('pointerdown', event => {
      start(event);
      try { button.setPointerCapture(event.pointerId); } catch (error) {}
    });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(type => button.addEventListener(type, end));
  } else {
    button.addEventListener('touchstart', start, { passive: false });
    ['touchend', 'touchcancel'].forEach(type => button.addEventListener(type, end, { passive: false }));
    button.addEventListener('mousedown', start);
    ['mouseup', 'mouseleave'].forEach(type => button.addEventListener(type, end));
  }
  button.addEventListener('contextmenu', event => event.preventDefault());
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  }
}

function bindClick(id, handler) {
  const element = $(id);
  if (element) element.onclick = handler;
}

OLD_NAME_KEYS.forEach(key => safeStorage.removeItem(key));

document.querySelectorAll('[data-counter]').forEach(button => button.addEventListener('click', () => {
  const kind = button.dataset.counter;
  const direction = Number(button.dataset.dir);
  if (kind === 'players') {
    settings.players = clamp(settings.players + direction, 4, 20);
    settings.under = clamp(settings.under, 1, Math.max(1, settings.players - 3));
    settings.white = clamp(settings.white, 0, Math.max(0, settings.players - settings.under - 3));
  } else if (kind === 'under') {
    settings.under = clamp(settings.under + direction, 1, Math.max(1, settings.players - settings.white - 3));
  } else {
    settings.white = clamp(settings.white + direction, 0, Math.max(0, settings.players - settings.under - 3));
  }
  updateSettingsUI();
}));

bindClick('newGameBtn', () => {
  pendingNames = [];
  groupDraft = [];
  updateSettingsUI();
  showScreen('setupScreen');
});
bindClick('resumeSessionBtn', restoreSession);
bindClick('discardSessionBtn', () => {
  clearActiveSession();
  game = null;
  selectedPlayerId = null;
  recallPlayerId = null;
  groupDraft = [];
});
bindClick('backHomeBtn', () => showScreen('homeScreen'));
$('categorySelect').onchange = event => {
  settings.category = event.target.value;
  updatePoolStatus();
};
bindClick('resetWordsBtn', () => {
  safeStorage.removeItem(STORAGE_KEY);
  updatePoolStatus();
  $('resetWordsBtn').textContent = 'Historique réinitialisé ✓';
  setTimeout(() => { $('resetWordsBtn').textContent = 'Réinitialiser l’historique des mots'; }, 1400);
});

bindReliableTap($('startNameEntryBtn'), beginNameEntry);
bindReliableTap($('saveNameAndPassBtn'), saveCurrentName);
bindReliableTap($('confirmOrderBtn'), () => safeStartGameWithNames([...pendingNames]));
$('singleNameInput').addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); saveCurrentName(); }
});
$('singleNameInput').addEventListener('input', clearNameEntryError);
bindClick('cancelNameEntryBtn', () => {
  pendingNames = [];
  nameEntryIndex = 0;
  showScreen('setupScreen');
});
bindClick('restartNameEntryBtn', beginNameEntry);

bindClick('revealBtn', revealSecret);
bindClick('hideAndPassBtn', hideAndPass);
bindClick('forgotWordBtn', openRecallSelect);
bindClick('cancelRecallBtn', renderPlayScreen);
bindClick('backRecallSelectBtn', openRecallSelect);
bindClick('openRecallBtn', openRecallSecret);
bindClick('finishRecallBtn', finishRecall);
bindClick('eliminateBtn', eliminateSelected);
bindClick('checkWhiteGuessBtn', checkWhiteGuess);
bindClick('continueBtn', continueAfterElimination);
bindClick('samePlayersBtn', openGroupManager);
bindClick('startWithGroupBtn', startWithManagedGroup);
bindClick('backToResultsBtn', renderEndScreen);
bindClick('resetBtn', () => {
  clearActiveSession();
  game = null;
  selectedPlayerId = null;
  recallPlayerId = null;
  pendingNames = [];
  groupDraft = [];
  settings = { players: 13, under: 2, white: 1, category: 'all' };
  updateSettingsUI();
  showScreen('setupScreen');
});

bindRecallHold();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hideRecallWord();
    saveSession();
  }
});
addEventListener('pagehide', saveSession);
addEventListener('beforeunload', saveSession);
addEventListener('blur', hideRecallWord);
addEventListener('orientationchange', () => setTimeout(() => scrollTo(0, 0), 180));

applyPlatformLabel();
updateSettingsUI();
updateResumeCard();
registerServiceWorker();
