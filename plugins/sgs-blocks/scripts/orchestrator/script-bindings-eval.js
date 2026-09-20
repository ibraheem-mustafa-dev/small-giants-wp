#!/usr/bin/env node
/**
 * script-bindings-eval.js - evaluate a Claude Design draft's width-only render values.
 *
 * Read by `script_bindings.py::resolve_tier_bindings`. It receives, as JSON on stdin, the draft's own
 * declarations (`const effW = ...`, `const mob = effW < 760, ...`) and the expressions of the render
 * values a template references (`secPad: mob ? '56px 20px' : '104px 52px'`), and evaluates each
 * expression at a set of viewport widths.
 *
 * SAFETY (the expressions are the draft's own text, so they are treated as untrusted):
 *   - a vm context with NO globals: no require, process, fs, network, timers, console;
 *   - code generation from strings is switched off (`Function(...)`, `eval` cannot compile);
 *   - a static refusal list (this, constructor, prototype, loops, new, backticks ...) is applied to
 *     every expression BEFORE it is compiled, with string literals blanked so quoted text is not
 *     mistaken for code;
 *   - a per-call timeout and an overall deadline;
 *   - the draft's state object `S` is a Proxy that answers `S.w` (the viewport width) and THROWS on
 *     any other key, so an expression that reads state is detected, never guessed.
 *
 * Input JSON:
 *   { declarations: [{name, expr}], bindings: [{name, expr}],
 *     tiers:  {mobile: 375, tablet: 768, desktop: 1440},
 *     ranges: {mobile: [320, 767], tablet: [768, 1023], desktop: [1024, 2560]},
 *     width_state_key: "w", timeout_ms: 250, deadline_ms: 20000 }
 * Output JSON:
 *   { bindings: { name: { ok, tiers: {mobile, tablet, desktop}, runs: {tier: [{from, to, value}]},
 *                         error } },
 *     declarations_failed: { name: reason } }
 *
 * Sweep: every tier's range (clamped to 320-2560 px) is sampled at each integer literal in the
 * expressions (+/- 1) and every 16 px, so a breakpoint inside a device tier shows as more than one run.
 * Sampled, not exhaustive: an expression that moves a threshold by arithmetic (effW - 20 < 300) is
 * only caught if a 16 px sample lands on the far side of it.
 */
'use strict';

const vm = require('vm');

const REFUSED = /\b(this|constructor|prototype|__proto__|globalThis|global|eval|Function|require|process|import|async|await|yield|while|for|do|with|new|class|function|delete|debugger|throw|try)\b/;
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Replace the inside of every string literal with spaces; report a backtick (template literal). */
function blankStrings(src) {
  let out = '';
  let quote = '';
  let backtick = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') { out += '  '; i += 1; continue; }
      if (ch === quote) { quote = ''; out += ch; continue; }
      out += ' ';
      continue;
    }
    if (ch === '`') { backtick = true; out += ch; continue; }
    if (ch === "'" || ch === '"') { quote = ch; out += ch; continue; }
    out += ch;
  }
  return { code: out, backtick, unterminated: quote !== '' };
}

/** null when the expression may be compiled, otherwise the reason it is refused. */
function refusal(expr) {
  const { code, backtick, unterminated } = blankStrings(expr);
  if (unterminated) return 'unterminated string literal';
  if (backtick) return 'template literal (backtick) is not evaluated';
  const hit = code.match(REFUSED);
  if (hit) return 'uses `' + hit[1] + '`, which is not a plain width expression';
  return null;
}

function reasonFromError(err) {
  const msg = String((err && err.message) || err);
  const ref = msg.match(/^(\S+) is not defined$/);
  if (ref) return 'depends on `' + ref[1] + '`, which is not a width flag or a literal';
  if (/timed out/i.test(msg)) return 'evaluation timed out';
  return msg;
}

function isPlain(v) {
  return typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));
}

