#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * GS1 AI Crawler (v2)
 * - Lädt das offizielle JSON-LD Dataset: https://ref.gs1.org/ai/GS1_Application_Identifiers.jsonld
 * - Nutzt jsonld.flatten(), um unabhängig von @graph/@context-Layout zu sein.
 * - Extrahiert ai, title, description, regex, separatorRequired, requires, requiresOneOf, excludes.
 *
 * Node 18+ empfohlen (global fetch). Abhängigkeit: jsonld
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = {
  url: getArg('--url', 'https://ref.gs1.org/ai/GS1_Application_Identifiers.jsonld'),
  out: getArg('--out', 'gs1_ai.json'),
  lang: getArg('--lang', 'de'),
  pretty: args.includes('--pretty'),
};
function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = 'https://ref.gs1.org';
const AI_PAGE = `${BASE}/ai/`;

/** Hilfen */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** JSON-LD flatten: dynamischer Import (CJS-kompatibel) */
async function flattenJsonLd(doc) {
  const jsonld = (await import('jsonld')).default || (await import('jsonld'));
  // jsonld.flatten() liefert ein Objekt mit @graph (geflachte Knoten)
  return jsonld.flatten(doc);
}

/** Laden (mit Retry) */
async function fetchJson(url, headers = {}) {
  const h = {
    'Accept': 'application/ld+json, application/json;q=0.9, */*;q=0.8',
    'Accept-Language': opt.lang,
    'User-Agent': 'gs1-ai-crawler/2.0',
    ...headers,
  };
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: h });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      last = e;
      await sleep(200 * attempt);
    }
  }
  throw last || new Error('fetch failed');
}

/** Sprache wählen (aus JSON-LD Value-Objekten) */
function pickLangFromValues(value, langPref = 'de') {
  // value kann sein: { "@value": "...", "@language":"de" } | [ ... ] | string
  const pickOne = (v) => {
    if (v == null) return undefined;
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) {
      // zuerst exakte Sprache
      const exact = v.find(o => o && typeof o === 'object' && (o['@language'] || o.language) === langPref);
      if (exact && (exact['@value'] || exact.value)) return exact['@value'] || exact.value;
      const anyObj = v.find(o => o && typeof o === 'object' && (o['@value'] || o.value));
      if (anyObj) return anyObj['@value'] || anyObj.value;
      const anyStr = v.find(s => typeof s === 'string');
      return anyStr;
    }
    if (typeof v === 'object') {
      if ((v['@language'] || v.language) === langPref) return v['@value'] || v.value;
      return v['@value'] || v.value;
    }
    return String(v);
  };
  return pickOne(value);
}

/** AI-Code aus ID / Feldern */
function extractAiCode(node) {
  // Bevorzugt @id wie https://ref.gs1.org/ai/01
  const id = node['@id'];
  if (typeof id === 'string') {
    const m = id.match(/\/ai\/([0-9]{2,4})(?:[^0-9]|$)/);
    if (m) return m[1];
  }
  // Fallback: durchsuche mögliche Felder
  for (const k of Object.keys(node)) {
    if (/applicationidentifier|^ai$|code|notation/i.test(k)) {
      const v = node[k];
      if (typeof v === 'string') return v.replace(/[^0-9]/g, '');
      if (Array.isArray(v)) {
        const s = v.find(x => typeof x === 'string') || v.find(x => x && typeof x === 'object' && x['@value']);
        if (s) return (typeof s === 'string' ? s : s['@value']).replace(/[^0-9]/g, '');
      }
      if (v && typeof v === 'object' && v['@value']) {
        return String(v['@value']).replace(/[^0-9]/g, '');
      }
    }
  }
  return undefined;
}

/** Titel/Name/ShortTitle */
function extractTitle(node, lang) {
  // Suche semantische Keys (namespace-agnostisch)
  const keys = Object.keys(node).filter(k => /(title|label|name|shorttitle)$/i.test(k));
  for (const k of keys) {
    const val = pickLangFromValues(node[k], lang);
    if (val) return val;
  }
  return undefined;
}

