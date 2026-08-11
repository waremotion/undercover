"use strict";

function beginNameEntry() {
  settings.category = $("categorySelect").value;
  pendingNames = [];
  nameEntryIndex = 0;
  clearStartError();
  renderNameEntryStep();
  showScreen("nameEntryScreen");
}

function renderNameEntryStep({ focus = true } = {}) {
  const number = nameEntryIndex + 1;
  const total = settings.players;
  $("nameEntryProgressText").textContent = t("names.progress", { current: number, total });
  $("nameEntryProgress").style.width = `${(nameEntryIndex / total) * 100}%`;
  $("nameEntryTitle").textContent = t(number === 1 ? "names.firstTitle" : "names.nextTitle");
  $("nameEntryInstruction").textContent = t(number === 1 ? "names.firstInstruction" : "names.nextInstruction");
  $("saveNameAndPassBtn").textContent = t(number === total ? "names.lastButton" : "names.nextButton");

  if (focus) {
    $("singleNameInput").value = "";
    clearNameEntryError();
    setTimeout(() => {
      try { $("singleNameInput").focus({ preventScroll: true }); }
      catch (error) { $("singleNameInput").focus(); }
    }, 180);
  }
}

function saveCurrentName() {
  const input = $("singleNameInput");
  const name = input.value.trim();

  if (!name) {
    showNameEntryError(t("names.emptyError"));
    input.focus();
    return;
  }

  if (pendingNames.some(existing => normalize(existing) === normalize(name))) {
    showNameEntryError(t("names.duplicateError"));
    input.focus();
    return;
  }

  pendingNames.push(name);
  nameEntryIndex += 1;
  try { input.blur(); } catch (error) {}

  if (nameEntryIndex >= settings.players) {
    renderOrderReview(pendingNames);
    showScreen("orderReviewScreen");
    return;
  }
  renderNameEntryStep();
}

function renderOrderReview(names) {
  $("orderReviewList").innerHTML = names.map((name, index) => `
    <div class="orderRow">
      <span>${index + 1}</span>
      <strong>${escapeHtml(name)}</strong>
      <small>${index === names.length - 1
        ? t("order.backToFirst")
        : t("order.passTo", { number: index + 2 })}</small>
    </div>`).join("");
}

function startGameWithNames(names) {
  if (!Array.isArray(names) || names.length !== settings.players) {
    throw new Error("Player count mismatch");
  }

  settings.category = $("categorySelect").value;
  const language = currentLanguage();
  const pair = pickPair(language);
  const roles = [
    ...Array(settings.players - settings.under - settings.white).fill("civil"),
    ...Array(settings.under).fill("under"),
    ...Array(settings.white).fill("white")
  ];
  const shuffledRoles = shuffle(roles);

  game = {
    language,
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
  try {
    startGameWithNames(names);
  } catch (error) {
    console.error(error);
    showStartError(t("error.start"));
    showScreen("setupScreen");
  }
}

function showPass() {
  if (game.revealIndex >= game.revealOrder.length) {
    beginPlay();
    return;
  }
  const id = game.revealOrder[game.revealIndex];
  $("passPlayerName").textContent = game.players[id].name;
  $("revealProgress").style.width = `${(game.revealIndex / game.revealOrder.length) * 100}%`;
  showScreen("passScreen");
}

function renderSecret() {
  const player = game.players[game.revealOrder[game.revealIndex]];
  if (!player) return;

  if (player.role === "white") {
    $("secretRole").textContent = t("common.mrWhite");
    $("secretWord").textContent = t("secret.noWord");
    $("secretWord").classList.add("whiteWord");
    $("secretTip").textContent = t("secret.whiteTip");
  } else {
    $("secretRole").textContent = t("secret.wordBadge");
    $("secretWord").textContent = player.role === "civil" ? game.pair.civil : game.pair.undercover;
    $("secretWord").classList.remove("whiteWord");
    $("secretTip").textContent = t("secret.wordTip");
  }
}

function revealSecret() {
  renderSecret();
  showScreen("secretScreen");
}

function hideAndPass() {
  game.revealIndex += 1;
  showPass();
}

function chooseStarter() {
  const candidates = game.players.filter(player => player.alive && player.role !== "white");
  if (!candidates.length) return null;

  const alternatives = candidates.length > 1
    ? candidates.filter(player => player.id !== game.lastStarterId)
    : candidates;
  const pool = alternatives.length ? alternatives : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderPlayScreen({ navigate = true } = {}) {
  let starter = game.players.find(player =>
    player.id === game.currentStarterId && player.alive && player.role !== "white"
  );

  if (!starter) {
    starter = chooseStarter();
    if (!starter) {
      finishGame(evaluateWinner() || "white_survival");
      return;
    }
    game.lastStarterId = starter.id;
    game.currentStarterId = starter.id;
  }

  $("startPlayerName").textContent = starter.name;
  renderVoteGrid();
  if (navigate) showScreen("playScreen");
}

function beginPlay() {
  const starter = chooseStarter();
  if (!starter) {
    finishGame(evaluateWinner() || "white_survival");
    return;
  }
  game.lastStarterId = starter.id;
  game.currentStarterId = starter.id;
  renderPlayScreen();
}

function renderVoteGrid() {
  const alive = game.players.filter(player => player.alive);
  $("aliveStatus").textContent = t("play.alive", { count: alive.length });
  $("roundStatus").textContent = t("play.vote", { number: game.voteNumber });
  $("voteGrid").innerHTML = "";

  game.players.forEach(player => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `playerTile${!player.alive ? " out" : ""}${selectedPlayerId === player.id ? " selected" : ""}`;
    button.textContent = player.name;
    button.disabled = !player.alive;
    button.onclick = () => {
      selectedPlayerId = player.id;
      renderVoteGrid();
      $("eliminateBtn").disabled = false;
      saveSession();
    };
    $("voteGrid").appendChild(button);
  });
  $("eliminateBtn").disabled = selectedPlayerId === null;
}

function openRecallSelect() {
  if (!game) return;
  recallPlayerId = null;
  $("recallPlayerGrid").innerHTML = "";
  game.players.filter(player => player.alive).forEach(player => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recallPlayerTile";
    button.textContent = player.name;
    button.onclick = () => prepareRecall(player.id);
    $("recallPlayerGrid").appendChild(button);
  });
  showScreen("recallSelectScreen");
}

