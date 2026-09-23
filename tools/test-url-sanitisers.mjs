#!/usr/bin/env node
// Build: 20260923-001
// test-url-sanitisers.mjs — three copies of one five-line function, and the
// only thing that matters is whether they still agree.
//
// WaxFrame has three functions that decide whether a URL is safe to put in an
// href: safeUrl() in js/app.js, _safeImportUrl() in js/storage.js, and
// safeUrl() in js/pricing-renderer.js. Each takes a value from somewhere the
// user does not control — a saved checkpoint, an imported hive, the pricing
// worker — and returns the URL or an empty string.
//
// **Three copies is deliberate rather than an oversight.** Those files share no
// module: the pricing page loads neither app.js nor storage.js, and the
// alternative is a new script tag on seventeen pages to host five lines. What
// is NOT acceptable is the failure that actually happens, which this suite has
// already seen once in another repository: four files grew their own escaping
// function and one of them disagreed with the others. Sameness is the property
// worth guarding, not the count.
//
// So this does not compare their source text, which differs by style and would
// fail on a rename. It EXTRACTS each function, runs all three against one table
// of inputs, and fails if any two disagree on any of them. A drift is reported
// as the input they disagreed on and what each returned.
//
// Usage:  node tools/test-url-sanitisers.mjs
// Exit 0 = all three agree, and they agree with what the table expects.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Where each copy lives, and what it is called. */
const COPIES = [
  { file: 'js/app.js', name: 'safeUrl' },
  { file: 'js/storage.js', name: '_safeImportUrl' },
  { file: 'js/pricing-renderer.js', name: 'safeUrl' },
];

// A URL is safe for an href only if it is http or https. Everything else is
// either a script URL, a way to render attacker-chosen markup, or not a URL.
//
// `expect` is what the behaviour is supposed to be. It is asserted as well as
// the agreement, because three copies that agree on a wrong answer are not
// better than one wrong copy — that is the whole lesson of the vendored-library
// pass, where three watchdogs agreed on a version nobody had.
const CASES = [
  { in: 'https://example.com/pricing', expect: 'https://example.com/pricing' },
  { in: 'http://localhost:11434/v1', expect: 'http://localhost:11434/v1' },
  { in: 'https://example.com/a?q=1#f', expect: 'https://example.com/a?q=1#f' },
  { in: 'HTTP://Example.COM/B', expect: 'http://example.com/B' },
  { in: 'https://example.com', expect: 'https://example.com/' },

  // The one that escaping does not touch. It survives an HTML escaper intact
  // and is still a script URL when the attribute is parsed.
  { in: 'javascript:alert(1)', expect: '' },
  { in: 'JavaScript:alert(1)', expect: '' },
  { in: '  javascript:alert(1)', expect: '' },
  { in: 'java\tscript:alert(1)', expect: '' },
  { in: '\u0001javascript:alert(1)', expect: '' },

  { in: 'data:text/html;base64,PHNjcmlwdD4=', expect: '' },
  { in: 'vbscript:msgbox(1)', expect: '' },
  { in: 'file:///C:/Windows/System32', expect: '' },
  { in: 'blob:https://example.com/abc', expect: '' },

  // Not absolute, so not a URL at all without a base. A relative value in an
  // href resolves against whatever page it lands on, which is how an imported
  // endpoint would have pointed at waxframe.com itself.
  { in: '/v1/chat/completions', expect: '' },
  { in: '//evil.example/x', expect: '' },
  { in: 'example.com/pricing', expect: '' },

  { in: '', expect: '' },
  { in: null, expect: '' },
  { in: undefined, expect: '' },
  { in: 42, expect: '' },
  { in: {}, expect: '' },
  { in: [], expect: '' },
];

/** The source of one `function NAME(...) { ... }` declaration, braces matched.
 *
 * Leading indentation is allowed: pricing-renderer.js wraps its whole module in
 * an IIFE, so its copy is indented two spaces and an anchored `^function` found
 * nothing. The first draft of this reader did exactly that and reported the
 * function as missing, which is the right direction for a reader to fail in but
 * is still a reader that was wrong. */
function extractFunction(source, name) {
  const start = source.search(
    new RegExp(`^[ \\t]*function\\s+${name}\\s*\\(`, 'm'));
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  if (open < 0) return null;
  // A brace counter is enough here and a parser would not be: these bodies are
  // five lines with no strings, regexes or comments containing a brace. If that
  // ever stops being true this returns something that will not compile, which
  // fails loudly rather than silently matching the wrong text.
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

let bad = 0;
const fail = (msg, detail) => {
  bad++;
  console.log(`    \u2717 ${msg}`);
  if (detail !== undefined) console.log(`        ${detail}`);
};
const ok = (msg) => console.log(`    \u2713 ${msg}`);

console.log('test-url-sanitisers — three copies of one decision\n');

const loaded = [];
for (const copy of COPIES) {
  const src = fs.readFileSync(path.join(ROOT, copy.file), 'utf8');
  const fnSrc = extractFunction(src, copy.name);
  if (!fnSrc) {
    fail(`${copy.file}: could not find function ${copy.name}`,
         'it was renamed, removed, or is no longer a top-level function '
         + 'declaration — this check is now blind and that is why it fails');
    continue;
  }
  let fn;
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function(`${fnSrc}; return ${copy.name};`)();
  } catch (e) {
    fail(`${copy.file}: ${copy.name} did not compile on its own`, e.message);
    continue;
  }
  loaded.push({ ...copy, fn, label: `${copy.file}:${copy.name}` });
}

if (loaded.length !== COPIES.length) {
  console.log(`\n\u274c test-url-sanitisers: ${bad} problem(s) — not every copy could be run.`);
  process.exit(1);
}
ok(`all ${loaded.length} copies extracted and callable`);

// Liveness. Every comparison below is vacuous if the table is empty, and an
// accidental edit that emptied it would leave a green check on nothing.
if (CASES.length < 20) {
  fail(`the case table has only ${CASES.length} entries`,
       'it is meant to cover the accepted schemes, the script schemes, the '
       + 'relative forms and the non-strings');
} else {
  ok(`${CASES.length} inputs in the table`);
}

let disagreements = 0;
let wrong = 0;
for (const c of CASES) {
  const results = loaded.map(l => {
    try { return { label: l.label, out: l.fn(c.in) }; }
    catch (e) { return { label: l.label, out: `THREW: ${e.message}` }; }
  });
  const distinct = [...new Set(results.map(r => JSON.stringify(r.out)))];
  if (distinct.length > 1) {
    disagreements++;
    fail(`the copies disagree on ${JSON.stringify(c.in)}`,
         results.map(r => `${r.label} -> ${JSON.stringify(r.out)}`).join('\n        '));
    continue;
  }
  if (results[0].out !== c.expect) {
    wrong++;
    fail(`all three agree on ${JSON.stringify(c.in)} and all three are wrong`,
         `got ${JSON.stringify(results[0].out)}, expected ${JSON.stringify(c.expect)}`);
  }
}
if (!disagreements) ok('no input produces a different answer in any copy');
if (!wrong) ok('every answer is the one the table requires');

console.log(bad
  ? `\n\u274c test-url-sanitisers: ${bad} problem(s).`
  : '\n\u2705 test-url-sanitisers: three copies, one behaviour.');
process.exit(bad ? 1 : 0);
