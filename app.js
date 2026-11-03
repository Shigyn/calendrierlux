// Lux — un petit calendrier. Tout marche d'abord dans le navigateur, sans attendre ; une copie part ensuite au serveur, derriere le code.
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lire = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var ecrire = function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };

  var LUX = '<svg viewBox="0 0 64 64" aria-hidden="true" width="100%" height="100%">' +
    '<defs>' +
    '<radialGradient id="lux-g" cx=".78" cy=".32" r=".95"><stop offset="0" stop-color="#fff200"/><stop offset=".3" stop-color="#e9b400"/><stop offset=".62" stop-color="#6fa512"/><stop offset="1" stop-color="#2f6b08"/></radialGradient>' +
    '<radialGradient id="lux-d" cx=".22" cy=".32" r=".95"><stop offset="0" stop-color="#fff200"/><stop offset=".3" stop-color="#e9b400"/><stop offset=".62" stop-color="#6fa512"/><stop offset="1" stop-color="#2f6b08"/></radialGradient>' +
    '<radialGradient id="lux-c" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#ffe600"/><stop offset=".45" stop-color="#c9a400"/><stop offset=".8" stop-color="#3f7a08"/><stop offset="1" stop-color="#123f05"/></radialGradient>' +
    '<radialGradient id="lux-t" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#c9df3a"/><stop offset=".55" stop-color="#4f9410"/><stop offset="1" stop-color="#17520a"/></radialGradient>' +
    '</defs>' +
    '<g fill="none" stroke="#6fa51a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 16L13.5 9.5 7 5 3.2 4.2 2.6 1.8M46 16l4.5-6.5L57 5l3.8-.8.6-2.4"/>' +
    '<path d="M12 24.5L10.5 22 6 28 2 30.5 3.5 32.5M52 24.5l1.5-2.5 4.5 6 4 2.5-1.5 2"/>' +
    '<path d="M12 43L8.5 44.5 10 52.5 7.5 58 9.5 61.5M52 43l3.5 1.5L54 52.5l2.5 5.5-2 3.5"/>' +
    '<path d="M27.5 5.5V1.8M36.5 5.5V1.8" stroke-width="1.7"/></g>' +
    '<path d="M22.5 15.5C22.5 8.6 27 4.6 32 4.6s9.5 4 9.5 10.9z" fill="url(#lux-t)" stroke="#2f6b08" stroke-width=".7"/>' +
    '<path d="M31.6 23.6C21 23 11 26.5 10.8 37.5 10.7 49.5 21 58.6 31.6 58.8z" fill="url(#lux-g)" stroke="#3f7a05" stroke-width=".7"/>' +
    '<path d="M32.4 23.6C43 23 53 26.5 53.2 37.5 53.3 49.5 43 58.6 32.4 58.8z" fill="url(#lux-d)" stroke="#3f7a05" stroke-width=".7"/>' +
    '<path d="M32 24v35" stroke="#0d1f03" stroke-width="1.5"/>' +
    '<ellipse cx="32" cy="18.8" rx="15.8" ry="7" fill="url(#lux-c)" stroke="#123f05" stroke-width=".8"/></svg>';

  var STICKERS = [
    { e: '🪲', n: 'Autre' }, { e: '🎂', n: 'Anniv.' }, { e: '🩺', n: 'Santé' }, { e: '💼', n: 'Travail' }, { e: '🎉', n: 'Fête' },
    { e: '✈️', n: 'Voyage' }, { e: '🏠', n: 'Maison' }, { e: '💗', n: 'Amour' }, { e: '🍽️', n: 'Repas' }, { e: '🏃', n: 'Sport' },
  ];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var REPETE = { semaine: 'chaque semaine', mois: 'chaque mois', an: 'chaque année' };

  /* ---------- les dates, en texte AAAA-MM-JJ : jamais de souci de fuseau ---------- */
  var deux = function (n) { return (n < 10 ? '0' : '') + n; };
  var versIso = function (a, m, j) { return a + '-' + deux(m + 1) + '-' + deux(j); };
  var isoDe = function (d) { return versIso(d.getFullYear(), d.getMonth(), d.getDate()); };
  var dateDe = function (iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); };
  var ajoute = function (iso, n) { var d = dateDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };
  var ecart = function (a, b) { return Math.round((dateDe(b) - dateDe(a)) / 86400000); };
  var dernierJour = function (a, m) { return new Date(a, m + 1, 0).getDate(); };
  var aujourdhui = function () { return isoDe(new Date()); };
  var lundiDe = function (iso) { return ajoute(iso, -((dateDe(iso).getDay() + 6) % 7)); };
  var dateLongue = function (iso) { var d = dateDe(iso); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; };
  var heureDite = function (h) { return h ? h.replace(':', ' h ').replace(/ h 00$/, ' h') : ''; };
  var sansAccent = function (s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };

  /* ---------- les donnees ---------- */
  var CLE = 'calendrierlux-v1';
  var donnees = { evenements: [], taches: {}, supprimes: {} };
  var memoireOk = true;
  try {
    var lu = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (lu && Array.isArray(lu.evenements)) donnees = { evenements: lu.evenements, taches: lu.taches || {}, supprimes: lu.supprimes || {} };
  } catch (e) { memoireOk = false; }
  function ecrireMemoire() {
    try { localStorage.setItem(CLE, JSON.stringify(donnees)); }
    catch (e) { toast('Enregistrement impossible : ce navigateur bloque la mémoire.'); }
  }
  // L'empreinte de chaque element : comparer suffit a savoir ce qui a change, sans y penser a chaque geste.
  function aplatir() {
    var m = {};
    donnees.evenements.forEach(function (e) { m[e.id] = { o: e, j: '' }; });
    Object.keys(donnees.taches).forEach(function (j) { donnees.taches[j].forEach(function (t) { m[t.id] = { o: t, j: j }; }); });
    return m;
  }
  var empreinte = function (x) { var c = Object.assign({}, x.o); delete c.maj; return JSON.stringify(c) + x.j; };
  var empreintes = {};
  function photographier() {
    var m = aplatir();
    empreintes = {};
    Object.keys(m).forEach(function (id) { empreintes[id] = empreinte(m[id]); });
  }
  photographier();
  var versionLocale = 0;
  function garder() {
    var m = aplatir(), now = Date.now();
    Object.keys(m).forEach(function (id) {
      if (empreintes[id] !== empreinte(m[id])) { m[id].o.maj = now; delete donnees.supprimes[id]; }
    });
    Object.keys(empreintes).forEach(function (id) { if (!m[id]) donnees.supprimes[id] = now; });
    photographier();
    ecrireMemoire();
    versionLocale++;
    prevoirSauvegarde();
  }
  var nouvelId = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

  // Ce qui n'a pas ete fait les jours passes revient tout seul aujourd'hui.
  function reporterTaches() {
    var auj = aujourdhui(), bouge = false;
    Object.keys(donnees.taches).forEach(function (iso) {
      if (iso >= auj) return;
      var reste = [];
      donnees.taches[iso].forEach(function (t) {
        if (t.fait) { reste.push(t); return; }
        t.depuis = t.depuis || iso;
        (donnees.taches[auj] = donnees.taches[auj] || []).push(t);
        bouge = true;
      });
      if (reste.length) donnees.taches[iso] = reste; else delete donnees.taches[iso];
    });
    if (bouge) garder();
  }

  /* ---------- les jours feries francais ---------- */
  var feriesCache = {};
  function feries(a) {
    if (feriesCache[a]) return feriesCache[a];
    // Paques : algorithme de Meeus.
    var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3);
    var i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451);
    var mois = Math.floor((i + m - 7 * n + 114) / 31), jour = ((i + m - 7 * n + 114) % 31) + 1;
    var paques = versIso(a, mois - 1, jour);
    var t = {};
    t[a + '-01-01'] = 'Jour de l’an';
    t[ajoute(paques, 1)] = 'Lundi de Pâques';
    t[a + '-05-01'] = 'Fête du travail';
    t[a + '-05-08'] = 'Victoire 1945';
    t[ajoute(paques, 39)] = 'Ascension';
    t[ajoute(paques, 50)] = 'Lundi de Pentecôte';
    t[a + '-07-14'] = 'Fête nationale';
    t[a + '-08-15'] = 'Assomption';
    t[a + '-11-01'] = 'Toussaint';
    t[a + '-11-11'] = 'Armistice';
    t[a + '-12-25'] = 'Noël';
    feriesCache[a] = t;
    return t;
  }
  var ferieDe = function (iso) { return feries(+iso.slice(0, 4))[iso] || ''; };

  /* ---------- les vacances scolaires : dates du ministere, jusqu'a l'ete 2028 (debut inclus, reprise exclue) ---------- */
  var VAC_TOUS = [
    ['2026-10-17', '2026-11-02', 'Vacances de la Toussaint'], ['2026-12-19', '2027-01-04', 'Vacances de Noël'],
    ['2027-05-07', '2027-05-08', 'Pont de l’Ascension'], ['2027-07-03', '2027-09-02', 'Vacances d’été'],
    ['2027-10-23', '2027-11-08', 'Vacances de la Toussaint'], ['2027-12-18', '2028-01-03', 'Vacances de Noël'],
    ['2028-05-25', '2028-05-29', 'Pont de l’Ascension'], ['2028-07-04', '2028-09-01', 'Vacances d’été'],
  ];
  var VAC_ZONE = {
    A: [['2027-02-13', '2027-03-01', 'Vacances d’hiver'], ['2027-04-10', '2027-04-26', 'Vacances de printemps'], ['2028-02-19', '2028-03-06', 'Vacances d’hiver'], ['2028-04-22', '2028-05-09', 'Vacances de printemps']],
    B: [['2027-02-20', '2027-03-08', 'Vacances d’hiver'], ['2027-04-17', '2027-05-03', 'Vacances de printemps'], ['2028-02-05', '2028-02-21', 'Vacances d’hiver'], ['2028-04-08', '2028-04-24', 'Vacances de printemps']],
    C: [['2027-02-06', '2027-02-22', 'Vacances d’hiver'], ['2027-04-03', '2027-04-19', 'Vacances de printemps'], ['2028-02-12', '2028-02-28', 'Vacances d’hiver'], ['2028-04-15', '2028-05-02', 'Vacances de printemps']],
  };
  var zone = lire('lux-zone');
  if (zone === null) zone = 'C';
  function vacancesDe(iso) {
    if (!zone) return '';
    var liste = VAC_TOUS.concat(VAC_ZONE[zone] || []);
    for (var i = 0; i < liste.length; i++) if (iso >= liste[i][0] && iso < liste[i][1]) return liste[i][2];
    return '';
  }

  /* ---------- quand revient un evenement ---------- */
  function tombeLe(ev, iso) {
    if (iso < ev.date) return false;
    if (ev.repete === 'semaine') return ecart(ev.date, iso) % 7 === 0;
    if (ev.repete === 'mois' || ev.repete === 'an') {
      var b = ev.date.split('-'), p = iso.split('-');
      if (ev.repete === 'an' && b[1] !== p[1]) return false;
      // Le 31 un mois de 30 jours, le 29 fevrier hors bissextile : le dernier jour du mois.
      return +p[2] === Math.min(+b[2], dernierJour(+p[0], +p[1] - 1));
    }
    return ev.date === iso;
  }
  function evenementsDu(iso) {
    return donnees.evenements.filter(function (ev) { return tombeLe(ev, iso); })
      .sort(function (a, b) { return (a.heure || '99').localeCompare(b.heure || '99') || a.titre.localeCompare(b.titre, 'fr'); });
  }
  var tachesDu = function (iso) { return donnees.taches[iso] || []; };
  // La prochaine fois, a partir d'aujourd'hui, sur un peu plus d'un an.
  function prochaineFois(ev) {
    var auj = aujourdhui();
    if (!ev.repete || ev.repete === 'non') return ev.date >= auj ? ev.date : null;
    var depart = ev.date > auj ? ev.date : auj;
    for (var i = 0; i < 370; i++) { var iso = ajoute(depart, i); if (tombeLe(ev, iso)) return iso; }
    return null;
  }
  // « Anniversaire de Léa, 7 ans »
  function titreDe(ev, iso) {
    var age = ev.naissance ? +iso.slice(0, 4) - +ev.naissance : 0;
    return ev.titre + (age > 0 ? ', ' + age + ' an' + (age > 1 ? 's' : '') : '');
  }

  /* ---------- l'etat ---------- */
  var choisi = aujourdhui();
  var mode = lire('lux-vue') === 'semaine' ? 'semaine' : 'mois';
  var periode = function () { return mode === 'semaine' ? lundiDe(choisi) : choisi.slice(0, 7); };
  var periodeVue = '';

  /* ---------- le calendrier ---------- */
  var grille = $('[data-grille]');
  var luxEl = document.createElement('div');
  luxEl.className = 'lux'; luxEl.innerHTML = LUX;

  function dessinerMois(sautille) {
    var a = +choisi.slice(0, 4), m = +choisi.slice(5, 7) - 1, enSemaine = mode === 'semaine';
    var depart, total;
    if (enSemaine) {
      depart = lundiDe(choisi); total = 7;
      var fin = ajoute(depart, 6), d1 = dateDe(depart), d2 = dateDe(fin);
      $('[data-titre-mois]').textContent = d1.getDate() + (d1.getMonth() === d2.getMonth() ? '' : ' ' + MOIS[d1.getMonth()]) + ' – ' + d2.getDate() + ' ' + MOIS[d2.getMonth()];
      $('[data-titre-annee]').textContent = d2.getFullYear();
    } else {
      var decalage = (new Date(a, m, 1, 12).getDay() + 6) % 7;
      depart = ajoute(versIso(a, m, 1), -decalage);
      total = Math.ceil((decalage + dernierJour(a, m)) / 7) * 7;
      $('[data-titre-mois]').textContent = MOIS[m];
      $('[data-titre-annee]').textContent = a;
    }
    $('[data-mois]').setAttribute('data-mode', mode);
    grille.classList.toggle('en-semaine', enSemaine);
    document.querySelectorAll('[data-vue]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-vue') === mode)); });
    var auj = aujourdhui();
    var html = '';
    for (var i = 0; i < total; i++) {
      var iso = ajoute(depart, i), d = dateDe(iso), jour = d.getDay();
      var evs = evenementsDu(iso), max = enSemaine ? 99 : 3;
      var ferie = ferieDe(iso), vac = vacancesDe(iso);
      var cls = ['case'];
      if (!enSemaine && d.getMonth() !== m) cls.push('dehors');
      if (jour === 0 || jour === 6) cls.push('weekend');
      if (ferie) cls.push('ferie');
      if (vac) cls.push('vacances');
      if (iso === auj) cls.push('aujourdhui');
      if (iso === choisi) cls.push('choisie');
      var aFaire = tachesDu(iso).filter(function (t) { return !t.fait; }).length;
      var dit = dateLongue(iso) + (evs.length ? ', ' + evs.length + ' événement' + (evs.length > 1 ? 's' : '') : '') + (aFaire ? ', ' + aFaire + ' à faire' : '') + (ferie ? ', ' + ferie : '') + (vac ? ', ' + vac : '');
      html += '<button type="button" class="' + cls.join(' ') + '" data-jour="' + iso + '" aria-label="' + esc(dit) + '"' + (iso === choisi ? ' aria-current="date"' : '') + '>' +
        (enSemaine ? '<span class="nom-jour">' + JOURS[jour].slice(0, 3) + '</span>' : '') +
        '<span class="num">' + d.getDate() + '</span>' +
        (evs.length || ferie ? '<span class="pastilles">' + (ferie ? '<span class="pastille ferie-mot"><span class="pastille-texte">' + esc(ferie) + '</span></span>' : '') + evs.slice(0, max).map(function (ev) {
          return '<span class="pastille">' + esc(ev.sticker || '🪲') + ' <span class="pastille-texte">' + (enSemaine && ev.heure ? '<b>' + heureDite(ev.heure) + '</b> ' : '') + esc(titreDe(ev, iso)) + '</span></span>';
        }).join('') + (evs.length > max ? '<span class="encore">+ ' + (evs.length - max) + '</span>' : '') + '</span>' : '') +
        (aFaire ? '<span class="tache-point" aria-hidden="true"></span>' : '') + '</button>';
    }
    grille.innerHTML = html;
    grille.appendChild(luxEl);
    periodeVue = periode();
    placerLux(sautille);
  }

  /* Lux se pose sur le coin du jour choisi, en sautant depuis l'ancien. */
  var luxPos = null;
  function placerLux(sautille) {
    var c = grille.querySelector('[data-jour="' + choisi + '"]');
    if (!c) return;
    var l = luxEl.offsetWidth;
    var x = c.offsetLeft + c.offsetWidth - l * .72, y = c.offsetTop - l * .36;
    var vers = 'translate(' + x + 'px,' + y + 'px)';
    if (sautille && luxPos && !calme && luxEl.animate) {
      var haut = Math.min(luxPos.y, y) - 34;
      luxEl.animate([
        { transform: 'translate(' + luxPos.x + 'px,' + luxPos.y + 'px) scale(1,1)' },
        { transform: 'translate(' + (luxPos.x + x) / 2 + 'px,' + haut + 'px) rotate(14deg) scale(1.1,1.1)', offset: .5 },
        { transform: vers + ' scale(1.14,.86)', offset: .86 },
        { transform: vers + ' scale(1,1)' },
      ], { duration: 420, easing: 'ease-in-out' });
    }
    luxEl.style.transform = vers;
    luxPos = { x: x, y: y };
  }

  /* ---------- le jour choisi ---------- */
  function phrase(iso, evs, taches) {
    var restant = taches.filter(function (t) { return !t.fait; }).length;
    var anniv = evs.filter(function (e) { return e.sticker === '🎂'; })[0];
    if (anniv) return 'Pensez-y : ' + titreDe(anniv, iso) + ' !';
    var quand = iso === aujourdhui() ? 'Aujourd’hui' : iso === ajoute(aujourdhui(), 1) ? 'Demain' : 'Ce jour-là';
    if (!evs.length && !restant) return quand + ', rien de prévu.';
    var morceaux = [];
    if (evs.length) morceaux.push(evs.length + ' événement' + (evs.length > 1 ? 's' : ''));
    if (restant) morceaux.push(restant + ' chose' + (restant > 1 ? 's' : '') + ' à faire');
    return quand + ' : ' + morceaux.join(' et ') + '.';
  }
  function dessinerJour() {
    var evs = evenementsDu(choisi), taches = tachesDu(choisi);
    $('[data-jour-titre]').textContent = dateLongue(choisi);
    var f = ferieDe(choisi), fe = $('[data-jour-ferie]');
    fe.hidden = !f; fe.textContent = f;
    var v = vacancesDe(choisi), ve = $('[data-jour-vacances]');
    ve.hidden = !v; ve.textContent = v ? v + ' · zone ' + zone : '';
    $('[data-jour-phrase]').textContent = phrase(choisi, evs, taches);
    $('[data-jour-evenements]').innerHTML = evs.length ? '<ul class="evenements">' + evs.map(function (ev) {
      var sous = [heureDite(ev.heure), REPETE[ev.repete] || '', ev.rappel !== undefined && ev.rappel !== '' ? '🔔' : ''].filter(Boolean).join(' · ');
      return '<li><button type="button" class="evenement" data-ouvrir="' + esc(ev.id) + '"><span class="sticker">' + esc(ev.sticker || '🪲') + '</span><span><b>' + esc(titreDe(ev, choisi)) + '</b>' +
        (sous ? '<small>' + esc(sous) + '</small>' : '') + (ev.note ? '<small>' + esc(ev.note) + '</small>' : '') + '</span></button></li>';
    }).join('') + '</ul>' : '';
    $('[data-taches]').innerHTML = taches.map(function (t) {
      var depuis = t.depuis && !t.fait ? dateDe(t.depuis) : null;
      return '<li class="' + (t.fait ? 'fait' : '') + '"><label><input type="checkbox" data-tache="' + esc(t.id) + '"' + (t.fait ? ' checked' : '') + '><span>' + esc(t.t) + (depuis ? ' <small>depuis le ' + depuis.getDate() + ' ' + MOIS[depuis.getMonth()] + '</small>' : '') + '</span></label>' +
        '<button type="button" class="tache-suppr" data-tache-suppr="' + esc(t.id) + '" aria-label="Retirer ' + esc(t.t) + '">×</button></li>';
    }).join('');
  }

  /* ---------- bientot : les 90 prochains jours ---------- */
  function dessinerBientot() {
    // Seulement la prochaine fois de chaque evenement : la piscine du mercredi ne prend pas toute la liste.
    var auj = aujourdhui(), res = [], vus = {};
    for (var i = 0; i < 90 && res.length < 6; i++) {
      var iso = ajoute(auj, i);
      evenementsDu(iso).forEach(function (ev) {
        if (res.length < 6 && !vus[ev.id]) { vus[ev.id] = true; res.push({ ev: ev, iso: iso, dans: i }); }
      });
    }
    var zoneListe = $('[data-bientot]');
    zoneListe.innerHTML = res.length ? res.map(function (r) {
      var quand = r.dans === 0 ? 'aujourd’hui' : r.dans === 1 ? 'demain' : 'dans ' + r.dans + ' jours';
      return '<li><button type="button" data-aller="' + r.iso + '"><span class="sticker">' + esc(r.ev.sticker || '🪲') + '</span><span class="quoi">' + esc(titreDe(r.ev, r.iso)) + '</span><span class="dans">' + quand + '</span></button></li>';
    }).join('') : '<li class="vide">Rien dans les 3 prochains mois.</li>';
  }

  /* ---------- le compte a rebours : le plus proche de ceux qu'on a coches ---------- */
  function dessinerDecompte() {
    var el = $('[data-decompte]'), mieux = null;
    donnees.evenements.forEach(function (ev) {
      if (!ev.decompte) return;
      var iso = prochaineFois(ev);
      if (iso && (!mieux || iso < mieux.iso)) mieux = { ev: ev, iso: iso };
    });
    el.hidden = !mieux;
    document.body.classList.toggle('a-decompte', !!mieux);
    if (!mieux) return;
    var n = ecart(aujourdhui(), mieux.iso), t = esc(titreDe(mieux.ev, mieux.iso));
    el.setAttribute('data-aller', mieux.iso);
    el.innerHTML = n === 0 ? '<b>Aujourd’hui</b> <span>' + t + '</span>' : n === 1 ? '<b>Demain</b> <span>' + t + '</span>' : '<b>' + n + ' jours</b> <span>avant ' + t + '</span>';
  }
  function tout(sautille) { dessinerMois(sautille); dessinerJour(); dessinerBientot(); dessinerDecompte(); }

  function choisir(iso, sautille) {
    choisi = iso;
    if (periode() !== periodeVue) { luxPos = null; dessinerMois(false); } else {
      grille.querySelectorAll('.case').forEach(function (c) {
        var oui = c.getAttribute('data-jour') === iso;
        c.classList.toggle('choisie', oui);
        if (oui) c.setAttribute('aria-current', 'date'); else c.removeAttribute('aria-current');
      });
      placerLux(sautille);
    }
    dessinerJour();
  }
  function changerPeriode(n) {
    if (mode === 'semaine') { choisir(ajoute(choisi, n * 7), false); return; }
    var d = new Date(+choisi.slice(0, 4), +choisi.slice(5, 7) - 1 + n, 1, 12);
    var a = d.getFullYear(), m = d.getMonth();
    var auj = aujourdhui(), jour = +choisi.slice(8, 10);
    // Le mois de la date du jour : on y revient directement.
    var cible = auj.slice(0, 7) === versIso(a, m, 1).slice(0, 7) ? auj : versIso(a, m, Math.min(jour, dernierJour(a, m)));
    choisir(cible, false);
  }

  /* ---------- la fenetre d'un evenement ---------- */
  var fenetre = $('[data-fenetre-evenement]'), form = $('[data-evenement]');
  $('[data-stickers]').innerHTML = STICKERS.map(function (s, i) {
    return '<label><input type="radio" name="sticker" value="' + s.e + '"' + (i ? '' : ' checked') + '><span>' + s.e + '</span><span>' + s.n + '</span></label>';
  }).join('');
  var enEdition = null;
  var champNaissance = $('[data-champ-naissance]');
  var stickerChoisi = function () { return (form.querySelector('input[name="sticker"]:checked') || {}).value || '🪲'; };
  function ouvrirEvenement(ev) {
    enEdition = ev || null;
    form.reset();
    $('[data-evenement-titre]').textContent = ev ? 'Modifier' : 'Nouvel événement';
    form.titre.value = ev ? ev.titre : '';
    form.date.value = ev ? ev.date : choisi;
    form.heure.value = ev ? ev.heure || '' : '';
    form.repete.value = ev ? ev.repete || 'non' : 'non';
    form.rappel.value = ev && ev.rappel !== undefined ? ev.rappel : '';
    form.decompte.checked = !!(ev && ev.decompte);
    form.naissance.value = ev ? ev.naissance || '' : '';
    form.note.value = ev ? ev.note || '' : '';
    var s = form.querySelector('input[name="sticker"][value="' + (ev ? ev.sticker : '🪲') + '"]');
    if (s) s.checked = true;
    champNaissance.hidden = stickerChoisi() !== '🎂';
    $('[data-supprimer]').hidden = !ev;
    fenetre.showModal();
    if (!ev) form.titre.focus();
  }
  // Le sticker anniversaire revient chaque annee, sauf si on a deja choisi autre chose.
  form.addEventListener('change', function (e) {
    if (e.target.name !== 'sticker') return;
    champNaissance.hidden = e.target.value !== '🎂';
    if (e.target.value === '🎂' && form.repete.value === 'non') form.repete.value = 'an';
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var titre = form.titre.value.trim();
    if (!titre) { form.titre.focus(); return; }
    var sticker = stickerChoisi();
    var champs = { titre: titre, date: form.date.value, heure: form.heure.value, repete: form.repete.value, rappel: form.rappel.value, decompte: form.decompte.checked, naissance: sticker === '🎂' ? form.naissance.value : '', note: form.note.value.trim(), sticker: sticker };
    if (enEdition) Object.assign(enEdition, champs);
    else donnees.evenements.push(Object.assign({ id: nouvelId() }, champs));
    garder(); fenetre.close();
    choisi = champs.date;
    tout(false);
    toast(enEdition ? 'Modifié' : 'Ajouté');
    // L'enregistrement est un vrai geste : le seul moment ou le navigateur accepte de demander l'autorisation.
    if (champs.rappel !== '' && !rappelsOn()) activerRappels(); else prevoirSynchro();
  });
  $('[data-supprimer]').addEventListener('click', function () {
    if (!enEdition) return;
    var msg = enEdition.repete && enEdition.repete !== 'non' ? 'Supprimer « ' + enEdition.titre + ' » et toutes ses répétitions ?' : 'Supprimer « ' + enEdition.titre + ' » ?';
    if (!window.confirm(msg)) return;
    var id = enEdition.id;
    donnees.evenements = donnees.evenements.filter(function (ev) { return ev.id !== id; });
    garder(); fenetre.close(); tout(false); toast('Supprimé'); prevoirSynchro();
  });
  document.querySelectorAll('[data-fermer]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });
  document.querySelectorAll('dialog').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); });

  /* ---------- la phrase : ecrite ou dictee, rangee tout de suite ---------- */
  var rapide = $('[data-rapide]');
  function ajouterPhrase(texte) {
    var r = window.luxPhrase.lire(texte);
    if (!r.titre) { toast('Je n’ai pas compris quoi noter. Essayez « dentiste jeudi à 14h30 ».'); return; }
    var date = r.date || choisi;
    rapide.reset();
    if (r.tache) {
      (donnees.taches[date] = donnees.taches[date] || []).push({ id: nouvelId(), t: r.titre, fait: false });
      garder(); choisi = date; tout(false);
      toast('À faire ' + dateLongue(date) + ' : ' + r.titre);
      return;
    }
    var ev = { id: nouvelId(), titre: r.titre, date: date, heure: r.heure, repete: r.repete, rappel: r.rappel, decompte: false, naissance: r.naissance, note: '', sticker: r.sticker };
    donnees.evenements.push(ev);
    garder(); choisi = date; tout(false);
    var resume = r.sticker + ' ' + r.titre + ', ' + dateLongue(date) + (r.heure ? ' à ' + heureDite(r.heure) : '');
    if (r.rappel !== '' && !rappelsOn()) toast(resume, 'Activer les rappels', activerRappels);
    else { toast(resume, 'Modifier', function () { ouvrirEvenement(donnees.evenements.filter(function (x) { return x.id === ev.id; })[0]); }); prevoirSynchro(); }
  }
  rapide.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = rapide.phrase.value.trim();
    if (t) ajouterPhrase(t); else rapide.phrase.focus();
  });

  var Reconnaissance = window.SpeechRecognition || window.webkitSpeechRecognition;
  var micro = $('[data-micro]'), ecoute = null;
  if (Reconnaissance) {
    micro.hidden = false;
    micro.addEventListener('click', function () {
      if (ecoute) { ecoute.stop(); return; }
      var rec = new Reconnaissance(), texte = '', erreur = false;
      rec.lang = 'fr-FR'; rec.interimResults = true; rec.continuous = false;
      rec.onresult = function (e) { texte = e.results[e.results.length - 1][0].transcript; rapide.phrase.value = texte; };
      rec.onerror = function (e) {
        erreur = true;
        if (e.error === 'no-speech' || e.error === 'aborted') toast('Je n’ai rien entendu.');
        else if (e.error === 'network') toast('La dictée a besoin d’internet.');
        else toast('Micro indisponible ici : autorisez-le, ou utilisez le micro du clavier.');
      };
      rec.onend = function () {
        ecoute = null; micro.classList.remove('ecoute'); micro.setAttribute('aria-label', 'Dicter');
        rapide.phrase.placeholder = 'Dentiste jeudi à 14h30';
        if (erreur) return;
        if (texte.trim()) ajouterPhrase(texte); else toast('Je n’ai rien entendu.');
      };
      try {
        rec.start();
        ecoute = rec; micro.classList.add('ecoute'); micro.setAttribute('aria-label', 'Arrêter la dictée');
        rapide.phrase.placeholder = 'Je vous écoute…';
      } catch (e) { toast('Micro indisponible ici : utilisez le micro du clavier.'); }
    });
  } else {
    $('[data-rapide-aide]').textContent = 'Écrivez, ou dictez avec le micro du clavier : Lux range tout seul.';
  }

  /* ---------- la recherche ---------- */
  var fenetreRecherche = $('[data-fenetre-recherche]'), champRecherche = $('[data-recherche]');
  function chercher() {
    var q = sansAccent(champRecherche.value.trim()), zoneRes = $('[data-resultats]');
    if (!q) { zoneRes.innerHTML = ''; return; }
    var auj = aujourdhui(), res = [];
    donnees.evenements.forEach(function (ev) {
      if (sansAccent(ev.titre + ' ' + (ev.note || '')).indexOf(q) < 0) return;
      var iso = prochaineFois(ev) || ev.date;
      res.push({ sticker: ev.sticker || '🪲', titre: titreDe(ev, iso), iso: iso, heure: ev.heure });
    });
    Object.keys(donnees.taches).forEach(function (iso) {
      tachesDu(iso).forEach(function (t) {
        if (sansAccent(t.t).indexOf(q) >= 0) res.push({ sticker: t.fait ? '✅' : '📝', titre: t.t, iso: iso });
      });
    });
    // D'abord ce qui arrive, du plus proche au plus loin ; puis le passe, du plus recent au plus ancien.
    res.sort(function (a, b) {
      var pa = a.iso >= auj, pb = b.iso >= auj;
      if (pa !== pb) return pa ? -1 : 1;
      return pa ? a.iso.localeCompare(b.iso) : b.iso.localeCompare(a.iso);
    });
    zoneRes.innerHTML = res.length ? res.slice(0, 30).map(function (r) {
      var n = ecart(auj, r.iso);
      var quand = n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : n === -1 ? 'hier' : n > 0 ? 'dans ' + n + ' jours' : 'il y a ' + (-n) + ' jours';
      var d = dateDe(r.iso);
      return '<li><button type="button" data-aller="' + r.iso + '"><span class="sticker">' + esc(r.sticker) + '</span><span class="quoi"><b>' + esc(r.titre) + '</b><small>' + dateLongue(r.iso) + ' ' + d.getFullYear() + (r.heure ? ' à ' + heureDite(r.heure) : '') + '</small></span><span class="dans">' + quand + '</span></button></li>';
    }).join('') : '<li class="vide">Rien trouvé pour « ' + esc(champRecherche.value.trim()) + ' ».</li>';
  }
  $('[data-chercher]').addEventListener('click', function () { champRecherche.value = ''; chercher(); fenetreRecherche.showModal(); champRecherche.focus(); });
  champRecherche.addEventListener('input', chercher);
  $('[data-resultats]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-aller]');
    if (b) { fenetreRecherche.close(); choisir(b.getAttribute('data-aller'), false); }
  });

  /* ---------- les gestes ---------- */
  grille.addEventListener('click', function (e) {
    var c = e.target.closest('[data-jour]');
    if (!c) return;
    choisir(c.getAttribute('data-jour'), true);
  });
  grille.addEventListener('dblclick', function (e) { if (e.target.closest('[data-jour]')) ouvrirEvenement(); });
  grille.addEventListener('keydown', function (e) {
    var pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!pas) return;
    e.preventDefault();
    choisir(ajoute(choisi, pas), true);
    var c = grille.querySelector('[data-jour="' + choisi + '"]');
    if (c) c.focus();
  });
  // Glisser vers la gauche ou la droite pour changer de mois ou de semaine.
  var debut = null;
  grille.addEventListener('touchstart', function (e) { debut = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  grille.addEventListener('touchend', function (e) {
    if (!debut) return;
    var dx = e.changedTouches[0].clientX - debut.x, dy = e.changedTouches[0].clientY - debut.y;
    debut = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) changerPeriode(dx < 0 ? 1 : -1);
  }, { passive: true });

  $('[data-precedent]').addEventListener('click', function () { changerPeriode(-1); });
  $('[data-suivant]').addEventListener('click', function () { changerPeriode(1); });
  document.querySelectorAll('[data-vue]').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-vue'); ecrire('lux-vue', mode);
      luxPos = null; dessinerMois(false);
    });
  });
  $('[data-aujourdhui]').addEventListener('click', function () { choisir(aujourdhui(), true); });
  $('[data-ajouter]').addEventListener('click', function () { ouvrirEvenement(); });
  $('[data-jour-evenements]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ouvrir]');
    if (b) ouvrirEvenement(donnees.evenements.filter(function (ev) { return ev.id === b.getAttribute('data-ouvrir'); })[0]);
  });
  $('[data-bientot]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-aller]');
    if (b) choisir(b.getAttribute('data-aller'), true);
  });
  $('[data-decompte]').addEventListener('click', function (e) { choisir(e.currentTarget.getAttribute('data-aller'), true); });

  /* ---------- les choses a faire ---------- */
  $('[data-tache-form]').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = e.target.t.value.trim();
    if (!t) return;
    (donnees.taches[choisi] = donnees.taches[choisi] || []).push({ id: nouvelId(), t: t, fait: false });
    e.target.reset(); garder(); dessinerMois(false); dessinerJour();
    e.target.t.focus();
  });
  $('[data-taches]').addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-tache');
    tachesDu(choisi).forEach(function (t) { if (t.id === id) t.fait = e.target.checked; });
    garder(); dessinerMois(false); dessinerJour();
  });
  $('[data-taches]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tache-suppr]');
    if (!b) return;
    var id = b.getAttribute('data-tache-suppr');
    donnees.taches[choisi] = tachesDu(choisi).filter(function (t) { return t.id !== id; });
    if (!donnees.taches[choisi].length) delete donnees.taches[choisi];
    garder(); dessinerMois(false); dessinerJour();
  });

  /* ---------- les rappels : le telephone sonne meme appli fermee ---------- */
  var URL_RAPPELS = 'https://ibqawtgnucakzdldnitj.supabase.co/functions/v1/lux-rappels';
  var VAPID = 'BOcZdqb1smdsNqnHjCZHxOff-NQGry6n_m7Dos_tT1g43gn0RzcF5Zk5a6tUT7X_Cl0GodBMy4cZZcg5A6tgYvk';
  var pushPossible = function () { return location.protocol === 'https:' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; };
  var rappelsOn = function () { return lire('lux-rappels') === 'oui' && pushPossible() && Notification.permission === 'granted'; };
  var surIphone = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function cleAppareil() {
    var c = lire('lux-appareil');
    if (!c) {
      c = Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(20)), function (o) { return (o < 16 ? '0' : '') + o.toString(16); }).join('');
      ecrire('lux-appareil', c);
    }
    return c;
  }
  function versOctets(b64) {
    var brut = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(brut, function (c) { return c.charCodeAt(0); });
  }
  // Chaque fois a venir sur un an. Sans heure, le rappel sonne a 9 h.
  function calculerRappels() {
    var maintenant = Date.now(), auj = aujourdhui(), res = [];
    donnees.evenements.forEach(function (ev) {
      if (ev.rappel === undefined || ev.rappel === '') return;
      var avant = +ev.rappel, h = (ev.heure || '09:00').split(':');
      for (var i = 0; i < 366; i++) {
        var iso = ajoute(auj, i);
        if (!tombeLe(ev, iso)) continue;
        var d = dateDe(iso); d.setHours(+h[0], +h[1], 0, 0);
        var quand = d.getTime() - avant * 60000;
        if (quand <= maintenant) continue;
        var long = dateLongue(iso);
        res.push({ quand: new Date(quand).toISOString(), titre: (ev.sticker || '🪲') + ' ' + titreDe(ev, iso), corps: long.charAt(0).toUpperCase() + long.slice(1) + (ev.heure ? ' à ' + heureDite(ev.heure) : ''), jour: iso });
      }
    });
    return res.sort(function (a, b) { return a.quand.localeCompare(b.quand); }).slice(0, 200);
  }
  function appeler(corps) {
    return fetch(URL_RAPPELS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.refus || 'Serveur indisponible.'); e.statut = r.status; throw e; }
          return j;
        });
      });
  }
  function synchroniser(strict) {
    if (!rappelsOn()) return Promise.resolve();
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (ab) {
      if (!ab) { ecrire('lux-rappels', null); return; }
      return appeler({ action: 'synchro', cle: cleAppareil(), abonnement: ab.toJSON(), rappels: calculerRappels() })
        .then(function () { ecrire('lux-rappels-jour', aujourdhui()); });
    }).catch(function (e) {
      ecrire('lux-rappels-jour', null); // On retentera a la prochaine ouverture.
      if (strict) throw e;
    });
  }
  var synchroT;
  function prevoirSynchro() { if (rappelsOn()) { clearTimeout(synchroT); synchroT = setTimeout(synchroniser, 800); } }
  function activerRappels() {
    if (!pushPossible()) { toast(surIphone ? 'Sur iPhone : Partager, puis « Sur l’écran d’accueil », et rouvrez Lux depuis l’icône.' : 'Ce navigateur ne sait pas afficher de rappels.'); dessinerRappels(); return Promise.resolve(); }
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { toast('Rappels refusés : autorisez les notifications pour ce site dans les réglages.'); return; }
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (ab) {
          return ab || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(VAPID) });
        });
      }).then(function () {
        ecrire('lux-rappels', 'oui');
        return synchroniser(true);
      }).then(function () { toast('Rappels activés'); });
    }).catch(function (e) {
      // Rien n'est enregistre cote serveur : ne pas laisser croire que le telephone sonnera.
      ecrire('lux-rappels', null);
      toast(e instanceof TypeError ? 'Activation impossible : le serveur des rappels ne répond pas.' : 'Activation impossible : ' + ((e && e.message) || 'erreur inconnue') + '.');
    }).then(dessinerRappels);
  }
  function dessinerRappels() {
    var on = rappelsOn(), bloque = 'Notification' in window && Notification.permission === 'denied';
    $('[data-rappels-activer]').hidden = on || bloque || !pushPossible();
    $('[data-rappels-essai]').hidden = !on;
    $('[data-rappels-couper]').hidden = !on;
    $('[data-rappels-etat]').textContent = on ? 'Activés. Choisissez « Me rappeler » sur un événement : son titre et sa date passent par le serveur de Lux, juste pour sonner à l’heure.'
      : bloque ? 'Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur.'
        : !pushPossible() ? (surIphone ? 'Sur iPhone : Partager, puis « Sur l’écran d’accueil », et rouvrez Lux depuis l’icône.' : 'Ce navigateur ne sait pas afficher de rappels.')
          : 'Le téléphone vous prévient, même appli fermée.';
  }
  $('[data-rappels-activer]').addEventListener('click', activerRappels);
  $('[data-rappels-essai]').addEventListener('click', function () {
    synchroniser(true).then(function () { return appeler({ action: 'essai', cle: cleAppareil() }); })
      .then(function () { toast('Rappel d’essai envoyé'); })
      .catch(function (e) { toast(e.message || 'Le rappel d’essai n’est pas parti.'); });
  });
  $('[data-rappels-couper]').addEventListener('click', function () {
    var cle = cleAppareil();
    ecrire('lux-rappels', null);
    appeler({ action: 'retirer', cle: cle }).catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (ab) { return ab && ab.unsubscribe(); }).catch(function () {});
    dessinerRappels(); toast('Rappels coupés');
  });

  /* ---------- la sauvegarde : un code, et le calendrier suit partout ---------- */
  // Rien n'attend le serveur : on travaille sur la copie locale, et le serveur fusionne les copies sans en ecraser aucune.
  var fenetreCode = $('[data-fenetre-code]'), formCode = $('[data-code-form]'), erreurCode = $('[data-code-erreur]');
  var enCours = false, encore = false, sauvegardeT, derniere = 0;
  function prevoirSauvegarde() {
    if (!lire('lux-jeton')) return;
    ecrire('lux-sale', 'oui');
    clearTimeout(sauvegardeT);
    sauvegardeT = setTimeout(sauver, 600);
  }
  function sauver() {
    var jeton = lire('lux-jeton');
    if (!jeton) return Promise.resolve();
    if (enCours) { encore = true; return Promise.resolve(); }
    enCours = true;
    var v = versionLocale;
    return appeler({ action: 'calendrier', jeton: jeton, donnees: donnees }).then(function (r) {
      derniere = Date.now();
      if (v !== versionLocale) { encore = true; return; } // Modifie pendant l'envoi : on renvoie.
      if (fenetre.open) { clearTimeout(sauvegardeT); sauvegardeT = setTimeout(sauver, 3000); return; } // Ne rien changer sous les doigts.
      ecrire('lux-sale', null);
      ecrire('lux-sauve-a', String(derniere));
      appliquer(r.donnees);
    }).catch(function (e) {
      if (e && e.statut === 401) { ecrire('lux-jeton', null); ouvrirCode(); }
    }).then(function () {
      enCours = false;
      if (encore) { encore = false; sauver(); }
    });
  }
  function appliquer(d) {
    if (!d || !Array.isArray(d.evenements) || JSON.stringify(d) === JSON.stringify(donnees)) return;
    donnees = { evenements: d.evenements, taches: d.taches || {}, supprimes: d.supprimes || {} };
    photographier();
    ecrireMemoire();
    reporterTaches();
    tout(false);
    prevoirSynchro();
  }
  function ouvrirCode() {
    if (fenetreCode.open) return;
    formCode.reset(); erreurCode.hidden = true;
    fenetreCode.showModal();
    formCode.code.focus();
  }
  function connecter() {
    var code = formCode.code.value.replace(/\D/g, '');
    if (!code || formCode.dataset.envoi) return;
    formCode.dataset.envoi = '1'; erreurCode.hidden = true;
    appeler({ action: 'connexion', code: code }).then(function (r) {
      ecrire('lux-jeton', r.jeton);
      fenetreCode.close();
      return sauver().then(function () { toast('Calendrier sauvegardé : ' + donnees.evenements.length + ' événement' + (donnees.evenements.length > 1 ? 's' : '') + ' retrouvé' + (donnees.evenements.length > 1 ? 's' : '')); });
    }).catch(function (e) {
      erreurCode.textContent = e instanceof TypeError ? 'Le serveur ne répond pas. Vérifiez internet.' : e.message;
      erreurCode.hidden = false;
      formCode.code.value = ''; formCode.code.focus();
    }).then(function () { delete formCode.dataset.envoi; dessinerCompte(); });
  }
  formCode.addEventListener('submit', function (e) { e.preventDefault(); connecter(); });
  // Le huitieme chiffre suffit : pas de bouton a chercher.
  formCode.code.addEventListener('input', function () { if (formCode.code.value.replace(/\D/g, '').length === 8) connecter(); });
  function dessinerCompte() {
    var co = !!lire('lux-jeton'), a = +lire('lux-sauve-a'), d = a ? new Date(a) : null;
    $('[data-compte-connecter]').hidden = co;
    $('[data-compte-etat]').textContent = !co ? 'Avec votre code, le calendrier est gardé même si vous supprimez l’appli, et il vous suit sur vos autres appareils.'
      : lire('lux-sale') ? 'Connecté. Des changements attendent internet pour partir.'
        : d ? 'Connecté. Sauvegardé à ' + heureDite(deux(d.getHours()) + ':' + deux(d.getMinutes())) + (isoDe(d) === aujourdhui() ? '' : ' le ' + d.getDate() + ' ' + MOIS[d.getMonth()]) + '.' : 'Connecté.';
  }
  $('[data-compte-connecter]').addEventListener('click', function () { fenetrePlus.close(); ouvrirCode(); });
  window.addEventListener('online', function () { if (lire('lux-sale')) sauver(); });

  /* ---------- les options ---------- */
  var boutonTheme = $('[data-theme-bouton]');
  function dessinerTheme() { boutonTheme.textContent = document.documentElement.getAttribute('data-theme') === 'nuit' ? 'Revenir en crème' : 'Passer en mode nuit'; }
  boutonTheme.addEventListener('click', function () {
    var r = document.documentElement;
    var suivant = r.getAttribute('data-theme') === 'nuit' ? 'clair' : 'nuit';
    r.setAttribute('data-theme', suivant);
    ecrire('lux-theme', suivant);
    dessinerTheme();
  });
  var selectZone = $('[data-zone]');
  selectZone.value = zone;
  selectZone.addEventListener('change', function () { zone = selectZone.value; ecrire('lux-zone', zone); dessinerMois(false); dessinerJour(); });

  /* ---------- sauvegarde, restauration, autres agendas ---------- */
  var fenetrePlus = $('[data-fenetre-plus]');
  $('[data-plus]').addEventListener('click', function () { dessinerCompte(); dessinerRappels(); dessinerTheme(); fenetrePlus.showModal(); });
  function telecharger(nom, contenu, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenu], { type: type }));
    a.download = nom; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  $('[data-sauvegarder]').addEventListener('click', function () {
    telecharger('calendrier-lux-' + aujourdhui() + '.json', JSON.stringify(donnees, null, 1), 'application/json');
    toast('Copie téléchargée');
  });
  $('[data-restaurer]').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t);
      if (!d || !Array.isArray(d.evenements)) throw new Error();
      var propre = d.evenements.filter(function (ev) { return ev && ev.id && ev.titre && /^\d{4}-\d{2}-\d{2}$/.test(ev.date); });
      if (!window.confirm('Remplacer ce calendrier par cette copie (' + propre.length + ' événements) ?')) return;
      donnees = { evenements: propre, taches: d.taches && typeof d.taches === 'object' ? d.taches : {}, supprimes: donnees.supprimes };
      reporterTaches(); garder(); fenetrePlus.close(); tout(false); toast('Copie restaurée'); prevoirSynchro();
    }).catch(function () { toast('Ce fichier n’est pas une copie de Lux.'); })
      .then(function () { e.target.value = ''; });
  });
  $('[data-ics]').addEventListener('click', function () {
    var plie = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); };
    var compact = function (iso) { return iso.replace(/-/g, ''); };
    var rrule = { semaine: 'WEEKLY', mois: 'MONTHLY', an: 'YEARLY' };
    var maintenant = new Date().toISOString().replace(/[-:]|\.\d+/g, '');
    var lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lux//Calendrier//FR', 'CALSCALE:GREGORIAN'];
    donnees.evenements.forEach(function (ev) {
      lignes.push('BEGIN:VEVENT', 'UID:' + ev.id + '@calendrierlux', 'DTSTAMP:' + maintenant, 'SUMMARY:' + plie(ev.titre));
      if (ev.heure) {
        var h = ev.heure.replace(':', '') + '00';
        lignes.push('DTSTART;TZID=Europe/Paris:' + compact(ev.date) + 'T' + h);
      } else {
        lignes.push('DTSTART;VALUE=DATE:' + compact(ev.date), 'DTEND;VALUE=DATE:' + compact(ajoute(ev.date, 1)));
      }
      // Le 31 : le dernier jour du mois, comme dans Lux. Sans ca, les autres agendas sautent les mois courts.
      if (rrule[ev.repete]) lignes.push('RRULE:FREQ=' + rrule[ev.repete] + (ev.repete === 'mois' && ev.date.slice(8) === '31' ? ';BYMONTHDAY=-1' : ''));
      if (ev.note) lignes.push('DESCRIPTION:' + plie(ev.note));
      lignes.push('END:VEVENT');
    });
    lignes.push('END:VCALENDAR');
    telecharger('calendrier-lux.ics', lignes.join('\r\n') + '\r\n', 'text/calendar');
    toast('Fichier .ics téléchargé');
  });
  $('[data-imprimer]').addEventListener('click', function () { fenetrePlus.close(); setTimeout(function () { window.print(); }, 150); });

  /* ---------- petits riens ---------- */
  var toastEl = $('[data-toast]'), toastT;
  function toast(t, action, geste) {
    toastEl.textContent = t;
    toastEl.classList.toggle('avec-action', !!action);
    if (action) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = action;
      b.addEventListener('click', function () { toastEl.classList.remove('visible', 'avec-action'); geste(); });
      toastEl.appendChild(b);
    }
    toastEl.classList.add('visible');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('visible', 'avec-action'); }, action ? 7000 : t.length > 40 ? 4500 : 2400);
  }
  $('[data-lux-petit]').innerHTML = LUX;
  $('[data-lux-bulle]').innerHTML = LUX;
  window.addEventListener('resize', function () { placerLux(false); });
  // Ouvert toute la nuit : au reveil, le calendrier revient sur le nouveau jour.
  var jourOuvert = aujourdhui();
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    // De retour sur l'appli : on recupere ce qui a change ailleurs, sans jamais interroger en boucle.
    if (Date.now() - derniere > 15000) sauver();
    if (jourOuvert === aujourdhui()) return;
    jourOuvert = aujourdhui(); reporterTaches(); choisi = jourOuvert; tout(false);
    synchroniser();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placerLux(false); });

  reporterTaches();
  // Ouvert depuis un rappel : directement sur le bon jour.
  var demande = new URLSearchParams(location.search).get('jour');
  if (demande && /^\d{4}-\d{2}-\d{2}$/.test(demande)) { choisi = demande; history.replaceState(null, '', location.pathname); }
  tout(false);
  if (!memoireOk) toast('Ce navigateur bloque la mémoire : rien ne sera gardé.');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  if (rappelsOn() && lire('lux-rappels-jour') !== aujourdhui()) synchroniser();
  if (lire('lux-jeton')) sauver(); else if (memoireOk) ouvrirCode();
})();
