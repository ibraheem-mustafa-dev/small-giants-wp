// The trace check's event matching: an event with no nearest template id is keyed as '-', so it never matches a record
// whose template id is null. trace-check.mjs runs a browser at import, so this mirrors its two matching lines.
import test from 'node:test';
import assert from 'node:assert/strict';

const names = (r, t) => String(r.element?.template_tpl_id) === t
  || [].concat(r.element?.nearest_tpl_id ?? []).map(String).includes(t)
  || JSON.stringify(r.element || {}).includes(`"${t}"`)
  || JSON.stringify(r.trace || {}).includes(t);
const durOk = (r, dur) => Number(r.duration_ms) === Number(dur);

const eventKey = (c) => `${c.kind}|${c.tpl || '-'}|${c.near || '-'}|${c.dur}`;
const matchFor = (key, recs) => {
  const [, tpl, near, dur] = key.split('|');
  return recs.find((r) => durOk(r, dur) && [tpl, near].some((t) => t && t !== '-' && names(r, t)));
};

test( 'an event with no nearest template id matches no record with a null template id', () => {
  const recs = [ { duration_ms: 300, element: { template_tpl_id: null } } ];
  assert.equal( matchFor(eventKey({ kind: 'waapi', tpl: null, near: null, dur: 300 }), recs), undefined );
} );

test( 'an event with a template id still matches the record that names it', () => {
  const recs = [ { duration_ms: 300, element: { template_tpl_id: 'tpl-7' } } ];
  assert.equal( matchFor(eventKey({ kind: 'waapi', tpl: 'tpl-7', near: null, dur: 300 }), recs), recs[ 0 ] );
} );
