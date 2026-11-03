// Lux comprend une phrase, dictee ou ecrite : « dentiste jeudi à 14h30 » devient un evenement bien range.
(function (racine) {
  'use strict';
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  var RE_MOIS = 'janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre';
  var RE_JOURS = JOURS.join('|');
  var NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, 'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19, vingt: 20, 'vingt et un': 21, 'vingt-deux': 22, 'vingt-trois': 23, 'vingt-quatre': 24, 'vingt-cinq': 25, 'vingt-six': 26, 'vingt-sept': 27, 'vingt-huit': 28, 'vingt-neuf': 29, trente: 30, 'trente et un': 31, quarante: 40, cinquante: 50, soixante: 60 };
  var RE_NOMBRES = Object.keys(NOMBRES).sort(function (a, b) { return b.length - a.length; }).join('|');
  var RAPPELS = [0, 15, 30, 60, 120, 1440, 2880, 10080];
  var STICKERS = [
    [/anniv/, '🎂'],
    [/dentiste|docteur|m[eé]decin|kin[eé]|ost[eé]o|h[oô]pital|radio|vaccin|ophtalmo|gyn[eé]co|p[eé]diatre|sant[eé]|pharmacie/, '🩺'],
    [/r[eé]union|travail|boulot|client|entretien|bureau|rendez-vous pro/, '💼'],
    [/resto|restaurant|d[iî]ner|d[eé]jeuner|repas|brunch|barbecue/, '🍽️'],
    [/piscine|sport|foot|gym|yoga|course|muscu|tennis|danse|rando|judo|natation/, '🏃'],
    [/voyage|vacances|avion|train|vol\b|week-?end|valise|a[eé]roport/, '✈️'],
    [/f[eê]te|soir[eé]e|ap[eé]ro|mariage|bapt[eê]me|concert/, '🎉'],
    [/maison|m[eé]nage|loyer|plombier|facture|courses|garagiste|voiture|contr[oô]le technique/, '🏠'],
    [/amour|chéri|cheri|saint-valentin|en amoureux/, '💗'],
  ];

  var deux = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (a, m, j) { return a + '-' + deux(m + 1) + '-' + deux(j); };
  var dateDe = function (t) { var p = t.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); };
  var isoDe = function (d) { return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
  var ajoute = function (t, n) { var d = dateDe(t); d.setDate(d.getDate() + n); return isoDe(d); };
  var dernier = function (a, m) { return new Date(a, m + 1, 0).getDate(); };
  var sansAccent = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); };

  // Le prochain jour de ce nom : dit un mardi, « mardi » veut dire mardi prochain.
  function prochainJour(auj, n) {
    var ecart = (n - dateDe(auj).getDay() + 7) % 7;
    return ajoute(auj, ecart || 7);
  }
  // « le 12 » : le prochain 12 qui existe, ce mois-ci ou un mois suivant.
  function prochainQuantieme(auj, j) {
    var d = dateDe(auj), a = d.getFullYear(), m = d.getMonth();
    if (j < d.getDate()) m++;
    for (var i = 0; i < 12; i++) {
      var y = a + Math.floor((m + i) / 12), mm = (m + i) % 12;
      if (j <= dernier(y, mm)) return iso(y, mm, j);
    }
    return null;
  }

  function lire(texte, maintenant) {
    maintenant = maintenant || new Date();
    var auj = isoDe(maintenant), annee = maintenant.getFullYear();
    var s = ' ' + String(texte || '').replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim() + ' ';
    var r = { titre: '', date: null, heure: '', repete: 'non', sticker: '🪲', rappel: '', naissance: '', tache: false };
    var m, moment = '', anneeDonnee = null;
    var ote = function (re) { var x = s.match(re); if (x) s = s.replace(re, ' '); return x; };

    // Les nombres dits en toutes lettres, quand ils comptent quelque chose
    s = s.replace(new RegExp('\\b(' + RE_NOMBRES + ')\\b(?=\\s+(?:heures?|h\\b|jours?|semaines?|mois|ans?\\b|minutes?|min\\b))', 'gi'), function (x) { return NOMBRES[x.toLowerCase()]; });
    s = s.replace(new RegExp('\\ble\\s+(' + RE_NOMBRES + ')\\b', 'gi'), function (x, n) { return 'le ' + NOMBRES[n.toLowerCase()]; });
    s = s.replace(/\ble\s+(?:premier|1er)\b/gi, 'le 1');

    // Une chose a faire plutot qu'un evenement
    if ((m = ote(/^\s*(?:t[aâ]che|[aà] faire|ajoute une t[aâ]che|penser? [aà]|il faut|faut|il ne faut pas oublier(?: de| d')?|ne pas oublier(?: de| d')?|n'oublie pas(?: de| d')?)\s*:?\s/i))) r.tache = true;
    if (ote(/\s[aà] faire\s*$/i)) r.tache = true;

    // Le rappel
    if ((m = ote(/\b(?:rappelle[- ]moi|rappelle[- ]nous|pr[eé]viens[- ]moi|avec (?:un )?rappel|rappel)\b(?:\s+(la veille|le jour m[eê]me|(\d+)\s*(minutes?|min|heures?|h|jours?|semaines?)\s*avant))?/i))) {
      var q = (m[1] || '').toLowerCase(), minutes = -1;
      if (q.indexOf('veille') === 0 || q === 'la veille') minutes = 1440;
      else if (q.indexOf('jour') > 0) minutes = 0;
      else if (m[2]) {
        var u = m[3].charAt(0).toLowerCase();
        minutes = +m[2] * (u === 'm' ? 1 : u === 'h' ? 60 : u === 'j' ? 1440 : 10080);
      }
      r._rappel = minutes;
    }

    // Ce qui revient
    if ((m = ote(new RegExp('\\b(?:tous les|toutes les|chaque)\\s+(' + RE_JOURS + ')s?\\b(?:\\s+(matin|midi|soir|apr[eè]s-midi))?', 'i')))) {
      r.repete = 'semaine'; r.date = prochainJour(auj, JOURS.indexOf(m[1].toLowerCase()));
      if ((dateDe(r.date).getDay() === dateDe(auj).getDay())) r.date = auj;
      moment = (m[2] || '').toLowerCase();
    } else if (ote(/\b(?:toutes les semaines|chaque semaine)\b/i)) r.repete = 'semaine';
    else if ((m = ote(/\b(?:tous les|chaque)\s+(\d{1,2})(?:\s+du mois)?\b(?!\s*(?:h\b|heures?))/i))) { r.repete = 'mois'; r.date = prochainQuantieme(auj, +m[1]); }
    else if (ote(/\b(?:tous les mois|chaque mois)\b/i)) r.repete = 'mois';
    else if (ote(/\b(?:tous les ans|chaque ann[eé]e)\b/i)) r.repete = 'an';

    // L'heure
    if ((m = ote(/\bdans\s+(\d+)\s*(?:h\b|heures?)\b/i))) {
      var plus = new Date(maintenant.getTime() + +m[1] * 3600000);
      r.date = isoDe(plus); r.heure = deux(plus.getHours()) + ':' + deux(plus.getMinutes());
    } else if ((m = ote(/\s(?:[aà]|vers)\s+(midi|minuit)(?:\s+et\s+(demie?|quart))?(?=[\s,.;!?]|$)/i))) {
      r.heure = (m[1].toLowerCase() === 'midi' ? '12' : '00') + ':' + (m[2] ? (m[2].charAt(0).toLowerCase() === 'd' ? '30' : '15') : '00');
    } else {
      var h = ote(/(?:\s(?:[aà]|vers)\s+|\b)(\d{1,2})\s*(?:h|heures?)\s*(\d{2}|et demie?|et quart|moins le quart)?(?:\s+(du matin|du soir|de l'apr[eè]s-midi))?(?=[\s,.;!?]|$)/i);
      if (h && +h[1] < 25) {
        var hh = +h[1], mn = 0, sup = (h[2] || '').toLowerCase();
        if (/^\d/.test(sup)) mn = +sup;
        else if (sup.indexOf('demi') > -1) mn = 30;
        else if (sup.indexOf('quart') > -1 && sup.indexOf('moins') > -1) { hh = (hh + 23) % 24; mn = 45; }
        else if (sup.indexOf('quart') > -1) mn = 15;
        if (h[3] && !/matin/i.test(h[3]) && hh < 12) hh += 12;
        r.heure = deux(hh % 24) + ':' + deux(mn);
      }
    }

    // Le jour
    if (ote(/\baujourd'hui\b/i)) r.date = auj;
    if ((m = ote(/\b(?:ce|cet|cette)\s+(matin|midi|soir|apr[eè]s-midi)\b/i))) { r.date = auj; moment = m[1].toLowerCase(); }
    if ((m = ote(/\bapr[eè]s-demain\b(?:\s+(matin|midi|soir|apr[eè]s-midi))?/i))) { r.date = ajoute(auj, 2); moment = (m[1] || moment).toLowerCase(); }
    if ((m = ote(/\bdemain\b(?:\s+(matin|midi|soir|apr[eè]s-midi))?/i))) { r.date = ajoute(auj, 1); moment = (m[1] || moment).toLowerCase(); }
    if ((m = ote(/\bdans\s+(\d+)\s*(jours?|semaines?|mois)\b/i))) {
      var nb = +m[1], un = m[2].charAt(0).toLowerCase();
      if (un === 'j') r.date = ajoute(auj, nb);
      else if (un === 's') r.date = ajoute(auj, nb * 7);
      else {
        var d0 = dateDe(auj), tot = d0.getMonth() + nb, y0 = d0.getFullYear() + Math.floor(tot / 12), m0 = tot % 12;
        r.date = iso(y0, m0, Math.min(d0.getDate(), dernier(y0, m0)));
      }
    }
    if ((m = ote(new RegExp('\\b(?:ce\\s+)?(' + RE_JOURS + ')\\s+en\\s+(\\d+|huit|quinze)\\b', 'i')))) {
      r.date = ajoute(prochainJour(auj, JOURS.indexOf(m[1].toLowerCase())), /quinze|15/i.test(m[2]) ? 14 : 7);
    }
    if ((m = ote(new RegExp('\\b(?:ce\\s+|le\\s+)?(' + RE_JOURS + ')(?:\\s+(prochain))?(?:\\s+(matin|midi|soir|apr[eè]s-midi))?(?:\\s+le\\s+(\\d{1,2}))?\\b', 'i')))) {
      if (m[4]) r.date = prochainQuantieme(auj, +m[4]);
      else if (r.repete !== 'semaine' || !r.date) r.date = prochainJour(auj, JOURS.indexOf(m[1].toLowerCase()));
      moment = (m[3] || moment).toLowerCase();
    }
    if (ote(/\b(?:la\s+)?semaine prochaine\b/i)) r.date = prochainJour(auj, 1);
    if ((m = ote(new RegExp('\\b(?:le\\s+)?(\\d{1,2})\\s+(' + RE_MOIS + ')(?:\\s+(\\d{4}))?\\b', 'i')))) {
      var mo = MOIS.indexOf(sansAccent(m[2].toLowerCase())), j = Math.min(+m[1], 31);
      if (m[3]) anneeDonnee = +m[3];
      var yy = anneeDonnee && anneeDonnee >= annee ? anneeDonnee : annee;
      var c = iso(yy, mo, Math.min(j, dernier(yy, mo)));
      if (c < auj) { yy++; c = iso(yy, mo, Math.min(j, dernier(yy, mo))); }
      r.date = c;
    } else if ((m = ote(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
      var mm2 = +m[2] - 1;
      if (mm2 >= 0 && mm2 < 12 && +m[1] >= 1) {
        if (m[3]) anneeDonnee = +m[3] < 100 ? 2000 + +m[3] : +m[3];
        var y2 = anneeDonnee && anneeDonnee >= annee ? anneeDonnee : annee;
        var c2 = iso(y2, mm2, Math.min(+m[1], dernier(y2, mm2)));
        if (c2 < auj) { y2++; c2 = iso(y2, mm2, Math.min(+m[1], dernier(y2, mm2))); }
        r.date = c2;
      }
    } else if ((m = ote(/\ble\s+(\d{1,2})\b/i)) && +m[1] >= 1 && +m[1] <= 31) {
      r.date = prochainQuantieme(auj, +m[1]);
    }
    if (!r.heure && moment) r.heure = moment === 'matin' ? '09:00' : moment === 'midi' ? '12:00' : moment === 'soir' ? '20:00' : moment === 'minuit' ? '00:00' : '14:00';

    // Le titre : ce qu'il reste, sans les petits mots qui trainent
    var estAnniv = /anniv/i.test(s);
    if (estAnniv && (m = ote(/\b(\d{1,3})\s*ans\b/i)) && r.date) r.naissance = String(+r.date.slice(0, 4) - +m[1]);
    if (estAnniv && anneeDonnee && anneeDonnee < annee) r.naissance = String(anneeDonnee);
    s = s.replace(/\s+/g, ' ').trim();
    var avant;
    do {
      avant = s;
      s = s.replace(/^(?:[,.;:!?-]+|et|puis|ajoute|ajouter|note|noter|mets|mettre|j'ai|je dois|je vais|on a|on doit|on va|nous avons|il y a|y a|de|d'|que|qu'|pour|le|la|les|au|aux|à|a|en|ce|cet|cette)(?=\s|$)\s*/i, '');
      s = s.replace(/^d'/i, '');
      s = s.replace(/\s*[,.;:!?-]+$|\s+(?:et|puis|de|d'|pour|le|la|les|au|aux|à|a|en|ce|cet|cette|du|vers|avec)$/i, '');
    } while (s !== avant);
    r.titre = s.charAt(0).toUpperCase() + s.slice(1);

    // Le sticker, devine d'apres les mots
    var bas = r.titre.toLowerCase();
    for (var i = 0; i < STICKERS.length; i++) if (STICKERS[i][0].test(bas)) { r.sticker = STICKERS[i][1]; break; }
    if (r.sticker === '🎂' && r.repete === 'non') r.repete = 'an';

    // Le rappel : le plus proche de ceux que propose le formulaire
    if (r._rappel !== undefined) {
      var v = r._rappel >= 0 ? r._rappel : (r.heure ? 60 : 0);
      r.rappel = String(RAPPELS.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }));
      delete r._rappel;
    }
    return r;
  }

  var api = { lire: lire };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.luxPhrase = api;
})(this);