function main(input) {
  const timeout = input.timeout_ms || 250;
  const deadline = Date.now() + (input.deadline_ms || 20000);
  const widthKey = input.width_state_key || 'w';
  const ctx = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(
    'var __st = {' + widthKey + ': 0};' +
    'var S = new Proxy(__st, {' +
    ' get: function (t, k) { if (k === ' + JSON.stringify(widthKey) + ') return t[k]; throw new Error("reads state S." + String(k)); },' +
    ' set: function () { throw new Error("writes state"); },' +
    ' has: function () { return true; } });',
    ctx,
  );

  const declarationsFailed = {};
  const decls = [];
  for (const d of input.declarations || []) {
    const why = !IDENT.test(d.name) ? 'not a plain identifier' : refusal(d.expr);
    if (why) { declarationsFailed[d.name] = why; continue; }
    try {
      decls.push({ name: d.name, expr: d.expr, script: new vm.Script(d.name + ' = (' + d.expr + ')') });
    } catch (err) {
      declarationsFailed[d.name] = reasonFromError(err);
    }
  }

  const binds = {};
  for (const b of input.bindings || []) {
    const why = refusal(b.expr);
    const entry = { name: b.name, expr: b.expr, script: null, ok: false, error: why, tiers: {}, samples: [] };
    if (!why) {
      try { entry.script = new vm.Script('(' + b.expr + ')'); } catch (err) { entry.error = reasonFromError(err); }
    }
    binds[b.name] = entry;
  }

  const literalWidths = new Set();
  const literalRe = /(?<![\w.])\d{2,4}(?![\w.])/g;
  for (const src of [].concat(decls.map((d) => d.expr), Object.values(binds).map((b) => b.expr))) {
    let m;
    const { code } = blankStrings(src);
    while ((m = literalRe.exec(code)) !== null) literalWidths.add(parseInt(m[0], 10));
  }

  /** Evaluate every declaration then every binding at one width; returns {name: value | Error}. */
  function evaluateAt(width) {
    ctx.__st[widthKey] = width;
    for (const d of decls) {
      try {
        d.script.runInContext(ctx, { timeout });
      } catch (err) {
        delete ctx[d.name];
        declarationsFailed[d.name] = declarationsFailed[d.name] || reasonFromError(err);
      }
    }
    const out = {};
    for (const b of Object.values(binds)) {
      if (!b.script) continue;
      try {
        const v = b.script.runInContext(ctx, { timeout });
        out[b.name] = isPlain(v) ? { value: v } : { error: 'is not a plain string, number or boolean value' };
      } catch (err) {
        out[b.name] = { error: reasonFromError(err) };
      }
    }
    return out;
  }

  const runs = {};
  for (const b of Object.values(binds)) runs[b.name] = {};

  for (const tier of Object.keys(input.tiers)) {
    // Realistic viewport widths only: a range such as Mobile 1-767 or Desktop 1024-2147483647 is clamped.
    const lo = Math.max(input.ranges[tier][0], 320);
    const hi = Math.min(input.ranges[tier][1], 2560);
    const widths = new Set([input.tiers[tier], lo, hi]);
    for (let w = lo; w <= hi; w += 16) widths.add(w);
    for (const L of literalWidths) {
      for (const w of [L - 1, L, L + 1]) if (w >= lo && w <= hi) widths.add(w);
    }
    const ordered = Array.from(widths).sort((a, b) => a - b);
    const perBinding = {};
    for (const w of ordered) {
      if (Date.now() > deadline) throw new Error('overall deadline exceeded');
      const values = evaluateAt(w);
      for (const [name, res] of Object.entries(values)) {
        const b = binds[name];
        if (res.error) {
          if (!b.error) b.error = res.error + ' (at width ' + w + ')';
          continue;
        }
        const list = (perBinding[name] = perBinding[name] || []);
        const last = list[list.length - 1];
        if (last && last.value === res.value) last.to = w;
        else list.push({ from: w, to: w, value: res.value });
      }
    }
    for (const [name, list] of Object.entries(perBinding)) runs[name][tier] = list;
    // The sample value is the value AT the tier's fixed width (375 / 768 / 1440).
    const sampleValues = evaluateAt(input.tiers[tier]);
    for (const b of Object.values(binds)) {
      const res = sampleValues[b.name];
      if (res && !res.error) b.tiers[tier] = res.value;
    }
  }

  const bindings = {};
  for (const b of Object.values(binds)) {
    const complete = Object.keys(input.tiers).every((t) => Object.prototype.hasOwnProperty.call(b.tiers, t));
    const ok = complete && !b.error;
    bindings[b.name] = { ok, tiers: ok ? b.tiers : null, runs: ok ? runs[b.name] : null, error: ok ? null : (b.error || 'not evaluated') };
  }
  return { bindings, declarations_failed: declarationsFailed };
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    process.stdout.write(JSON.stringify(main(JSON.parse(raw))));
  } catch (err) {
    process.stdout.write(JSON.stringify({ fatal: String((err && err.message) || err) }));
    process.exitCode = 1;
  }
});