/** Beschreibung */
function extractDescription(node, lang) {
  const keys = Object.keys(node).filter(k => /(description|note|comment)$/i.test(k));
  for (const k of keys) {
    const val = pickLangFromValues(node[k], lang);
    if (val) return val;
  }
  return undefined;
}

/** Regex / Pattern */
function extractRegex(node) {
  const keys = Object.keys(node).filter(k => /(regularExpression|regex|pattern|regexp)$/i.test(k));
  for (const k of keys) {
    // JSON-LD Value-Objekte
    const v = node[k];
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) {
      const s = v.find(x => typeof x === 'string') || v.find(x => x && x['@value']);
      if (s) return typeof s === 'string' ? s : s['@value'];
    }
    if (v && typeof v === 'object' && v['@value']) return v['@value'];
  }
  return undefined;
}

/** FNC1 / Separator required */
function extractSeparatorRequired(node) {
  const keys = Object.keys(node).filter(k => /(separator|required|fnc1)/i.test(k));
  for (const k of keys) {
    const val = node[k];
    // bools, strings "true"/"false"
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      if (/^(true|false)$/i.test(val)) return /^true$/i.test(val);
    }
    if (Array.isArray(val)) {
      const b = val.find(x => typeof x === 'boolean');
      if (typeof b === 'boolean') return b;
      const s = val.find(x => typeof x === 'string' && /^(true|false)$/i.test(x));
      if (s) return /^true$/i.test(s);
    }
  }
  return undefined;
}

/** Aus verschachtelten JSON-LD Werten AI-Codes sammeln (auch @list/@id) */
function collectAiIds(value) {
  const out = new Set();
  const visit = (v) => {
    if (!v) return;
    if (typeof v === 'string') {
      const m = v.match(/\/ai\/([0-9]{2,4})(?:[^0-9]|$)/);
      if (m) out.add(m[1]);
      else if (/^\d{2,4}$/.test(v)) out.add(v);
      return;
    }
    if (Array.isArray(v)) return v.forEach(visit);
    if (typeof v === 'object') {
      if (v['@id']) {
        const s = String(v['@id']);
        const m = s.match(/\/ai\/([0-9]{2,4})(?:[^0-9]|$)/);
        if (m) out.add(m[1]);
        else if (/^\d{2,4}$/.test(s)) out.add(s);
      }
      if (v['@list']) visit(v['@list']);
      // Fallback: alle Properties durchgehen
      Object.values(v).forEach(visit);
    }
  };
  visit(value);
  return [...out].sort((a, b) => (a.length - b.length) || a.localeCompare(b));
}

/** Mandatory Associations → requires / requiresOneOf
 * Heuristik:
 * - Wenn Wert eine @list (oder Array) mit >1 AI ist → oneOf-Gruppe
 * - Einzelne IDs → requires
 */
function extractMandatory(node) {
  const requires = new Set();
  const requiresOneOf = new Set();

  const candKeys = Object.keys(node).filter(k => /(mandatory|requires)/i.test(k));
  for (const k of candKeys) {
    const val = node[k];

    // Wenn JSON-LD Listen-Gruppen vorkommen, behandle jede Gruppe separat
    const groups = [];
    const collectGroups = (v) => {
      if (!v) return;
      if (Array.isArray(v)) {
        // Array könnte entweder eine Gruppe sein oder mehrere Gruppen
        // Erkenne @list/Objekte in Array
        if (v.some(x => x && typeof x === 'object' && ('@list' in x))) {
          v.forEach(x => x && x['@list'] && groups.push(x['@list']));
        } else {
          // behandle gesamtes Array als eine Gruppe (konservativ)
          groups.push(v);
        }
      } else if (typeof v === 'object') {
        if (v['@list']) groups.push(v['@list']);
        // Falls Objekt weitere Felder hat, iteriere drüber
        Object.values(v).forEach(collectGroups);
      } else {
        groups.push([v]);
      }
    };
    collectGroups(val);

    if (!groups.length) {
      // Fallback: direkter Wert → requires
      collectAiIds(val).forEach(a => requires.add(a));
    } else {
      for (const g of groups) {
        const ids = collectAiIds(g);
        if (ids.length > 1) ids.forEach(a => requiresOneOf.add(a));
        else ids.forEach(a => requires.add(a));
      }
    }
  }

  return {
    requires: [...requires],
    requiresOneOf: [...requiresOneOf],
  };
}

