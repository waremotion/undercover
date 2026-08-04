'use strict';

const CATEGORY_LABELS={all:'le mélange complet',food:'la cuisine',objects:'les objets',places:'les lieux et voyages',nature:'les animaux et la nature',culture:'la culture et les loisirs',daily:'la vie quotidienne'};
const STORAGE_KEY='undercover_used_pairs_v3';
const OLD_NAME_KEYS=['undercover_seating_order_v1','undercover_names'];
const $=id=>document.getElementById(id);
const screens=['homeScreen','setupScreen','nameEntryScreen','orderReviewScreen','passScreen','secretScreen','playScreen','recallSelectScreen','recallPassScreen','recallSecretScreen','eliminationScreen','endScreen','groupManageScreen'];
let settings={players:13,under:2,white:1,category:'all'};
let game=null,selectedPlayerId=null,recallPlayerId=null;
let pendingNames=[],nameEntryIndex=0,groupDraft=[];

const memoryStorage=new Map();
const safeStorage={
  getItem(key){try{return localStorage.getItem(key)}catch(e){return memoryStorage.has(key)?memoryStorage.get(key):null}},
  setItem(key,value){const v=String(value);memoryStorage.set(key,v);try{localStorage.setItem(key,v)}catch(e){}},
  removeItem(key){memoryStorage.delete(key);try{localStorage.removeItem(key)}catch(e){}}
};
function readJson(key,fallback){try{const raw=safeStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch(e){return fallback}}
function showScreen(id){screens.forEach(s=>{const el=$(s);if(el)el.classList.toggle('hidden',s!==id)});requestAnimationFrame(()=>{try{scrollTo({top:0,left:0,behavior:'smooth'})}catch(e){scrollTo(0,0)}})}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function normalize(v){return(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,"'").trim()}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function pairKey(p){return[normalize(p[0]),normalize(p[1])].sort().join('|||')}
function getUsed(){return new Set(readJson(STORAGE_KEY,[]))}
function saveUsed(set){safeStorage.setItem(STORAGE_KEY,JSON.stringify([...set]))}
function currentPool(){return WORD_PAIRS.filter(p=>settings.category==='all'||p[2]===settings.category)}
function updatePoolStatus(){const pool=currentPool(),used=getUsed(),remaining=pool.filter(p=>!used.has(pairKey(p))).length;$('poolStatus').textContent=`${remaining} duo${remaining>1?'s':''} inédit${remaining>1?'s':''} restant${remaining>1?'s':''} dans ${CATEGORY_LABELS[settings.category]}.`}
function updateSettingsUI(){
  $('playersValue').textContent=settings.players;$('underValue').textContent=settings.under;$('whiteValue').textContent=settings.white;
  const civ=settings.players-settings.under-settings.white;
  $('balanceNotice').textContent=civ<3?'Il faut conserver au moins 3 Civils.':`Composition : ${civ} Civil${civ>1?'s':''}, ${settings.under} Undercover et ${settings.white} Mr White.`;
  updatePoolStatus();
}
function pickPair(){
  const pool=currentPool(),used=getUsed();let available=pool.filter(p=>!used.has(pairKey(p)));
  if(!available.length){pool.forEach(p=>used.delete(pairKey(p)));available=[...pool]}
  const chosen=available[Math.floor(Math.random()*available.length)];used.add(pairKey(chosen));saveUsed(used);
  const reverse=Math.random()<.5;return{civil:reverse?chosen[1]:chosen[0],undercover:reverse?chosen[0]:chosen[1],category:chosen[2]};
}
function showStartError(message){$('startError').textContent=message;$('startError').classList.remove('hidden')}
function clearStartError(){$('startError').classList.add('hidden');$('startError').textContent=''}
function showNameEntryError(message){$('nameEntryError').textContent=message;$('nameEntryError').classList.remove('hidden')}
function clearNameEntryError(){$('nameEntryError').classList.add('hidden');$('nameEntryError').textContent=''}
function beginNameEntry(){settings.category=$('categorySelect').value;pendingNames=[];nameEntryIndex=0;clearStartError();renderNameEntryStep();showScreen('nameEntryScreen')}
function renderNameEntryStep(){
  const number=nameEntryIndex+1,total=settings.players;
  $('nameEntryProgressText').textContent=`Personne ${number} sur ${total}`;
  $('nameEntryProgress').style.width=`${nameEntryIndex/total*100}%`;
  $('nameEntryTitle').textContent=number===1?'Quel est ton prénom ?':'À ton tour';
  $('nameEntryInstruction').textContent=number===1?'Tu es la première personne de la ronde. Entre ton prénom.':'Entre ton prénom, puis passe le téléphone à la personne suivante dans le même sens.';
  $('saveNameAndPassBtn').textContent=number===total?'Valider le dernier prénom':'Valider et passer à mon voisin';
  $('singleNameInput').value='';clearNameEntryError();
  setTimeout(()=>{try{$('singleNameInput').focus({preventScroll:true})}catch(e){$('singleNameInput').focus()}},180);
}
function saveCurrentName(){
  const input=$('singleNameInput'),name=input.value.trim();
  if(!name){showNameEntryError('Entre un prénom avant de continuer.');input.focus();return}
  if(pendingNames.some(n=>normalize(n)===normalize(name))){showNameEntryError('Ce prénom est déjà utilisé. Ajoute une initiale ou un surnom.');input.focus();return}
  pendingNames.push(name);nameEntryIndex++;try{input.blur()}catch(e){}
  if(nameEntryIndex>=settings.players){renderOrderReview(pendingNames);showScreen('orderReviewScreen');return}
  renderNameEntryStep();
}
function renderOrderReview(names){$('orderReviewList').innerHTML=names.map((n,i)=>`<div class="orderRow"><span>${i+1}</span><strong>${escapeHtml(n)}</strong><small>${i===names.length-1?'puis retour au n° 1':`passe au n° ${i+2}`}</small></div>`).join('')}
function startGameWithNames(names){
  if(!Array.isArray(names)||names.length!==settings.players)throw new Error('Nombre de joueurs incohérent');
  settings.category=$('categorySelect').value;const pair=pickPair();
  const roles=[...Array(settings.players-settings.under-settings.white).fill('civil'),...Array(settings.under).fill('under'),...Array(settings.white).fill('white')];
  const shuffledRoles=shuffle(roles);
  game={pair,players:names.map((name,id)=>({id,name,role:shuffledRoles[id],alive:true})),revealOrder:[...Array(settings.players).keys()],revealIndex:0,voteNumber:1,eliminated:null,winner:null,lastStarterId:null};
  selectedPlayerId=null;recallPlayerId=null;updatePoolStatus();showPass();
}
function safeStartGameWithNames(names){clearStartError();try{startGameWithNames(names)}catch(e){console.error(e);showStartError('La partie n’a pas pu démarrer. Recharge la page puis réessaie.');showScreen('setupScreen')}}
function showPass(){if(game.revealIndex>=game.revealOrder.length){beginPlay();return}const id=game.revealOrder[game.revealIndex];$('passPlayerName').textContent=game.players[id].name;$('revealProgress').style.width=`${game.revealIndex/game.revealOrder.length*100}%`;showScreen('passScreen')}
function revealSecret(){
  const p=game.players[game.revealOrder[game.revealIndex]];
  if(p.role==='white'){$('secretRole').textContent='MR WHITE';$('secretWord').textContent='AUCUN MOT';$('secretWord').classList.add('whiteWord');$('secretTip').textContent='Bluffe grâce aux indices entendus et tente de découvrir le mot des Civils.'}
  else{$('secretRole').textContent='TON MOT';$('secretWord').textContent=p.role==='civil'?game.pair.civil:game.pair.undercover;$('secretWord').classList.remove('whiteWord');$('secretTip').textContent='Mémorise-le. Ne le prononce jamais et ne montre pas cet écran.'}
  showScreen('secretScreen');
}
function hideAndPass(){game.revealIndex++;showPass()}
function chooseStarter(){
  const candidates=game.players.filter(p=>p.alive&&p.role!=='white');if(!candidates.length)return null;
  const alternatives=candidates.length>1?candidates.filter(p=>p.id!==game.lastStarterId):candidates;
  const pool=alternatives.length?alternatives:candidates;return pool[Math.floor(Math.random()*pool.length)];
}
function beginPlay(){const starter=chooseStarter();if(!starter){finishGame(evaluateWinner()||'white_survival');return}game.lastStarterId=starter.id;$('startPlayerName').textContent=starter.name;renderVoteGrid();showScreen('playScreen')}
function renderVoteGrid(){
  const alive=game.players.filter(p=>p.alive);$('aliveStatus').textContent=`${alive.length} en jeu`;$('roundStatus').textContent=`Vote ${game.voteNumber}`;$('voteGrid').innerHTML='';
  game.players.forEach(p=>{const b=document.createElement('button');b.type='button';b.className=`playerTile${!p.alive?' out':''}${selectedPlayerId===p.id?' selected':''}`;b.textContent=p.name;b.disabled=!p.alive;b.onclick=()=>{selectedPlayerId=p.id;renderVoteGrid();$('eliminateBtn').disabled=false};$('voteGrid').appendChild(b)});
}
function openRecallSelect(){if(!game)return;recallPlayerId=null;$('recallPlayerGrid').innerHTML='';game.players.filter(p=>p.alive).forEach(p=>{const b=document.createElement('button');b.type='button';b.className='recallPlayerTile';b.textContent=p.name;b.onclick=()=>prepareRecall(p.id);$('recallPlayerGrid').appendChild(b)});showScreen('recallSelectScreen')}
function prepareRecall(id){const p=game&&game.players.find(x=>x.id===id&&x.alive);if(!p){showScreen('playScreen');return}recallPlayerId=id;$('recallPlayerName').textContent=p.name;showScreen('recallPassScreen')}
function openRecallSecret(){const p=game&&game.players.find(x=>x.id===recallPlayerId&&x.alive);if(!p){showScreen('playScreen');return}hideRecallWord();showScreen('recallSecretScreen')}
function showRecallWord(){const p=game&&game.players.find(x=>x.id===recallPlayerId&&x.alive);if(!p)return;const white=p.role==='white';$('recallBadge').textContent=white?'MR WHITE':'TON MOT';$('recallWord').textContent=white?'AUCUN MOT':(p.role==='civil'?game.pair.civil:game.pair.undercover);$('recallWord').classList.toggle('whiteWord',white);$('recallWord').classList.remove('hidden');$('recallPrompt').classList.add('hidden');$('recallTip').textContent=white?'Tu dois continuer à bluffer grâce aux indices entendus.':'Mémorise-le sans le prononcer et sans montrer l’écran.';$('holdRecallBtn').textContent='Relâche pour cacher'}
function hideRecallWord(){if(!$('recallWord'))return;$('recallWord').classList.add('hidden');$('recallPrompt').classList.remove('hidden');$('recallPrompt').textContent='Maintiens le bouton pour afficher';$('recallBadge').textContent='RAPPEL SECRET';$('recallTip').textContent='Le mot disparaît dès que tu relâches.';$('holdRecallBtn').textContent='Maintenir pour voir mon mot'}
function finishRecall(){hideRecallWord();recallPlayerId=null;renderVoteGrid();showScreen('playScreen')}
function eliminateSelected(){
  if(selectedPlayerId===null)return;const p=game.players[selectedPlayerId];p.alive=false;game.eliminated=p;$('eliminatedName').textContent=p.name;
  const label=p.role==='civil'?'CIVIL':p.role==='under'?'UNDERCOVER':'MR WHITE';$('eliminatedRole').textContent=label;$('eliminatedRole').className=`revealRole ${p.role}`;
  $('eliminatedInfo').textContent=p.role==='white'?'Il n’avait aucun mot.':'Son mot reste secret jusqu’à la fin.';$('whiteGuessBox').classList.toggle('hidden',p.role!=='white');$('continueBtn').classList.toggle('hidden',p.role==='white');$('whiteGuessInput').value='';showScreen('eliminationScreen');
}
function checkWhiteGuess(){const guess=normalize($('whiteGuessInput').value);if(!guess){$('whiteGuessInput').classList.add('shake');setTimeout(()=>$('whiteGuessInput').classList.remove('shake'),400);return}if(guess===normalize(game.pair.civil))finishGame('white');else{$('whiteGuessBox').classList.add('hidden');$('continueBtn').classList.remove('hidden');$('eliminatedInfo').textContent='Mauvaise réponse : Mr White est éliminé. Le mot des Civils reste secret.'}}
function evaluateWinner(){const alive=game.players.filter(p=>p.alive),civ=alive.filter(p=>p.role==='civil').length,under=alive.filter(p=>p.role==='under').length,white=alive.filter(p=>p.role==='white').length;if(under===0&&white===0)return'civil';if(under>0&&under>=civ+white)return'under';if(white>0&&white>=civ+under)return'white_survival';return null}
function continueAfterElimination(){const winner=evaluateWinner();if(winner){finishGame(winner);return}game.voteNumber++;selectedPlayerId=null;$('eliminateBtn').disabled=true;beginPlay()}
function finishGame(type){const data={civil:['Victoire des Civils !','Tous les intrus ont été éliminés.'],under:['Victoire des Undercover !','Ils sont désormais assez nombreux pour contrôler le vote.'],white:['Victoire de Mr White !','Il a trouvé exactement le mot des Civils.'],white_survival:['Victoire de Mr White !','Il a survécu jusqu’au duel final.']}[type];game.winner=type;$('winnerTitle').textContent=data[0];$('winnerText').textContent=data[1];$('finalWords').innerHTML=`<div class="wordTile"><strong>Mot des Civils</strong><span>${escapeHtml(game.pair.civil)}</span></div><div class="wordTile"><strong>Mot des Undercover</strong><span>${escapeHtml(game.pair.undercover)}</span></div>`;showScreen('endScreen')}

function openGroupManager(){
  groupDraft=game.players.map((p,index)=>({index,name:p.name,active:true}));
  renderGroupManager();showScreen('groupManageScreen');
}
function activeGroupNames(){return groupDraft.filter(p=>p.active).map(p=>p.name)}
function fitRolesToPlayerCount(count){
  settings.players=count;
  settings.under=Math.min(settings.under,Math.max(1,count-3));
  settings.white=Math.min(settings.white,Math.max(0,count-settings.under-3));
}
function renderGroupManager(message=''){
  const activeCount=groupDraft.filter(p=>p.active).length;
  $('groupManageList').innerHTML=groupDraft.map((p,i)=>`<div class="groupMember${p.active?'':' removed'}"><div class="groupNumber">${i+1}</div><strong>${escapeHtml(p.name)}</strong><button type="button" class="memberToggle ${p.active?'remove':'restore'}" data-member-index="${i}">${p.active?'Retirer':'Rajouter'}</button></div>`).join('');
  $('groupManageList').querySelectorAll('[data-member-index]').forEach(btn=>btn.onclick=()=>toggleGroupMember(Number(btn.dataset.memberIndex)));
  const projectedUnder=Math.min(settings.under,Math.max(1,activeCount-3));
  const projectedWhite=Math.min(settings.white,Math.max(0,activeCount-projectedUnder-3));
  const civilians=activeCount-projectedUnder-projectedWhite;
  $('groupManageSummary').textContent=`${activeCount} joueur${activeCount>1?'s':''} : ${civilians} Civil${civilians>1?'s':''}, ${projectedUnder} Undercover et ${projectedWhite} Mr White.`;
  $('groupManageNotice').textContent=message||'Les prénoms restent seulement dans la partie en cours. Ils ne sont pas enregistrés sur le téléphone.';
  $('startWithGroupBtn').disabled=activeCount<4;
}
function toggleGroupMember(index){
  const member=groupDraft[index];if(!member)return;
  const activeCount=groupDraft.filter(p=>p.active).length;
  if(member.active&&activeCount<=4){renderGroupManager('Il faut garder au moins 4 joueurs. Tu peux rajouter une personne retirée.');return}
  member.active=!member.active;renderGroupManager();
}
function startWithManagedGroup(){
  const names=activeGroupNames();if(names.length<4){renderGroupManager('Il faut au moins 4 joueurs pour relancer une partie.');return}
  fitRolesToPlayerCount(names.length);pendingNames=[...names];safeStartGameWithNames(names);
}

function detectPlatform(){const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/i.test(ua);return ios?{id:'ios',label:'iOS'}:android?{id:'android',label:'Android'}:{id:'web',label:'Web'}}
function applyPlatformLabel(){const p=detectPlatform();document.documentElement.dataset.platform=p.id;$('platformLabel').textContent=p.label;document.title=`Undercover Party — ${p.label}`}
function bindReliableTap(element,handler){if(!element)return;let lastTouch=0,running=false;const invoke=e=>{if(e&&e.type==='touchend'){lastTouch=Date.now();if(e.cancelable)e.preventDefault()}else if(Date.now()-lastTouch<700)return;if(running)return;running=true;const active=document.activeElement;if(active&&/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName))try{active.blur()}catch(err){}requestAnimationFrame(()=>{try{handler(e)}finally{running=false}})};element.addEventListener('touchend',invoke,{passive:false});element.addEventListener('click',invoke);element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();invoke(e)}})}
function bindRecallHold(){const b=$('holdRecallBtn'),start=e=>{if(e.cancelable)e.preventDefault();showRecallWord()},end=e=>{if(e&&e.cancelable)e.preventDefault();hideRecallWord()};if('PointerEvent'in window){b.addEventListener('pointerdown',e=>{start(e);try{b.setPointerCapture(e.pointerId)}catch(err){}});['pointerup','pointercancel','lostpointercapture','pointerleave'].forEach(t=>b.addEventListener(t,end))}else{b.addEventListener('touchstart',start,{passive:false});['touchend','touchcancel'].forEach(t=>b.addEventListener(t,end,{passive:false}));b.addEventListener('mousedown',start);['mouseup','mouseleave'].forEach(t=>b.addEventListener(t,end))}b.addEventListener('contextmenu',e=>e.preventDefault())}
function registerServiceWorker(){if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn))}
function bindClick(id,handler){const el=$(id);if(el)el.onclick=handler}

