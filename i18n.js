"use strict";
(() => {
  const LANGUAGE_KEY="sketchy_language_v1", supported=["fr","en"];
  const translations={fr:window.SKETCHY_TRANSLATIONS_FR,en:window.SKETCHY_TRANSLATIONS_EN};
  let currentLanguage="fr"; const listeners=new Set();
  function readStoredLanguage(){try{const stored=localStorage.getItem(LANGUAGE_KEY);if(supported.includes(stored))return stored}catch(e){} const browser=(navigator.language||"").toLowerCase();return browser.startsWith("en")?"en":"fr"}
  function interpolate(template,vars={}){return String(template).replace(/\{(\w+)\}/g,(_,key)=>Object.prototype.hasOwnProperty.call(vars,key)?String(vars[key]):`{${key}}`)}
  function t(key,vars={}){const table=translations[currentLanguage]||translations.fr;const fallback=translations.fr[key]??key;return interpolate(table[key]??fallback,vars)}
  function apply(root=document){document.documentElement.lang=currentLanguage;document.querySelector('meta[name="description"]')?.setAttribute("content",t("meta.description"));root.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));root.querySelectorAll("[data-i18n-html]").forEach(el=>el.innerHTML=t(el.dataset.i18nHtml));root.querySelectorAll("[data-i18n-placeholder]").forEach(el=>el.setAttribute("placeholder",t(el.dataset.i18nPlaceholder)));root.querySelectorAll("[data-i18n-aria-label]").forEach(el=>el.setAttribute("aria-label",t(el.dataset.i18nAriaLabel)));root.querySelectorAll("[data-lang]").forEach(button=>{const active=button.dataset.lang===currentLanguage;button.classList.toggle("active",active);button.setAttribute("aria-pressed",active?"true":"false")})}
  function setLanguage(language,{persist=true,notify=true}={}){if(!supported.includes(language))return false;const changed=currentLanguage!==language;currentLanguage=language;if(persist)try{localStorage.setItem(LANGUAGE_KEY,language)}catch(e){}apply(document);if(changed&&notify)listeners.forEach(listener=>listener(language));return true}
  function init(){currentLanguage=readStoredLanguage();apply(document);return currentLanguage}
  function onChange(listener){listeners.add(listener);return()=>listeners.delete(listener)}
  window.SketchyI18n={init,t,apply,setLanguage,getLanguage:()=>currentLanguage,onChange,supported:[...supported]};
})();
