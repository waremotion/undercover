"use strict";

function normalizeRestoredScreen(screenId) {
  if (screenId === "secretScreen") return "passScreen";
  if (["recallSelectScreen", "recallPassScreen", "recallSecretScreen"].includes(screenId)) return "playScreen";
  return screens.includes(screenId) ? screenId : null;
}

function restoreSession() {
  const session = getStoredSession();
  if (!session) {
    updateResumeCard();
    return;
  }

  restoringSession = true;
  try {
    game = {
      ...session.game,
      language: session.game.language || "fr",
      currentStarterId: session.game.currentStarterId ?? session.game.lastStarterId ?? null,
      whiteGuessResolved: Boolean(session.game.whiteGuessResolved)
    };
    settings = {
      players: game.players.length,
      under: Number(session.settings?.under) || game.players.filter(player => player.role === "under").length,
      white: Number(session.settings?.white) || game.players.filter(player => player.role === "white").length,
      category: ["all", "food", "objects", "places", "nature", "culture", "daily"].includes(session.settings?.category)
        ? session.settings.category
        : "all"
    };
    selectedPlayerId = Number.isInteger(session.selectedPlayerId) ? session.selectedPlayerId : null;
    recallPlayerId = null;
    groupDraft = Array.isArray(session.groupDraft) ? session.groupDraft : [];
    pendingNames = game.players.map(player => player.name);
    updateSettingsUI();

    const requestedScreen = normalizeRestoredScreen(session.currentScreenId);
    if (requestedScreen === "groupManageScreen" && groupDraft.length) {
      renderGroupManager();
      showScreen("groupManageScreen");
    } else if (game.winner) {
      renderEndScreen();
    } else if (requestedScreen === "eliminationScreen" && game.eliminated) {
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
  const userAgent = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  return isIOS ? { id: "ios", label: "iOS" }
    : isAndroid ? { id: "android", label: "Android" }
      : { id: "web", label: t("common.web") };
}

function updateFooterAndTitle() {
  const platform = detectPlatform();
  document.documentElement.dataset.platform = platform.id;
  document.title = `Sketchy! — ${platform.label}`;
  $("footerText").textContent = t("footer", { platform: platform.label });
}

function refreshLocalizedUI() {
  SketchyI18n.apply(document);
  updateSettingsUI();
  updateResumeCard();
  updateFooterAndTitle();

  if (currentScreenId === "nameEntryScreen") {
    renderNameEntryStep({ focus: false });
    if (!$("nameEntryError").classList.contains("hidden")) {
      $("nameEntryError").textContent = $("singleNameInput").value.trim()
        ? t("names.duplicateError")
        : t("names.emptyError");
    }
  } else if (currentScreenId === "orderReviewScreen") {
    renderOrderReview(pendingNames);
  } else if (currentScreenId === "secretScreen" && game) {
    renderSecret();
  } else if (currentScreenId === "playScreen" && game) {
    renderPlayScreen({ navigate: false });
  } else if (currentScreenId === "recallSecretScreen") {
    if ($("recallWord").classList.contains("hidden")) hideRecallWord();
    else showRecallWord();
  } else if (currentScreenId === "eliminationScreen" && game) {
    renderEliminationScreen({ navigate: false });
  } else if (currentScreenId === "endScreen" && game) {
    renderEndScreen({ navigate: false });
  } else if (currentScreenId === "groupManageScreen" && game) {
    renderGroupManager();
  }
}

function bindReliableTap(element, handler) {
  if (!element) return;
  let lastTouch = 0;
  let running = false;

  const invoke = event => {
    if (event && event.type === "touchend") {
      lastTouch = Date.now();
      if (event.cancelable) event.preventDefault();
    } else if (Date.now() - lastTouch < 700) {
      return;
    }
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

  element.addEventListener("touchend", invoke, { passive: false });
  element.addEventListener("click", invoke);
  element.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      invoke(event);
    }
  });
}

function bindRecallHold() {
  const button = $("holdRecallBtn");
  const start = event => {
    if (event.cancelable) event.preventDefault();
    showRecallWord();
  };
  const end = event => {
    if (event && event.cancelable) event.preventDefault();
    hideRecallWord();
  };

  if ("PointerEvent" in window) {
    button.addEventListener("pointerdown", event => {
      start(event);
      try { button.setPointerCapture(event.pointerId); } catch (error) {}
    });
    ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"].forEach(type =>
      button.addEventListener(type, end)
    );
  } else {
    button.addEventListener("touchstart", start, { passive: false });
    ["touchend", "touchcancel"].forEach(type =>
      button.addEventListener(type, end, { passive: false })
    );
    button.addEventListener("mousedown", start);
    ["mouseup", "mouseleave"].forEach(type => button.addEventListener(type, end));
  }
  button.addEventListener("contextmenu", event => event.preventDefault());
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.warn));
  }
}

function bindClick(id, handler) {
  const element = $(id);
  if (element) element.onclick = handler;
}