function prepareRecall(id) {
  const player = game && game.players.find(candidate => candidate.id === id && candidate.alive);
  if (!player) { renderPlayScreen(); return; }
  recallPlayerId = id;
  $("recallPlayerName").textContent = player.name;
  showScreen("recallPassScreen");
}

function openRecallSecret() {
  const player = game && game.players.find(candidate => candidate.id === recallPlayerId && candidate.alive);
  if (!player) { renderPlayScreen(); return; }
  hideRecallWord();
  showScreen("recallSecretScreen");
}

function showRecallWord() {
  const player = game && game.players.find(candidate => candidate.id === recallPlayerId && candidate.alive);
  if (!player) return;

  const isWhite = player.role === "white";
  $("recallBadge").textContent = isWhite ? t("common.mrWhite") : t("secret.wordBadge");
  $("recallWord").textContent = isWhite
    ? t("secret.noWord")
    : (player.role === "civil" ? game.pair.civil : game.pair.undercover);
  $("recallWord").classList.toggle("whiteWord", isWhite);
  $("recallWord").classList.remove("hidden");
  $("recallPrompt").classList.add("hidden");
  $("recallTip").textContent = t(isWhite ? "recall.whiteTip" : "recall.wordTip");
  $("holdRecallBtn").textContent = t("recall.releaseButton");
}

function hideRecallWord() {
  if (!$("recallWord")) return;
  $("recallWord").classList.add("hidden");
  $("recallPrompt").classList.remove("hidden");
  $("recallPrompt").textContent = t("recall.holdPrompt");
  $("recallBadge").textContent = t("recall.badge");
  $("recallTip").textContent = t("recall.hiddenTip");
  $("holdRecallBtn").textContent = t("recall.holdButton");
}

function finishRecall() {
  hideRecallWord();
  recallPlayerId = null;
  renderPlayScreen();
}

function roleLabel(role) {
  if (role === "civil") return t("common.civilians");
  if (role === "under") return t("common.undercover");
  return t("common.mrWhite");
}

function renderEliminationScreen({ navigate = true } = {}) {
  const player = game.eliminated;
  if (!player) {
    renderPlayScreen();
    return;
  }

  $("eliminatedName").textContent = player.name;
  $("eliminatedRole").textContent = roleLabel(player.role);
  $("eliminatedRole").className = `revealRole ${player.role}`;

  if (player.role === "white") {
    $("eliminatedInfo").textContent = game.whiteGuessResolved
      ? t("elim.whiteWrong")
      : t("elim.whiteNoWord");
    $("whiteGuessBox").classList.toggle("hidden", game.whiteGuessResolved);
    $("continueBtn").classList.toggle("hidden", !game.whiteGuessResolved);
  } else {
    $("eliminatedInfo").textContent = t("elim.secret");
    $("whiteGuessBox").classList.add("hidden");
    $("continueBtn").classList.remove("hidden");
  }

  $("whiteGuessInput").value = "";
  if (navigate) showScreen("eliminationScreen");
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
  const guess = normalize($("whiteGuessInput").value);
  if (!guess) {
    $("whiteGuessInput").classList.add("shake");
    setTimeout(() => $("whiteGuessInput").classList.remove("shake"), 400);
    return;
  }

  if (guess === normalize(game.pair.civil)) {
    finishGame("white");
  } else {
    game.whiteGuessResolved = true;
    renderEliminationScreen();
  }
}

