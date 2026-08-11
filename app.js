"use strict";

SketchyI18n.init();
migrateLegacyStorage();

document.querySelectorAll("[data-lang]").forEach(button => {
  bindReliableTap(button, () => {
    if (isLanguageLocked()) return;
    SketchyI18n.setLanguage(button.dataset.lang);
  });
});

SketchyI18n.onChange(() => {
  if (isLanguageLocked() && game?.language && currentLanguage() !== game.language) {
    SketchyI18n.setLanguage(game.language, { persist: false, notify: false });
    refreshLocalizedUI();
    return;
  }
  refreshLocalizedUI();
  saveSession();
});

document.querySelectorAll("[data-counter]").forEach(button => button.addEventListener("click", () => {
  const kind = button.dataset.counter;
  const direction = Number(button.dataset.dir);

  if (kind === "players") {
    settings.players = clamp(settings.players + direction, 4, 20);
    settings.under = clamp(settings.under, 1, Math.max(1, settings.players - 3));
    settings.white = clamp(settings.white, 0, Math.max(0, settings.players - settings.under - 3));
  } else if (kind === "under") {
    settings.under = clamp(settings.under + direction, 1, Math.max(1, settings.players - settings.white - 3));
  } else {
    settings.white = clamp(settings.white + direction, 0, Math.max(0, settings.players - settings.under - 3));
  }
  updateSettingsUI();
}));

bindClick("newGameBtn", () => {
  pendingNames = [];
  groupDraft = [];
  updateSettingsUI();
  syncLanguageLockUI();
  showScreen("setupScreen");
});
bindClick("resumeSessionBtn", restoreSession);
bindClick("discardSessionBtn", () => {
  clearActiveSession();
  game = null;
  selectedPlayerId = null;
  recallPlayerId = null;
  groupDraft = [];
  syncLanguageLockUI();
  refreshLocalizedUI();
});
bindClick("backHomeBtn", () => showScreen("homeScreen"));

$("categorySelect").onchange = event => {
  settings.category = event.target.value;
  updatePoolStatus();
};

bindClick("resetWordsBtn", () => {
  safeStorage.removeItem(wordHistoryKey());
  updatePoolStatus();
  $("resetWordsBtn").textContent = t("setup.resetDone");
  setTimeout(() => {
    $("resetWordsBtn").textContent = t("setup.resetHistory");
  }, 1400);
});

bindReliableTap($("startNameEntryBtn"), beginNameEntry);
bindReliableTap($("saveNameAndPassBtn"), saveCurrentName);
bindReliableTap($("confirmOrderBtn"), () => safeStartGameWithNames([...pendingNames]));

$("singleNameInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveCurrentName();
  }
});
$("singleNameInput").addEventListener("input", clearNameEntryError);

bindClick("cancelNameEntryBtn", () => {
  pendingNames = [];
  nameEntryIndex = 0;
  showScreen("setupScreen");
});
bindClick("restartNameEntryBtn", beginNameEntry);

bindClick("revealBtn", revealSecret);
bindClick("hideAndPassBtn", hideAndPass);
bindClick("forgotWordBtn", openRecallSelect);
bindClick("cancelRecallBtn", () => renderPlayScreen());
bindClick("backRecallSelectBtn", openRecallSelect);
bindClick("openRecallBtn", openRecallSecret);
bindClick("finishRecallBtn", finishRecall);
bindClick("eliminateBtn", eliminateSelected);
bindClick("checkWhiteGuessBtn", checkWhiteGuess);
bindClick("continueBtn", continueAfterElimination);
bindClick("samePlayersBtn", openGroupManager);
bindClick("startWithGroupBtn", startWithManagedGroup);
bindClick("backToResultsBtn", () => renderEndScreen());

bindClick("resetBtn", () => {
  clearActiveSession();
  game = null;
  selectedPlayerId = null;
  recallPlayerId = null;
  pendingNames = [];
  groupDraft = [];
  settings = { players: 13, under: 2, white: 1, category: "all" };
  updateSettingsUI();
  syncLanguageLockUI();
  showScreen("setupScreen");
});

bindRecallHold();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hideRecallWord();
    saveSession();
  }
});
addEventListener("pagehide", saveSession);
addEventListener("beforeunload", saveSession);
addEventListener("blur", hideRecallWord);
addEventListener("orientationchange", () => setTimeout(() => scrollTo(0, 0), 180));

refreshLocalizedUI();
syncLanguageLockUI();
registerServiceWorker();
