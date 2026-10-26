import { modules, lessons, cheats } from './curriculum.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1zm0 0v15"/>',
  chart: '<path d="M4 3v17h17M7 14l4-5 4 3 6-7"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  sparkles: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6zM20 2v4m-2-2h4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-1.2.8-1.8 1.3-1.8 3M12 17h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="m7 4 14 8-14 8z"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  lightbulb: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/>',
  leaf: '<path d="M20 3C8 2 3 9 5 16c7 5 16-1 15-13zM4 21 15 9"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.code}</svg>`;
function hydrateIcons(root = document) { $$('[data-icon]', root).forEach(el => el.innerHTML = icon(el.dataset.icon)); }
const STORAGE = 'r-lernstudio-v1';
let state = { completed: [], codes: {}, current: 'vectors', minutes: 0 };
let storageAvailable = true;
try { const data = JSON.parse(localStorage.getItem(STORAGE) || '{}'); state = {...state, ...data, completed: Array.isArray(data.completed) ? data.completed.filter(id=>lessons.some(l=>l.id===id)) : [], codes: data.codes && typeof data.codes==='object' ? data.codes : {}}; } catch { storageAvailable = false; }
function save() { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { storageAvailable = false; } updateStorageNotice(); }
function updateStorageNotice(){ const el=$('.local-save'); if(el && !storageAvailable) el.innerHTML='<span class="local-dot"></span>Nur für diese Sitzung gespeichert'; }
let activeView = 'lesson', currentLesson = lessons.find(l=>l.id===state.current)||lessons[0];
let expandedModules = new Set([currentLesson.module]);
let runtime, runtimeReady = false, runtimeLoading = false, runtimeError = '', runtimePromise, runtimeVersion = '';
let runtimeGeneration = 0;
let busy = false, runTicket = 0, checkPassed = false, currentOutput = '', currentImages = [], outputTab = 'console', practiceEnv, practiceShelter;
let importedFiles = new Set(['visitors.csv']);
let toastTimer;
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),3500); }
function filename(lesson=currentLesson) { return `${String(lessons.indexOf(lesson)+1).padStart(2,'0')}_${lesson.id}.R`; }
function renderSidebar() {
  $('#sidebar-count').textContent=`${state.completed.length} / ${lessons.length}`;
  $('#lesson-nav').innerHTML=modules.map((m, mi)=>`<div class="module-group ${expandedModules.has(mi)?'expanded':''}">
    <button class="module-heading" data-module="${mi}" aria-expanded="${expandedModules.has(mi)}"><span>${String(mi+1).padStart(2,'0')}</span>${m.name}<span class="module-chevron">›</span></button>
    <div class="module-lessons">${lessons.filter(l=>l.module===mi).map(l=>`<a class="lesson-link ${state.completed.includes(l.id)?'complete':''} ${activeView==='lesson'&&currentLesson.id===l.id?'current':''}" href="#lesson/${l.id}" ${activeView==='lesson'&&currentLesson.id===l.id?'aria-current="step"':''}><span class="lesson-dot"></span><span>${l.title}</span></a>`).join('')}</div>
  </div>`).join('');
  $$('.module-heading').forEach(b=>b.onclick=()=>{const mi=Number(b.dataset.module); expandedModules.has(mi)?expandedModules.delete(mi):expandedModules.add(mi);renderSidebar();});
  $$('.workspace-nav>a').forEach(a=>a.classList.toggle('active',a.dataset.view===activeView || (activeView==='lesson'&&a.dataset.view==='course')));
}
function welcome() {
  const done=state.completed.length;
  return `<section class="welcome-row" aria-label="Dein Lernfortschritt"><div class="welcome-copy"><p class="eyebrow">DEIN 1-TAGES-CRASHKURS</p><h1>Zeitreihen verstehen.<br><span class="heading-accent">Mit R <span class="hand-underline">selbst machen.</span></span></h1><p>Von deiner ersten Codezeile bis zur eigenen Prognose.<br>Schritt für Schritt. In deinem Tempo. Direkt im Browser.</p></div><div class="day-card"><div class="day-top">${icon('leaf')} DEIN ZIEL FÜR HEUTE</div><div class="day-progress">${done} <span>/ 18</span></div><p>Lektionen abgeschlossen</p><div class="progress-track" role="progressbar" aria-label="Kursfortschritt" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="18"><div class="progress-fill" style="width:${done/18*100}%"></div></div><div class="day-foot"><span>${Math.round(done/18*100)} % geschafft</span><span>Du schaffst das ↗</span></div></div></section>`;
}
function renderModuleTabs(){ return `<nav class="module-tabs" aria-label="Kursabschnitte">${modules.map((m,i)=>`<button class="module-tab ${i===currentLesson.module?'active':''}" data-tab-module="${i}" ${i===currentLesson.module?'aria-current="true"':''}><span>${String(i+1).padStart(2,'0')}</span>${m.short}</button>`).join('')}</nav>`; }
function editorMarkup(code, practice=false) {
 return `<div class="workspace"><div class="editor-titlebar"><span class="file-label"><span class="r-file">R</span>${practice?'playground.R':filename()}</span><button class="runtime-status loading" id="runtime-status" title="Status der R-Laufzeit"><span class="status-dot"></span>R wird geladen</button></div>
 <div class="editor-tools"><span class="editor-sub">DEIN CODE. DEIN EXPERIMENT.</span><div class="editor-tool-actions"><button class="icon-button" id="reset-code" title="Code zurücksetzen" aria-label="Code zurücksetzen">${icon('reset')}</button><button class="icon-button" id="copy-code" title="Code kopieren" aria-label="Code kopieren">${icon('copy')}</button><button class="icon-button" id="download-code" title="R-Datei herunterladen" aria-label="R-Datei herunterladen">${icon('download')}</button></div></div>
 <div class="editor-container"><pre class="line-numbers" id="line-numbers" aria-hidden="true"></pre><div class="editor-code-area"><pre class="code-highlight" id="code-highlight" aria-hidden="true"></pre><textarea class="code-input" id="code-editor" aria-label="R-Code bearbeiten" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off">${escapeHTML(code)}</textarea></div></div>
 <div class="editor-bottom"><span class="shortcut"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> zum Ausführen</span><button class="run-button" id="stop-code" hidden>${icon('close')}Abbrechen</button><button class="run-button" id="run-code">${icon('play')}Code ausführen</button></div>
 <div class="output-tabs" role="tablist" aria-label="R-Ergebnisse"><button class="output-tab active" id="console-tab" role="tab" aria-selected="true" aria-controls="console-pane">${icon('terminal')}Konsole</button><button class="output-tab" id="plot-tab" role="tab" aria-selected="false" aria-controls="plot-pane">${icon('chart')}Plots<span class="plot-count" id="plot-count">0</span></button><button class="clear-output" id="clear-output" title="Ausgabe leeren">Leeren</button></div>
 <div class="output-pane" id="console-pane" role="tabpanel" aria-labelledby="console-tab"><pre class="console-output console-empty" id="console-output"># Hier siehst du gleich, was dein Code macht.\n# Bereit für deinen ersten Versuch?\n<span style="color:#789861">&gt; </span><span class="console-empty">Deine R-Konsole wartet auf dich …</span></pre></div>
 <div class="output-pane" id="plot-pane" role="tabpanel" aria-labelledby="plot-tab" hidden><div class="plot-output" id="plot-output"><p class="empty-plot">Deine Grafik erscheint hier.<br>Probiere plot(visitors) aus.</p></div></div></div>
 <div class="workspace-caption"><span>${icon('shield')}Echtes R im Browser · Deine Daten bleiben bei dir</span><span>R + WebAssembly <span style="color:#8ca174">●</span></span></div>`;
}
function renderLesson(){
 const l=currentLesson, idx=lessons.indexOf(l); checkPassed=false;
 $('#breadcrumb-current').textContent=modules[l.module].short;
 $('#main').innerHTML=`${welcome()}${renderModuleTabs()}<div class="lesson-title-row"><div class="lesson-location"><span>LEKTION ${String(idx+1).padStart(2,'0')}</span><span>${modules[l.module].name}</span></div><div class="lesson-meta"><span>${icon('clock')}${l.time} Min.</span><span><i class="difficulty-dots"><i></i><i></i><i></i></i>${l.module===0?'Für Einsteiger':'Schritt für Schritt'}</span></div></div>
 <div class="lesson-grid"><section class="lesson-content" aria-labelledby="lesson-heading"><h2 id="lesson-heading">${l.title}</h2><p class="intro">${l.intro}</p><div class="section-micro">${icon('book')}DAS STECKT DAHINTER</div><div class="command-list">${l.commands.map((c,i)=>`<div class="command-item"><span class="step-num">${i+1}</span><div><div class="command-heading"><code class="command-token">${escapeHTML(c[0])}</code><h3>${c[1]}</h3></div><p>${escapeHTML(c[2])}</p></div></div>`).join('')}</div>
 <div class="task-card"><div class="task-label">${icon('code')}Jetzt bist du dran</div><p>${escapeHTML(l.task)}</p><div class="task-footer"><button class="hint-button" id="hint-button" aria-expanded="false">${icon('lightbulb')}Einen kleinen Tipp?</button><span class="task-badge">ÜBUNG ${String(idx+1).padStart(2,'0')}</span></div><div class="hint-content" id="hint-content" hidden>${escapeHTML(l.hint)}</div></div>
 ${l.note?`<p class="correction-note">${escapeHTML(l.note)}</p>`:''}<p class="reassurance">${icon('leaf')}Fehler sind Teil des Lernens. Hier kannst du nichts kaputtmachen.</p></section>
 <section class="code-workspace" aria-label="Interaktive R-Übung">${editorMarkup(state.codes[l.id]??l.starter)}</section></div>
 <div id="check-feedback" role="status" aria-live="polite"></div><div class="lesson-actions"><div class="lesson-actions-left"><button class="text-button" id="show-solution">${icon('book')}Lösung ansehen</button><button class="text-button" id="previous-lesson" ${idx===0?'hidden':''}>${icon('back')}Zurück</button></div><button class="primary-button" id="check-code">Lösung prüfen${icon('arrow')}</button><button class="primary-button" id="next-lesson" hidden>${idx===lessons.length-1?'Zum Lernpfad':'Weiter zur nächsten Lektion'}${icon('arrow')}</button></div>
 <div class="under-lesson"><a href="#cheatsheet">${icon('book')}Alle Befehle auf dem Spickzettel</a><span class="next-label">${idx<lessons.length-1?`Als Nächstes: ${lessons[idx+1].title}`:'Dein kompletter Analyse-Workflow ist das Ziel.'}</span></div>`;
 bindEditor();
 $$('[data-tab-module]').forEach(b=>b.onclick=()=>navigateLesson(lessons.find(x=>x.module===Number(b.dataset.tabModule)).id));
 $('#hint-button').onclick=()=>{const c=$('#hint-content');c.hidden=!c.hidden;$('#hint-button').setAttribute('aria-expanded',String(!c.hidden));};
 $('#show-solution').onclick=showSolution;
 $('#check-code').onclick=()=>execute(true);
 $('#previous-lesson').onclick=()=>navigateLesson(lessons[idx-1].id);
 $('#next-lesson').onclick=()=>{if(idx===lessons.length-1)location.hash='#course';else navigateLesson(lessons[idx+1].id);};
}
function renderCourse(){
 const mins=lessons.filter(l=>state.completed.includes(l.id)).reduce((a,l)=>a+l.time,0), total=lessons.reduce((a,l)=>a+l.time,0);
 $('#breadcrumb-current').textContent='Dein Lernpfad';
 $('#main').innerHTML=`<section class="page-header"><p class="eyebrow">VOM ERSTEN VEKTOR ZUR PROGNOSE</p><h1>Ein Tag. Ein klarer <span class="heading-accent">Lernpfad.</span></h1><p>Du musst nicht ganz R lernen. Du brauchst die richtigen Bausteine – in der richtigen Reihenfolge. Diese 18 Lektionen führen dich durch die Themen deiner Musterlösungen.</p></section><div class="overview-stats"><div class="stat-card"><span>DEIN FORTSCHRITT</span><strong>${state.completed.length} / 18</strong><p>erfolgreich geprüfte Lektionen</p></div><div class="stat-card"><span>DEIN LERNTAG</span><strong>7 Std. 5 Min.</strong><p>${total} Min. Inhalt · mit Pausen etwa 8 Std.</p></div><div class="stat-card"><span>DEIN NÄCHSTER SCHRITT</span><strong>${Math.round(mins/total*100)} %</strong><a class="text-button" href="#lesson/${state.current}">Hier weitermachen ${icon('arrow')}</a></div></div><div class="plan-grid">${modules.map((m,i)=>`<section class="plan-module"><div class="plan-module-head"><div class="module-icon">${icon(m.icon)}</div><div><h2>${String(i+1).padStart(2,'0')} · ${m.name}</h2><p>${m.time} · ${lessons.filter(l=>l.module===i&&state.completed.includes(l.id)).length} von 3 abgeschlossen</p></div></div>${lessons.filter(l=>l.module===i).map(l=>`<a class="plan-lesson" href="#lesson/${l.id}"><span class="plan-number">${state.completed.includes(l.id)?icon('check'):String(lessons.indexOf(l)+1).padStart(2,'0')}</span>${l.title}<span class="plan-time">${l.time} Min. →</span></a>`).join('')}</section>`).join('')}</div><p class="plan-break">Dein Tagesplan: Grundlagen & Daten am Vormittag, Trend & Stationarität nach einer Pause, Modelle & Prognosen am Nachmittag. Plane nach jedem Abschnitt 5–10 Minuten Pause ein. Die Zeiten sind Richtwerte, kein Countdown.</p><div class="download-row"><button id="download-course">${icon('download')} Alle Musterlösungen als .R</button><button id="reset-progress">Fortschritt zurücksetzen</button></div><p class="muted-note">Die Originaldatendateien wurden nicht mitgeliefert. Alle integrierten Reihen sind synthetische Übungsdaten. Die Kurslösungen sind an deine Unterlagen angelehnt; die Ergebnisse sind deshalb keine Reproduktion der Originalanalysen.</p>`;
 $('#download-course').onclick=downloadCourse;
 $('#reset-progress').onclick=()=>openModal('Neu anfangen?',`<p>Damit setzt du die abgeschlossenen Lektionen und deine gespeicherten Code-Entwürfe auf diesem Gerät zurück. Heruntergeladene Dateien bleiben erhalten.</p><div class="modal-actions"><button class="text-button" data-close>Abbrechen</button><button class="primary-button" id="confirm-reset">Fortschritt zurücksetzen</button></div>`,()=>{$('#confirm-reset').onclick=()=>{state={completed:[],codes:{},current:'vectors',minutes:0};save();closeModal();render();toast('Bereit für einen frischen Start.');};});
}
let cheatSearch='',cheatGroup='Alle';
function renderCheatsheet(){
 $('#breadcrumb-current').textContent='Spickzettel';
 $('#main').innerHTML=`<section class="page-header"><p class="eyebrow">WENIGER SUCHEN. MEHR VERSTEHEN.</p><h1>Die Befehle, die du <span class="heading-accent">wirklich brauchst.</span></h1><p>Dein Nachschlagewerk für die Übung und die Prüfung. Jeder Codeblock lässt sich kopieren oder direkt im freien Übungsraum ausprobieren.</p></section><div class="cheat-toolbar"><label class="search-field">${icon('search')}<input id="cheat-search" type="search" placeholder="Befehl oder Thema suchen …" aria-label="Spickzettel durchsuchen" value="${escapeHTML(cheatSearch)}"></label><button class="filter-chip ${cheatGroup==='Alle'?'active':''}" data-group="Alle">Alle</button><button class="filter-chip ${cheatGroup==='R-Grundlagen'?'active':''}" data-group="R-Grundlagen">Grundlagen</button><button class="filter-chip ${cheatGroup==='ARIMA & Diagnose'?'active':''}" data-group="ARIMA & Diagnose">ARIMA</button><button class="filter-chip ${cheatGroup==='Prognose'?'active':''}" data-group="Prognose">Prognose</button></div><div id="cheat-cards" class="cheat-grid"></div><p class="muted-note">Zusatzpakete: tseries::adf.test() benötigt das Paket tseries. Es ist in diesem Studio nicht enthalten; stats::PP.test() ist direkt verfügbar. windows() aus deinen Unterlagen ist Windows-spezifisch – hier werden Grafiken im Tab „Plots“ angezeigt.</p>`;
 $('#cheat-search').oninput=e=>{cheatSearch=e.target.value;renderCheatCards();};
 $$('[data-group]').forEach(b=>b.onclick=()=>{cheatGroup=b.dataset.group;$$('[data-group]').forEach(x=>x.classList.toggle('active',x===b));renderCheatCards();});
 renderCheatCards();
}
function renderCheatCards(){
 const results=cheats.map((c,i)=>({...c,i})).filter(c=>(cheatGroup==='Alle'||c.group===cheatGroup)&&`${c.code} ${c.desc} ${c.group}`.toLowerCase().includes(cheatSearch.toLowerCase()));
 $('#cheat-cards').innerHTML=results.length?results.map(c=>`<article class="cheat-card"><div class="cheat-card-top"><span class="cheat-group">${c.group}</span><button class="icon-button" data-copy-cheat="${c.i}" aria-label="Code kopieren">${icon('copy')}</button></div><pre>${highlight(c.code)}</pre><p>${escapeHTML(c.desc)}</p><button class="text-button" data-try-cheat="${c.i}">Im Übungsraum ausprobieren${icon('arrow')}</button></article>`).join(''):'<p class="muted-note">Kein Treffer. Versuche zum Beispiel „acf“, „Trend“ oder „Prognose“.</p>';
 $$('[data-copy-cheat]').forEach(b=>b.onclick=()=>copyText(cheats[Number(b.dataset.copyCheat)].code));
 $$('[data-try-cheat]').forEach(b=>b.onclick=()=>{state.codes.practice=cheats[Number(b.dataset.tryCheat)].code;save();location.hash='#practice';});
}
const practiceStarter='# Dein Raum zum Ausprobieren.\n# visitors, cpi und y sind bereits verfügbar.\n\nplot(visitors, col = "#227463", lwd = 2)\n\n# Was fällt dir an der Zeitreihe auf?\nsummary(visitors)';
function renderPractice(){
 $('#breadcrumb-current').textContent='Freies Üben';
 $('#main').innerHTML=`<section class="page-header practice-header"><div><p class="eyebrow">NEUGIER IST DEIN BESTES WERKZEUG</p><h1>Einfach mal <span class="heading-accent">ausprobieren.</span></h1><p>Keine Aufgabe, keine Bewertung. Echtes R und Platz für deine Ideen.</p></div><button class="primary-button secondary" id="upload-file">${icon('database')}Eigene Datei laden</button><input type="file" id="file-upload" accept=".csv,.txt,.dat,.tsv" hidden></section><div class="practice-grid"><aside class="practice-info"><h2>Deine Daten sind bereit.</h2><p>Diese synthetischen Reihen sind bereits geladen. Nutze sie, um die Befehle aus dem Kurs frei zu kombinieren.</p><span class="data-tag">ÜBUNGSDATEN · KEINE ORIGINALDATEN</span><div class="data-row"><strong>visitors</strong><span>96 Monate · 2018–2025<br>Besucherzahlen mit Trend & Saison</span></div><div class="data-row"><strong>cpi</strong><span>120 Monate · 2016–2025<br>Ein positiver Preisindex mit Trend</span></div><div class="data-row"><strong>y</strong><span>96 Monate · 2018–2025<br>Integrierte Reihe für ARIMA</span></div><div class="data-row"><strong>visitors.csv</strong><span>Mit read.table() einlesen.<br>skip = 2, header = TRUE, sep = ","</span></div><div class="download-row"><button id="download-data">CSV herunterladen</button></div><p id="uploaded-status">Eigene Dateien werden nur in den Speicher deines Browsers geladen. Pfad für read.table(): der angezeigte Dateiname. Nach Neuladen erneut importieren.</p></aside><section class="code-workspace" aria-label="Freier R-Editor">${editorMarkup(state.codes.practice??practiceStarter,true)}</section></div><p class="muted-note">Dein Code wird lokal gespeichert. R-Objekte bleiben im freien Übungsraum während dieser Sitzung erhalten; nach einem Neuladen werden nur die drei Übungsreihen wiederhergestellt. Zusatzpakete sind nicht vorinstalliert.</p>`;
 bindEditor();
 $('#upload-file').onclick=()=>$('#file-upload').click();
 $('#file-upload').onchange=uploadFile;
 $('#download-data').onclick=async()=>{if(await ensureRuntime()){try{download('visitors.csv',new TextDecoder().decode(await runtime.FS.readFile('/home/web_user/visitors.csv')),'text/csv');}catch(e){toast('Die CSV konnte nicht geladen werden. Bitte R neu starten.');}}};
}
function route(){
 const hash=location.hash.slice(1),[view,id]=hash.split('/');
 if(view==='lesson'&&lessons.some(l=>l.id===id)){activeView='lesson';currentLesson=lessons.find(l=>l.id===id);state.current=id;expandedModules.add(currentLesson.module);save();}
 else if(['course','practice','cheatsheet'].includes(view))activeView=view;
 else {activeView='lesson';currentLesson=lessons.find(l=>l.id===state.current)||lessons[0];}
 render();$('#sidebar').classList.remove('open');$('#mobile-menu').setAttribute('aria-expanded','false');window.scrollTo({top:0});
}
function render(){currentOutput='';currentImages.forEach(x=>x.close?.());currentImages=[];outputTab='console';renderSidebar();if(activeView==='lesson')renderLesson();else if(activeView==='course')renderCourse();else if(activeView==='practice')renderPractice();else renderCheatsheet();updateRuntimeStatus();updateBusy();}
function navigateLesson(id){location.hash=`#lesson/${id}`;}
function highlight(code){
 const regex=/(#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:TRUE|FALSE|NULL|NA|Inf|NaN|function|if|else|for|while|in)\b|\b\d+(?:\.\d+)?\b|[a-zA-Z_.][\w.]*(?=\s*\()|<-|\|>)/g;
 let last=0,html='',match;
 while((match=regex.exec(code))){html+=escapeHTML(code.slice(last,match.index));const s=match[0];const type=s.startsWith('#')?'comment':s.startsWith('"')||s.startsWith("'")?'string':/^\d/.test(s)?'number':s==='<-'||s==='|>'?'operator':/^(TRUE|FALSE|NULL|NA|Inf|NaN|function|if|else|for|while|in)$/.test(s)?'keyword':'function';html+=`<span class="syntax-${type}">${escapeHTML(s)}</span>`;last=regex.lastIndex;}
 return html+escapeHTML(code.slice(last))+'\n';
}
function syncEditor(){const e=$('#code-editor');if(!e)return;$('#code-highlight').innerHTML=highlight(e.value);$('#line-numbers').textContent=e.value.split('\n').map((_,i)=>i+1).join('\n');syncScroll();}
function syncScroll(){const e=$('#code-editor');if(!e)return;$('#code-highlight').scrollTop=e.scrollTop;$('#code-highlight').scrollLeft=e.scrollLeft;$('#line-numbers').scrollTop=e.scrollTop;}
function bindEditor(){
 const e=$('#code-editor');syncEditor();
 e.oninput=()=>{state.codes[activeView==='practice'?'practice':currentLesson.id]=e.value;save();syncEditor();invalidateCheck();};e.onscroll=syncScroll;
 e.onkeydown=ev=>{if(ev.key==='Tab'){ev.preventDefault();e.setRangeText('  ',e.selectionStart,e.selectionEnd,'end');e.dispatchEvent(new Event('input'));}};
 $('#run-code').onclick=()=>execute(false);
 $('#stop-code').onclick=stopExecution;
 $('#copy-code').onclick=()=>copyText(e.value);
 $('#download-code').onclick=()=>download(activeView==='practice'?'playground.R':filename(),e.value,'text/plain');
 $('#reset-code').onclick=()=>openModal('Code zurücksetzen?',`<p>Dein aktueller Entwurf wird durch den Startcode dieser Übung ersetzt. Dein Kursfortschritt bleibt erhalten.</p><div class="modal-actions"><button class="text-button" data-close>Abbrechen</button><button class="primary-button" id="confirm-code-reset">Zurücksetzen</button></div>`,()=>{$('#confirm-code-reset').onclick=()=>{setEditor(activeView==='practice'?practiceStarter:currentLesson.starter);closeModal();toast('Startcode wiederhergestellt.');};});
 $('#console-tab').onclick=()=>setOutputTab('console');$('#plot-tab').onclick=()=>setOutputTab('plot');
 $$('.output-tab').forEach(b=>b.onkeydown=ev=>{if(['ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();setOutputTab(outputTab==='console'?'plot':'console');$(`#${outputTab}-tab`).focus();}});
 $('#clear-output').onclick=()=>{currentOutput='';currentImages.forEach(i=>i.close?.());currentImages=[];$('#console-output').textContent='> Ausgabe geleert. Dein R-Code bleibt erhalten.';$('#console-output').className='console-output console-empty';$('#plot-output').innerHTML='<p class="empty-plot">Noch keine Grafik. Nutze plot(), acf() oder pacf().</p>';$('#plot-count').textContent='0';};
 $('#runtime-status').onclick=async()=>{if(!runtimeReady&&!runtimeLoading){await initRuntime();}};
 updateRuntimeStatus();
}
function invalidateCheck(){if(activeView==='lesson'){checkPassed=false;$('#check-feedback').innerHTML='';$('#check-feedback').className='';$('#next-lesson').hidden=true;$('#check-code').hidden=false;}}
function setEditor(code){const e=$('#code-editor');if(!e)return;e.value=code;e.dispatchEvent(new Event('input'));e.focus();}
function setOutputTab(tab){outputTab=tab;for(const t of ['console','plot']){$(`#${t}-tab`)?.classList.toggle('active',t===tab);$(`#${t}-tab`)?.setAttribute('aria-selected',String(t===tab));if($(`#${t}-pane`))$(`#${t}-pane`).hidden=t!==tab;}}
function showSolution(){const l=currentLesson;openModal('Ein möglicher Lösungsweg',`<p>Vergleiche den Code mit deinem Versuch. Versuche anschließend, die Übung noch einmal ohne Vorlage zu lösen.</p><pre class="solution-code">${highlight(l.solution)}</pre><div class="modal-actions"><button class="text-button" id="copy-solution">${icon('copy')}Kopieren</button><button class="primary-button" id="use-solution">In den Editor übernehmen${icon('arrow')}</button></div>`,()=>{$('#copy-solution').onclick=()=>copyText(l.solution);$('#use-solution').onclick=()=>{setEditor(l.solution);closeModal();toast('Lösung übernommen. Führe sie aus und schau dir das Ergebnis an.');};});}
function openModal(title,body,bind){$('#modal-content').innerHTML=`<div class="modal-inner"><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-close aria-label="Schließen">${icon('close')}</button></div>${body}</div>`;$$('[data-close]',$('#modal')).forEach(b=>b.onclick=closeModal);$('#modal').showModal();bind?.();}
function closeModal(){$('#modal').close();}
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Code kopiert.');}catch{const el=document.createElement('textarea');el.value=text;el.style.position='fixed';el.style.opacity='0';document.body.append(el);el.select();const ok=document.execCommand('copy');el.remove();toast(ok?'Code kopiert.':'Kopieren nicht möglich. Markiere den Code und kopiere ihn manuell.');}}
function download(name,content,type='text/plain'){const url=URL.createObjectURL(new Blob([content],{type:`${type};charset=utf-8`}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`${name} wird heruntergeladen.`);}
const seedCode=`set.seed(2026)\n.training_month <- 0:95\ntraining_visitors <- round(12000 + 65 * .training_month + 2900 * sin(2*pi*.training_month/12) + rnorm(96,0,460))\nvisitors <- ts(training_visitors, start=c(2018,1), frequency=12)\ncpi <- ts(100*exp(0.003*(0:119)) + rnorm(120,0,0.55), start=c(2016,1),frequency=12)\ny <- ts(60+cumsum(as.numeric(arima.sim(model=list(ma=-0.5),n=96))),start=c(2018,1),frequency=12)\n.course_calls <- function(x) { if (is.expression(x) || is.list(x)) return(unlist(lapply(x,.course_calls))); if (!is.call(x)) return(character()); c(if(is.symbol(x[[1]])) as.character(x[[1]]) else character(), unlist(lapply(as.list(x)[-1], .course_calls))) }\noptions(width=65, warn=1)\nwriteLines(c("# Synthetische Uebungsdaten: R Lernstudio", "# Monatsdaten 2018-2025"), "visitors.csv")\nsuppressWarnings(write.table(data.frame(month=sprintf("%d-%02d",rep(2018:2025,each=12),rep(1:12,8)),visitors=training_visitors),"visitors.csv",sep=",",row.names=FALSE,col.names=TRUE,append=TRUE))`;
async function initRuntime(){
 if(runtimeReady)return true;if(runtimeLoading)return runtimePromise;
 runtimeLoading=true;runtimeError='';updateRuntimeStatus();
 const generation=++runtimeGeneration;let instance;
 runtimePromise=(async()=>{
 try{
  const {WebR,ChannelType}=await import('./node_modules/webr/dist/webr.mjs');
  instance=new WebR({baseUrl:new URL('./node_modules/webr/dist/',import.meta.url).href,channelType:globalThis.crossOriginIsolated?ChannelType.SharedArrayBuffer:ChannelType.PostMessage,interactive:false});
  runtime=instance;
  await withTimeout(instance.init(),45000,'Das Laden von R dauert zu lange. Prüfe die Verbindung und versuche es erneut.');
  if(generation!==runtimeGeneration)return false;
  await withTimeout(instance.evalRVoid(seedCode),30000,'Die R-Übungsdaten konnten nicht vorbereitet werden. Bitte erneut laden.');
  if(generation!==runtimeGeneration)return false;
  runtimeVersion=await instance.evalRString('paste(R.version$major, R.version$minor, sep=".")');
  practiceShelter=await new runtime.Shelter();practiceEnv=await practiceShelter.evalR('new.env(parent=globalenv())');
  if(generation!==runtimeGeneration)return false;
  importedFiles=new Set(['visitors.csv']);
  runtimeReady=true;runtimeLoading=false;updateRuntimeStatus();return true;
 }catch(e){if(generation!==runtimeGeneration)return false;runtimeError=String(e.message||e);runtimeLoading=false;runtimeReady=false;try{runtime?.close();}catch{}updateRuntimeStatus();if($('#console-output')){$('#console-output').textContent=`R konnte nicht geladen werden.\n${runtimeError}\n\nKlicke oben auf „Erneut laden“. Stelle sicher, dass npm ci ausgeführt wurde und starte die Seite über den lokalen Server.`;$('#console-output').className='console-output console-error';}return false;}
 })();return runtimePromise;
}
async function ensureRuntime(){if(runtimeReady)return true;return initRuntime();}
function updateRuntimeStatus(){const el=$('#runtime-status');if(!el)return;el.className=`runtime-status ${runtimeReady?'ready':runtimeLoading?'loading':'error'}`;el.innerHTML=`<span class="status-dot"></span>${runtimeReady?`R ${runtimeVersion} bereit`:runtimeLoading?'R wird geladen …':'Erneut laden'}`;el.title=runtimeReady?'Echtes R läuft lokal in deinem Browser':runtimeError||'Die R-Laufzeit startet. Das erste Laden kann etwas dauern.';}
function withTimeout(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));}
function updateBusy(){const run=$('#run-code'),stop=$('#stop-code'),check=$('#check-code'),e=$('#code-editor');if(run){run.disabled=busy;run.innerHTML=busy?'<span class="loading-spinner"></span>R rechnet …':`${icon('play')}Code ausführen`;}if(stop)stop.hidden=!busy;if(check)check.disabled=busy;if(e)e.readOnly=busy;}
function feedback(success,message){const el=$('#check-feedback');if(!el)return;el.className=`check-feedback ${success?'success':'error'}`;el.innerHTML=`${icon(success?'checkCircle':'lightbulb')}<p>${escapeHTML(message)}</p>`;}
function friendlyError(error){const raw=String(error.message||error).replace(/^Error:\s*/,'');if(/unexpected|INCOMPLETE_STRING|parse error/i.test(raw))return `${raw}\n\nTipp: Prüfe Kommas, Anführungszeichen und geschlossene Klammern. Ein Platzhalter nach <- oder = braucht noch einen Wert.`;if(/not found|nicht gefunden/i.test(raw))return `${raw}\n\nTipp: Wurde die Variable schon angelegt? R unterscheidet Groß- und Kleinschreibung.`;if(/cannot open|No such file/i.test(raw))return `${raw}\n\nTipp: visitors.csv ist vorbereitet. Eigene Dateien kannst du im freien Übungsraum laden.`;return raw;}
async function execute(check=false){
 if(busy||!$('#code-editor'))return;
 const code=$('#code-editor').value,lesson=currentLesson,view=activeView,ticket=++runTicket;
 if(!code.trim()){toast('Schreibe zuerst etwas R-Code in den Editor.');return;}
 busy=true;updateBusy();let shelter;
 try{
  if(!await ensureRuntime())return;
  if(ticket!==runTicket)return;
  shelter=view==='practice'?practiceShelter:await new runtime.Shelter();
  const env=view==='practice'?practiceEnv:await shelter.evalR('new.env(parent=globalenv())');
  const res=await withTimeout(shelter.captureR(code,{env,withAutoprint:true,captureStreams:true,captureGraphics:{width:900,height:550,pointsize:14,bg:'white'},throwJsException:false}),20000,'Zeitlimit erreicht. Die R-Sitzung wird neu gestartet.');
  if(ticket!==runTicket){res.images.forEach(i=>i.close?.());return;}
  let hadError=false;
  const outputLines=[];
  for(const output of res.output){
   if(output.type==='stdout'||output.type==='stderr'){outputLines.push(String(output.data));continue;}
   if(['error','warning','message'].includes(output.type)){
    // webR returns R condition objects as proxies, not plain JS errors.
    let message;
    if(typeof output.data==='string')message=output.data;
    else if(typeof output.data?.get==='function')message=await (await output.data.get('message')).toString();
    else message=output.data?.message || 'Unbekannte R-Meldung';
    if(output.type==='error')hadError=true;
    outputLines.push((output.type==='error'?'Fehler: ':output.type==='warning'?'Hinweis: ':'')+message);
   }
  }
  currentOutput=outputLines.filter(Boolean).join('\n');
  if(!currentOutput)currentOutput=res.images.length?'Grafik erstellt. Du findest sie im Tab „Plots“.':'✓ Code ausgeführt. Eine Zuweisung speichert Werte, gibt sie aber nicht automatisch aus. Schreibe den Variablennamen in eine neue Zeile, um sie anzusehen.';
  if(hadError)currentOutput=friendlyError({message:currentOutput});
  if(activeView!==view||(view==='lesson'&&currentLesson.id!==lesson.id)){res.images.forEach(i=>i.close?.());return;}
  $('#console-output').textContent=currentOutput;$('#console-output').className=`console-output ${hadError?'console-error':''}`;
  currentImages.forEach(i=>i.close?.());currentImages=res.images;
  $('#plot-count').textContent=String(res.images.length);const plots=$('#plot-output');plots.replaceChildren();
  if(res.images.length){for(const im of res.images){const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`R-Grafik ${plots.children.length+1} aus deinem Code`);canvas.getContext('2d').drawImage(im,0,0);plots.append(canvas);}setOutputTab('plot');}else{plots.innerHTML='<p class="empty-plot">Noch keine Grafik. Nutze plot(), acf() oder pacf().</p>';setOutputTab('console');}
  if(check&&view==='lesson'){
   if(hadError){feedback(false,'Dein Code enthält noch einen Fehler. Schau in die Konsole – dort findest du einen Hinweis.');setOutputTab('console');return;}
   const calls=lesson.required||[];
   const checkExpr=`isTRUE(tryCatch({(${lesson.check}) && all(${calls.length?`c(${calls.map(c=>JSON.stringify(c)).join(',')})`:'character()'} %in% .course_calls(parse(text=${JSON.stringify(code)})))}, error=function(e) FALSE))`;
   const passed=await runtime.evalRBoolean(checkExpr,{env});
   checkPassed=passed;
   if(passed){if(!state.completed.includes(lesson.id)){state.completed.push(lesson.id);save();}feedback(true,lesson.success);renderSidebar();updateProgressCard();$('#check-code').hidden=true;$('#next-lesson').hidden=false;toast('Geschafft! Dein Fortschritt wurde gespeichert.');}
   else{feedback(false,'Noch nicht ganz. Prüfe die Variablennamen, die geforderten Werte und ob alle Schritte der Aufgabe im Code stehen. Dein Tipp hilft dir beim nächsten Versuch.');}
  }
 }catch(e){if(ticket!==runTicket)return;if(activeView===view&&$('#console-output')){$('#console-output').textContent=friendlyError(e);$('#console-output').className='console-output console-error';setOutputTab('console');if(check&&activeView==='lesson')feedback(false,'Der Code konnte noch nicht erfolgreich geprüft werden. Schau dir den Hinweis in der Konsole an.');}if(/Zeitlimit/.test(e.message)){stopExecution(false);toast('Die lange Berechnung wurde beendet. R wird neu geladen.');await initRuntime();}}
 finally{if(shelter&&shelter!==practiceShelter){try{await shelter.purge();}catch{}}if(ticket===runTicket){busy=false;updateBusy();}}
}
function updateProgressCard(){const d=$('.day-progress');if(d){d.innerHTML=`${state.completed.length} <span>/ 18</span>`;$('.progress-fill').style.width=`${state.completed.length/18*100}%`;$('[role="progressbar"]').setAttribute('aria-valuenow',state.completed.length);$('.day-foot>span').textContent=`${Math.round(state.completed.length/18*100)} % geschafft`;}}
function stopExecution(restart=true){++runTicket;++runtimeGeneration;try{runtime?.close();}catch{}runtimeReady=false;runtimeLoading=false;practiceEnv=null;practiceShelter=null;busy=false;updateBusy();updateRuntimeStatus();if($('#console-output')){$('#console-output').textContent='Berechnung abgebrochen. Die R-Sitzung wurde beendet; deine Code-Entwürfe bleiben gespeichert.';setOutputTab('console');}if(restart){toast('Berechnung beendet. R startet mit frischen Übungsdaten.');initRuntime();}}
async function uploadFile(event){const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024){toast('Bitte verwende eine Textdatei mit höchstens 5 MB.');return;}if(!await ensureRuntime())return;const name=file.name.replace(/[^a-zA-Z0-9_.-]/g,'_');if(importedFiles.has(name)){toast('Dieser Dateiname ist bereits belegt. Benenne deine Datei vor dem Laden um.');event.target.value='';return;}try{await runtime.FS.writeFile(`/home/web_user/${name}`,new Uint8Array(await file.arrayBuffer()));importedFiles.add(name);$('#uploaded-status').textContent=`Geladen: ${name}. Verwende read.table("${name}", header = TRUE, sep = ";") und passe Trennzeichen, Dezimalzeichen und Kopfzeile an deine Datei an. Die Datei bleibt bis zum Neustart von R verfügbar.`;toast(`${name} ist jetzt in R verfügbar.`);}catch{toast('Die Datei konnte nicht geladen werden. Bitte versuche es erneut.');}}
function downloadCourse(){const text=`# R Lernstudio – Musterloesungen\n# Synthetische Uebungsdaten, nicht die Originaldateien aus dem Kurs.\n# Ausfuehrbar in Base R. Dateien werden im Arbeitsverzeichnis erzeugt.\n\n${seedCode}\n\n${lessons.map((l,i)=>`# ${'='.repeat(58)}\n# ${i+1}. ${l.title}\n# ${l.task}\n${l.note?'# HINWEIS: '+l.note+'\n':''}${l.solution}\n\n# Basisreihen fuer die naechste unabhaengige Aufgabe wiederherstellen\nvisitors <- ts(training_visitors, start=c(2018,1),frequency=12)\n`).join('\n')}`;download('r-lernstudio-musterloesungen.R',text);}
function showSearch(){openModal('Was möchtest du lernen?',`<label class="search-field">${icon('search')}<input id="global-search" placeholder="Lektion, Befehl oder Thema suchen …" aria-label="Lektionen durchsuchen" autocomplete="off"></label><div class="search-results" id="search-results"></div>`,()=>{const search=$('#global-search');const update=()=>{const q=search.value.toLowerCase();const results=lessons.filter(l=>`${l.title} ${l.intro} ${l.commands.flat().join(' ')}`.toLowerCase().includes(q));$('#search-results').innerHTML=results.length?results.map(l=>`<a class="search-result" href="#lesson/${l.id}">${icon(modules[l.module].icon)}${l.title}<span>${l.time} Min. →</span></a>`).join(''):'<p class="muted-note">Keine passende Lektion gefunden.</p>';$$('.search-result').forEach(a=>a.onclick=closeModal);};search.oninput=update;update();search.focus();});}
$('#search-trigger').onclick=showSearch;
$('#help-button').onclick=()=>openModal('Schön, dass du da bist.',`<p>Du brauchst keine R-Vorkenntnisse. Arbeite dich von oben nach unten durch den Lernpfad – oder springe zu einem Thema, das du wiederholen möchtest.</p><ul><li><strong>Lesen:</strong> Links werden die Befehle erklärt. In der grünen Karte steht deine Aufgabe.</li><li><strong>Ausprobieren:</strong> Bearbeite den R-Code rechts. „Code ausführen“ oder Ctrl/⌘ + Enter berechnet das Ergebnis.</li><li><strong>Verstehen:</strong> In der Konsole stehen Werte und Fehlermeldungen. Grafiken erscheinen unter „Plots“.</li><li><strong>Prüfen:</strong> „Lösung prüfen“ kontrolliert die Ergebnisse. Nur erfolgreich geprüfte Übungen zählen zum Fortschritt.</li><li><strong>Nachschlagen:</strong> Tipps und Musterlösungen helfen dir weiter. Mit Ctrl/⌘ + K suchst du im Kurs.</li></ul><p>Deine Entwürfe und dein Fortschritt werden lokal in diesem Browser gespeichert. Nutze den Download-Button für eine zusätzliche Kopie deines Codes. R läuft vollständig im Browser, ohne Daten an einen R-Server zu senden.</p><div class="modal-actions"><button class="primary-button" data-close>Los geht’s${icon('arrow')}</button></div>`);
$('#mobile-menu').onclick=()=>{const open=$('#sidebar').classList.toggle('open');$('#mobile-menu').setAttribute('aria-expanded',String(open));};
document.addEventListener('click',e=>{if(window.innerWidth<=700&&!$('#sidebar').contains(e.target)&&!$('#mobile-menu').contains(e.target)){$('#sidebar').classList.remove('open');$('#mobile-menu').setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#modal').open)showSearch();}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&!$('#modal').open&&$('#code-editor')){e.preventDefault();execute(false);}if(e.key==='Escape'){$('#sidebar').classList.remove('open');$('#mobile-menu').setAttribute('aria-expanded','false');}});
setInterval(()=>{if(document.visibilityState==='visible'){state.minutes=(Number(state.minutes)||0)+1;save();}},60000);
window.addEventListener('hashchange',route);
hydrateIcons();route();updateStorageNotice();initRuntime();
