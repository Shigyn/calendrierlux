// Lux — un petit calendrier. Tout reste dans ce navigateur (localStorage).
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LUX = '<svg viewBox="0 0 64 64" aria-hidden="true" width="100%" height="100%">' +
    '<polygon points="32,7 39.5,23.5 57.5,25.5 44,37.5 47.5,55.5 32,46.5 16.5,55.5 20,37.5 6.5,25.5 24.5,23.5" fill="#ffcf4d" stroke="#ffcf4d" stroke-width="7" stroke-linejoin="round"/>' +
    '<circle cx="19.5" cy="36" r="3.4" fill="#ff9db8"/><circle cx="44.5" cy="36" r="3.4" fill="#ff9db8"/>' +
    '<g class="lux-yeux" fill="#2d2a5e"><circle cx="25.5" cy="30.5" r="2.9"/><circle cx="38.5" cy="30.5" r="2.9"/></g>' +
    '<path d="M28 37c1.4 2.4 6.6 2.4 8 0" fill="none" stroke="#2d2a5e" stroke-width="2.4" stroke-linecap="round"/></svg>';

  var STICKERS = [
    { e: '⭐', n: 'Autre' }, { e: '🎂', n: 'Anniv.' }, { e: '🩺', n: 'Santé' }, { e: '💼', n: 'Travail' }, { e: '🎉', n: 'Fête' },
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

  /* ---------- les donnees ---------- */
  var CLE = 'calendrierlux-v1';
  var donnees = { evenements: [], taches: {} };
  var memoireOk = true;
  try {
    var lu = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (lu && Array.isArray(lu.evenements)) donnees = { evenements: lu.evenements, taches: lu.taches || {} };
  } catch (e) { memoireOk = false; }
  function garder() {
    try { localStorage.setItem(CLE, JSON.stringify(donnees)); }
    catch (e) { toast('Enregistrement impossible : ce navigateur bloque la mémoire.'); }
  }
  var nouvelId = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

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

  /* ---------- l'etat ---------- */
  var choisi = aujourdhui();
  var vue = { a: +choisi.slice(0, 4), m: +choisi.slice(5, 7) - 1 };

  /* ---------- le mois ---------- */
  var grille = $('[data-grille]');
  var luxEl = document.createElement('div');
  luxEl.className = 'lux'; luxEl.innerHTML = LUX;
  var saisonDe = function (m) { return m < 2 || m === 11 ? 'hiver' : m < 5 ? 'printemps' : m < 8 ? 'ete' : 'automne'; };

  function dessinerMois(sautille) {
    document.body.setAttribute('data-saison', saisonDe(vue.m));
    $('[data-titre-mois]').textContent = MOIS[vue.m];
    $('[data-titre-annee]').textContent = vue.a;
    var auj = aujourdhui();
    var decalage = (new Date(vue.a, vue.m, 1, 12).getDay() + 6) % 7;
    var nb = dernierJour(vue.a, vue.m);
    var lignes = Math.ceil((decalage + nb) / 7);
    var depart = ajoute(versIso(vue.a, vue.m, 1), -decalage);
    var html = '';
    for (var i = 0; i < lignes * 7; i++) {
      var iso = ajoute(depart, i), d = dateDe(iso), jour = d.getDay();
      var evs = evenementsDu(iso), max = 3;
      var cls = ['case'];
      if (d.getMonth() !== vue.m) cls.push('dehors');
      if (jour === 0 || jour === 6) cls.push('weekend');
      if (ferieDe(iso)) cls.push('ferie');
      if (iso === auj) cls.push('aujourdhui');
      if (iso === choisi) cls.push('choisie');
      var aFaire = tachesDu(iso).filter(function (t) { return !t.fait; }).length;
      var dit = JOURS[jour] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()] + (evs.length ? ', ' + evs.length + ' événement' + (evs.length > 1 ? 's' : '') : '') + (aFaire ? ', ' + aFaire + ' à faire' : '') + (ferieDe(iso) ? ', ' + ferieDe(iso) : '');
      html += '<button type="button" class="' + cls.join(' ') + '" data-jour="' + iso + '" aria-label="' + esc(dit) + '"' + (iso === choisi ? ' aria-current="date"' : '') + '>' +
        '<span class="num">' + d.getDate() + '</span>' +
        (evs.length || ferieDe(iso) ? '<span class="pastilles">' + (ferieDe(iso) ? '<span class="pastille ferie-mot"><span class="pastille-texte">' + esc(ferieDe(iso)) + '</span></span>' : '') + evs.slice(0, max).map(function (ev) {
          return '<span class="pastille">' + esc(ev.sticker || '⭐') + ' <span class="pastille-texte">' + esc(ev.titre) + '</span></span>';
        }).join('') + (evs.length > max ? '<span class="encore">+ ' + (evs.length - max) + '</span>' : '') + '</span>' : '') +
        (aFaire ? '<span class="tache-point" aria-hidden="true"></span>' : '') + '</button>';
    }
    grille.innerHTML = html;
    grille.appendChild(luxEl);
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
    if (anniv) return 'Pensez-y : ' + anniv.titre + ' !';
    var quand = iso === aujourdhui() ? 'Aujourd’hui' : iso === ajoute(aujourdhui(), 1) ? 'Demain' : 'Ce jour-là';
    if (!evs.length && !restant) return quand + ', rien de prévu.';
    var morceaux = [];
    if (evs.length) morceaux.push(evs.length + ' événement' + (evs.length > 1 ? 's' : ''));
    if (restant) morceaux.push(restant + ' chose' + (restant > 1 ? 's' : '') + ' à faire');
    return quand + ' : ' + morceaux.join(' et ') + '.';
  }
  function dessinerJour() {
    var d = dateDe(choisi), evs = evenementsDu(choisi), taches = tachesDu(choisi);
    $('[data-jour-titre]').textContent = JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
    var f = ferieDe(choisi), fe = $('[data-jour-ferie]');
    fe.hidden = !f; fe.textContent = f;
    $('[data-jour-phrase]').textContent = phrase(choisi, evs, taches);
    $('[data-jour-evenements]').innerHTML = evs.length ? '<ul class="evenements">' + evs.map(function (ev) {
      var sous = [ev.heure ? ev.heure.replace(':', ' h ') : '', REPETE[ev.repete] || ''].filter(Boolean).join(' · ');
      return '<li><button type="button" class="evenement" data-ouvrir="' + esc(ev.id) + '"><span class="sticker">' + esc(ev.sticker || '⭐') + '</span><span><b>' + esc(ev.titre) + '</b>' +
        (sous ? '<small>' + esc(sous) + '</small>' : '') + (ev.note ? '<small>' + esc(ev.note) + '</small>' : '') + '</span></button></li>';
    }).join('') + '</ul>' : '';
    $('[data-taches]').innerHTML = taches.map(function (t) {
      return '<li class="' + (t.fait ? 'fait' : '') + '"><label><input type="checkbox" data-tache="' + esc(t.id) + '"' + (t.fait ? ' checked' : '') + '><span>' + esc(t.t) + '</span></label>' +
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
    var zone = $('[data-bientot]');
    zone.innerHTML = res.length ? res.map(function (r) {
      var quand = r.dans === 0 ? 'aujourd’hui' : r.dans === 1 ? 'demain' : 'dans ' + r.dans + ' jours';
      return '<li><button type="button" data-aller="' + r.iso + '"><span class="sticker">' + esc(r.ev.sticker || '⭐') + '</span><span class="quoi">' + esc(r.ev.titre) + '</span><span class="dans">' + quand + '</span></button></li>';
    }).join('') : '<li class="vide">Rien dans les 3 prochains mois.</li>';
  }
  function tout(sautille) { dessinerMois(sautille); dessinerJour(); dessinerBientot(); }

  function choisir(iso, sautille) {
    var a = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1;
    var changeMois = a !== vue.a || m !== vue.m;
    choisi = iso; vue = { a: a, m: m };
    if (changeMois) { luxPos = null; dessinerMois(false); } else {
      grille.querySelectorAll('.case').forEach(function (c) {
        var oui = c.getAttribute('data-jour') === iso;
        c.classList.toggle('choisie', oui);
        if (oui) c.setAttribute('aria-current', 'date'); else c.removeAttribute('aria-current');
      });
      placerLux(sautille);
    }
    dessinerJour();
  }
  function changerMois(n) {
    var d = new Date(vue.a, vue.m + n, 1, 12);
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
  function ouvrirEvenement(ev) {
    enEdition = ev || null;
    form.reset();
    $('[data-evenement-titre]').textContent = ev ? 'Modifier' : 'Nouvel événement';
    form.titre.value = ev ? ev.titre : '';
    form.date.value = ev ? ev.date : choisi;
    form.heure.value = ev ? ev.heure || '' : '';
    form.repete.value = ev ? ev.repete || 'non' : 'non';
    form.note.value = ev ? ev.note || '' : '';
    var s = form.querySelector('input[name="sticker"][value="' + (ev ? ev.sticker : '⭐') + '"]');
    if (s) s.checked = true;
    $('[data-supprimer]').hidden = !ev;
    fenetre.showModal();
    if (!ev) form.titre.focus();
  }
  // Le sticker anniversaire revient chaque annee, sauf si on a deja choisi autre chose.
  form.addEventListener('change', function (e) {
    if (e.target.name === 'sticker' && e.target.value === '🎂' && form.repete.value === 'non') form.repete.value = 'an';
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var titre = form.titre.value.trim();
    if (!titre) { form.titre.focus(); return; }
    var champs = { titre: titre, date: form.date.value, heure: form.heure.value, repete: form.repete.value, note: form.note.value.trim(), sticker: (form.querySelector('input[name="sticker"]:checked') || {}).value || '⭐' };
    if (enEdition) Object.assign(enEdition, champs);
    else donnees.evenements.push(Object.assign({ id: nouvelId() }, champs));
    garder(); fenetre.close();
    choisi = champs.date; vue = { a: +choisi.slice(0, 4), m: +choisi.slice(5, 7) - 1 };
    tout(false);
    toast(enEdition ? 'Modifié' : 'Ajouté');
  });
  $('[data-supprimer]').addEventListener('click', function () {
    if (!enEdition) return;
    var msg = enEdition.repete && enEdition.repete !== 'non' ? 'Supprimer « ' + enEdition.titre + ' » et toutes ses répétitions ?' : 'Supprimer « ' + enEdition.titre + ' » ?';
    if (!window.confirm(msg)) return;
    var id = enEdition.id;
    donnees.evenements = donnees.evenements.filter(function (ev) { return ev.id !== id; });
    garder(); fenetre.close(); tout(false); toast('Supprimé');
  });
  document.querySelectorAll('[data-fermer]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });
  document.querySelectorAll('dialog').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); });

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
  // Glisser vers la gauche ou la droite pour changer de mois.
  var debut = null;
  grille.addEventListener('touchstart', function (e) { debut = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  grille.addEventListener('touchend', function (e) {
    if (!debut) return;
    var dx = e.changedTouches[0].clientX - debut.x, dy = e.changedTouches[0].clientY - debut.y;
    debut = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) changerMois(dx < 0 ? 1 : -1);
  }, { passive: true });

  $('[data-mois-precedent]').addEventListener('click', function () { changerMois(-1); });
  $('[data-mois-suivant]').addEventListener('click', function () { changerMois(1); });
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

  /* ---------- le theme ---------- */
  $('[data-theme-bouton]').addEventListener('click', function () {
    var r = document.documentElement, actuel = r.getAttribute('data-theme');
    var sombre = actuel ? actuel === 'nuit' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var suivant = sombre ? 'clair' : 'nuit';
    r.setAttribute('data-theme', suivant);
    try { localStorage.setItem('lux-theme', suivant); } catch (e) {}
  });

  /* ---------- sauvegarde, restauration, autres agendas ---------- */
  var fenetrePlus = $('[data-fenetre-plus]');
  $('[data-plus]').addEventListener('click', function () { fenetrePlus.showModal(); });
  function telecharger(nom, contenu, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenu], { type: type }));
    a.download = nom; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  $('[data-sauvegarder]').addEventListener('click', function () {
    telecharger('calendrier-lux-' + aujourdhui() + '.json', JSON.stringify(donnees, null, 1), 'application/json');
    toast('Sauvegarde téléchargée');
  });
  $('[data-restaurer]').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t);
      if (!d || !Array.isArray(d.evenements)) throw new Error();
      var propre = d.evenements.filter(function (ev) { return ev && ev.id && ev.titre && /^\d{4}-\d{2}-\d{2}$/.test(ev.date); });
      if (!window.confirm('Remplacer ce calendrier par cette sauvegarde (' + propre.length + ' événements) ?')) return;
      donnees = { evenements: propre, taches: d.taches && typeof d.taches === 'object' ? d.taches : {} };
      garder(); fenetrePlus.close(); tout(false); toast('Sauvegarde restaurée');
    }).catch(function () { toast('Ce fichier n’est pas une sauvegarde de Lux.'); })
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
  function toast(t) {
    toastEl.textContent = t; toastEl.classList.add('visible');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('visible'); }, 2200);
  }
  $('[data-lux-petit]').innerHTML = LUX;
  $('[data-lux-bulle]').innerHTML = LUX;
  window.addEventListener('resize', function () { placerLux(false); });
  // Ouvert toute la nuit : au reveil, le calendrier revient sur le nouveau jour.
  var jourOuvert = aujourdhui();
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || jourOuvert === aujourdhui()) return;
    jourOuvert = aujourdhui(); choisir(jourOuvert, false); dessinerBientot();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placerLux(false); });
  tout(false);
  if (!memoireOk) toast('Ce navigateur bloque la mémoire : rien ne sera gardé.');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