/** Invalid pairings → excludes */
function extractExcludes(node) {
  const candKeys = Object.keys(node).filter(k => /(invalid|notTogether|exclude)/i.test(k));
  const set = new Set();
  for (const k of candKeys) {
    collectAiIds(node[k]).forEach(a => set.add(a));
  }
  return [...set];
}

/** Ein AI-Record aus einem geflatteten Knoten erzeugen */
function buildRecord(node, lang) {
  const ai = extractAiCode(node);
  if (!ai) return null;

  const title = extractTitle(node, lang);
  const description = extractDescription(node, lang);
  const regex = extractRegex(node);
  const separatorRequired = extractSeparatorRequired(node);
  const { requires, requiresOneOf } = extractMandatory(node);
  const excludes = extractExcludes(node);

  const rec = {
    ai,
    title,
    description,
    regex,
    separatorRequired,
    ...(requires.length ? { requires } : {}),
    ...(requiresOneOf.length ? { requiresOneOf } : {}),
    ...(excludes.length ? { excludes } : {}),
    source: `${AI_PAGE}${ai}`,
  };
  // Leere Felder verwerfen
  Object.keys(rec).forEach(k => (rec[k] == null || rec[k] === '') && delete rec[k]);
  return rec;
}

/** Hauptprogramm */
(async () => {
  console.log(`ℹ️  Lade JSON-LD Dataset: ${opt.url}`);
  let raw;
  try {
    raw = await fetchJson(opt.url);
  } catch (e) {
    console.error(`❌ Laden fehlgeschlagen: ${e.message}`);
    console.error(`Tipp: Die Browser-Seite referenziert das Dataset explizit als JSON-LD (${AI_PAGE}).`);
    process.exit(1);
  }

  let flattened;
  try {
    flattened = await flattenJsonLd(raw);
  } catch (e) {
    console.error(`❌ JSON-LD flatten fehlgeschlagen: ${e.message}`);
    process.exit(1);
  }

  const nodes = Array.isArray(flattened) ? flattened
               : (flattened['@graph'] || flattened.graph || []);
  if (!Array.isArray(nodes) || !nodes.length) {
    console.error('❌ Kein Knoten nach Flatten gefunden.');
    process.exit(1);
  }

  // Nur AI-Knoten nehmen (ID endet auf /ai/<digits>)
  const aiNodes = nodes.filter(n => {
    const id = n['@id'];
    return typeof id === 'string' && /\/ai\/\d{2,4}(?:[^0-9]|$)/.test(id);
  });

  const out = [];
  for (const n of aiNodes) {
    const rec = buildRecord(n, opt.lang);
    if (rec) out.push(rec);
  }

  // sortieren numerisch
  out.sort((a, b) => {
    const na = Number(a.ai);
    const nb = Number(b.ai);
    if (na !== nb && Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.ai.localeCompare(b.ai);
  });

  const payload = opt.pretty ? JSON.stringify(out, null, 2) : JSON.stringify(out);
  fs.writeFileSync(path.resolve(opt.out), payload, 'utf8');
  console.log(`✅ OK – ${out.length} AI-Einträge → ${path.resolve(opt.out)}`);
})();