function evaluateWinner() {
  const alive = game.players.filter(player => player.alive);
  const civilians = alive.filter(player => player.role === "civil").length;
  const undercovers = alive.filter(player => player.role === "under").length;
  const whites = alive.filter(player => player.role === "white").length;

  if (undercovers === 0 && whites === 0) return "civil";
  if (undercovers > 0 && undercovers >= civilians + whites) return "under";
  if (whites > 0 && whites >= civilians + undercovers) return "white_survival";
  return null;
}

function continueAfterElimination() {
  const winner = evaluateWinner();
  if (winner) {
    finishGame(winner);
    return;
  }

  game.voteNumber += 1;
  game.eliminated = null;
  game.whiteGuessResolved = false;
  game.currentStarterId = null;
  selectedPlayerId = null;
  beginPlay();
}

function winnerData(type) {
  return {
    civil: [t("end.civilTitle"), t("end.civilText")],
    under: [t("end.underTitle"), t("end.underText")],
    white: [t("end.whiteTitle"), t("end.whiteGuessText")],
    white_survival: [t("end.whiteTitle"), t("end.whiteSurvivalText")]
  }[type];
}

function renderEndScreen({ navigate = true } = {}) {
  const data = winnerData(game.winner);
  if (!data) {
    renderPlayScreen();
    return;
  }

  $("winnerTitle").textContent = data[0];
  $("winnerText").textContent = data[1];
  $("finalWords").innerHTML = `
    <div class="wordTile"><strong>${escapeHtml(t("end.civilWord"))}</strong><span>${escapeHtml(game.pair.civil)}</span></div>
    <div class="wordTile"><strong>${escapeHtml(t("end.underWord"))}</strong><span>${escapeHtml(game.pair.undercover)}</span></div>`;
  if (navigate) showScreen("endScreen");
}

function finishGame(type) {
  game.winner = type;
  game.currentStarterId = null;
  renderEndScreen();
}

function openGroupManager() {
  groupDraft = game.players.map((player, index) => ({ index, name: player.name, active: true }));
  renderGroupManager();
  showScreen("groupManageScreen");
}

function activeGroupNames() {
  return groupDraft.filter(player => player.active).map(player => player.name);
}

function fitRolesToPlayerCount(count) {
  settings.players = count;
  settings.under = Math.min(settings.under, Math.max(1, count - 3));
  settings.white = Math.min(settings.white, Math.max(0, count - settings.under - 3));
}

function renderGroupManager(message = "") {
  const activeCount = groupDraft.filter(player => player.active).length;
  $("groupManageList").innerHTML = groupDraft.map((player, index) => `
    <div class="groupMember${player.active ? "" : " removed"}">
      <div class="groupNumber">${index + 1}</div>
      <strong>${escapeHtml(player.name)}</strong>
      <button type="button" class="memberToggle ${player.active ? "remove" : "restore"}" data-member-index="${index}">
        ${escapeHtml(t(player.active ? "group.remove" : "group.restore"))}
      </button>
    </div>`).join("");

  $("groupManageList").querySelectorAll("[data-member-index]").forEach(button => {
    button.onclick = () => toggleGroupMember(Number(button.dataset.memberIndex));
  });

  const projectedUnder = Math.min(settings.under, Math.max(1, activeCount - 3));
  const projectedWhite = Math.min(settings.white, Math.max(0, activeCount - projectedUnder - 3));
  const civilians = activeCount - projectedUnder - projectedWhite;
  const pPlural = currentLanguage() === "fr" ? (activeCount > 1 ? "s" : "") : (activeCount !== 1 ? "s" : "");
  const cPlural = currentLanguage() === "fr" ? (civilians > 1 ? "s" : "") : (civilians !== 1 ? "s" : "");

  $("groupManageSummary").textContent = t("group.summary", {
    players: activeCount,
    pPlural,
    civilians,
    cPlural,
    under: projectedUnder,
    white: projectedWhite
  });
  $("groupManageNotice").textContent = message || t("group.notice");
  $("startWithGroupBtn").disabled = activeCount < 4;
}

function toggleGroupMember(index) {
  const member = groupDraft[index];
  if (!member) return;

  const activeCount = groupDraft.filter(player => player.active).length;
  if (member.active && activeCount <= 4) {
    renderGroupManager(t("group.minPlayers"));
    return;
  }

  member.active = !member.active;
  renderGroupManager();
  saveSession();
}

function startWithManagedGroup() {
  const names = activeGroupNames();
  if (names.length < 4) {
    renderGroupManager(t("group.needFour"));
    return;
  }

  fitRolesToPlayerCount(names.length);
  pendingNames = [...names];
  safeStartGameWithNames(names);
}
