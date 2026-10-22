// An SVG <set> element (a discrete attribute switch at a moment) as the entrance it can be (Spec 38A §6.2; Spec 48
// FR-48-78). An entrance holds its from-pose through its delay and its to-pose after its duration, so a <set> that
// switches `opacity` (or `visibility`, visible or hidden) once, at a clock time after load, and keeps the value, is
// the entrance { from: the value before, to: the value set } with duration 0 and the begin time as its delay. A <set>
// that begins on an event or another element, reverts after a time, or switches any other attribute is a behaviour or
// a value no entrance channel holds: it is reported with that reason, never approximated.

import { msOf } from './motion-tokens.mjs';

export const COVERAGE_WRITES = [
	'svg:set',
];

const VISIBILITY = { visible: 1, hidden: 0 };

// A SMIL clock value (`2s`, `500ms`, `0.5`; no unit is seconds) as ms; null for an event, a sync-base or `indefinite`.
function beginMs( begin ) {
	if ( null === begin || undefined === begin || '' === String( begin ).trim() ) {
		return 0;
	}
	const text = String( begin ).trim();
	return /^\d*\.?\d+$/.test( text ) ? msOf( `${ text }s` ) : /^\d*\.?\d+(?:ms|s)$/.test( text ) ? msOf( text ) : null;
}

// The opacity a <set> value stands for on the attribute, or null when the attribute is not one an entrance holds.
function opacityOf( attributeName, value, fallback ) {
	const v = null === value || undefined === value || '' === value ? fallback : value;
	if ( 'opacity' === attributeName ) {
		return Number.isFinite( Number( v ) ) ? Number( v ) : null;
	}
	return 'visibility' === attributeName ? VISIBILITY[ String( v ).trim() ] ?? null : null;
}

// One sampled <set> ({ tag, attributeName, to, begin, end, dur, fill, base }; `base` is the attribute the element
// carries before the <set> applies) as { record } (an entrance record the writer finishes like any other) or { reason }.
export function setRecord( a, index = 0 ) {
	const name = `<set ${ a.attributeName || '' }>`;
	const delay = beginMs( a.begin );
	if ( null === delay ) {
		return { reason: `${ name } begins on "${ a.begin }", an event or another element: the visitor's action drives it, not a moment after load` };
	}
	if ( ( ( a.end && 'indefinite' !== a.end ) || ( a.dur && 'indefinite' !== a.dur ) ) && 'freeze' !== a.fill ) {
		return { reason: `${ name } reverts after ${ a.dur || a.end } (no fill="freeze"): an entrance keeps its end pose` };
	}
	const from = opacityOf( a.attributeName, a.base, 'visibility' === a.attributeName ? 'visible' : 1 );
	const to = opacityOf( a.attributeName, a.to, null );
	if ( null === to || null === from ) {
		return { reason: `${ name } switches ${ a.attributeName || 'an attribute' } to "${ a.to }", which no entrance channel holds (only opacity and visibility)` };
	}
	if ( from === to ) {
		return { reason: `${ name } sets ${ a.attributeName } to the value the element already has` };
	}
	return {
		record: {
			id: `set${ index }`, name, mechanism: 'smil-set', status: 'active', element: { template_tpl_id: null },
			trigger: { type: 'load', detail: `SVG ${ name } begin ${ a.begin ?? '0s' }` },
			properties: [ { property: 'opacity', from, to } ], duration_ms: 0, delay_ms: delay, easing: 'linear', iterations: 1, direction: 'normal',
		},
	};
}