OLD_NAME_KEYS.forEach(key=>safeStorage.removeItem(key));
document.querySelectorAll('[data-counter]').forEach(btn=>btn.addEventListener('click',()=>{const kind=btn.dataset.counter,dir=Number(btn.dataset.dir);if(kind==='players'){settings.players=clamp(settings.players+dir,4,20);settings.under=clamp(settings.under,1,Math.max(1,settings.players-3));settings.white=clamp(settings.white,0,Math.max(0,settings.players-settings.under-3))}else if(kind==='under')settings.under=clamp(settings.under+dir,1,Math.max(1,settings.players-settings.white-3));else settings.white=clamp(settings.white+dir,0,Math.max(0,settings.players-settings.under-3));updateSettingsUI()}));
bindClick('newGameBtn',()=>{pendingNames=[];groupDraft=[];updateSettingsUI();showScreen('setupScreen')});bindClick('backHomeBtn',()=>showScreen('homeScreen'));
$('categorySelect').onchange=e=>{settings.category=e.target.value;updatePoolStatus()};
bindClick('resetWordsBtn',()=>{safeStorage.removeItem(STORAGE_KEY);updatePoolStatus();$('resetWordsBtn').textContent='Historique réinitialisé ✓';setTimeout(()=>$('resetWordsBtn').textContent='Réinitialiser l’historique des mots',1400)});
bindReliableTap($('startNameEntryBtn'),beginNameEntry);bindReliableTap($('saveNameAndPassBtn'),saveCurrentName);bindReliableTap($('confirmOrderBtn'),()=>safeStartGameWithNames([...pendingNames]));
$('singleNameInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveCurrentName()}});$('singleNameInput').addEventListener('input',clearNameEntryError);
bindClick('cancelNameEntryBtn',()=>{pendingNames=[];nameEntryIndex=0;showScreen('setupScreen')});bindClick('restartNameEntryBtn',beginNameEntry);
bindClick('revealBtn',revealSecret);bindClick('hideAndPassBtn',hideAndPass);bindClick('forgotWordBtn',openRecallSelect);bindClick('cancelRecallBtn',()=>showScreen('playScreen'));bindClick('backRecallSelectBtn',openRecallSelect);bindClick('openRecallBtn',openRecallSecret);bindClick('finishRecallBtn',finishRecall);bindClick('eliminateBtn',eliminateSelected);bindClick('checkWhiteGuessBtn',checkWhiteGuess);bindClick('continueBtn',continueAfterElimination);
bindClick('samePlayersBtn',openGroupManager);bindClick('startWithGroupBtn',startWithManagedGroup);bindClick('backToResultsBtn',()=>showScreen('endScreen'));bindClick('resetBtn',()=>{pendingNames=[];groupDraft=[];updateSettingsUI();showScreen('setupScreen')});
bindRecallHold();document.addEventListener('visibilitychange',()=>{if(document.hidden)hideRecallWord()});addEventListener('pagehide',hideRecallWord);addEventListener('blur',hideRecallWord);addEventListener('orientationchange',()=>setTimeout(()=>scrollTo(0,0),180));
applyPlatformLabel();updateSettingsUI();registerServiceWorker();
