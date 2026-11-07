// Chrome rule: the process steps' number badge hover as the number part's own motion hover (sgs/process-steps). The draft's badge
// moves only when the pointer is on the badge itself (a style-hover record on the badge element); the cloner wrote that movement as
// a `.step:hover .number` rule in sgsCustomCss, which makes the whole step the trigger. The record becomes the `number` part's
// hover layer (source self) and the hand rule's motion declarations leave sgsCustomCss. The colours stay with
// numberBackgroundHover and numberColourHover (trigger numberHoverTrigger, written beside).
import { elementMotion } from './fill-motion-element.mjs';
import { motionTools } from './apply-family-statemotion.mjs';
import { MOTION_LOOKS } from './apply-hover.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';
import { recordsOf, settle } from './apply-chrome-records.mjs';

const TARGET = /\.sgs-process-steps__step:hover\s+\.sgs-process-steps__number(?![\w:-])/;
const SOLE = '& .sgs-process-steps__step:hover .sgs-process-steps__number';
const MOTION_DECL = /^(?:transform|translate|scale|rotate)\s*:/i;

// The top-level rules of a stylesheet as { head, body, start, end }; an at-rule's body holds its nested rules.
function topRules( css ) {
	const out = [];
	let i = 0;
	while ( i < css.length ) {
		const open = css.indexOf( '{', i );
		if ( open < 0 ) {
			break;
		}
		let depth = 1;
		let j = open + 1;
		while ( j < css.length && depth ) {
			depth += '{' === css[ j ] ? 1 : ( '}' === css[ j ] ? -1 : 0 );
			j++;
		}
		out.push( { head: css.slice( i, open ), body: css.slice( open + 1, j - 1 ), start: i, end: j } );
		i = j;
	}
	return out;
}

// The step-hover motion the badge's own hover replaces. A top-level rule whose only selector is `.step:hover .number` loses its
// motion declarations, and the rule once nothing else is left; its other declarations stay. A target inside a selector list, an
// at-rule or a pseudo-element is listed in `blocked` and left alone. Returns { css, changed, blocked }.
export function stripStepHover( css ) {
	let out = '';
	let at = 0;
	let changed = false;
	const blocked = [];
	for ( const r of topRules( css ) ) {
		if ( ! TARGET.test( r.head ) && ! TARGET.test( r.body ) ) {
			continue;
		}
		if ( r.head.trim().replace( /\s+/g, ' ' ) !== SOLE ) {
			blocked.push( r.head.trim().slice( 0, 80 ) );
			continue;
		}
		const decls = r.body.split( ';' ).map( ( d ) => d.trim() ).filter( Boolean );
		const kept = decls.filter( ( d ) => ! MOTION_DECL.test( d ) );
		if ( kept.length === decls.length ) {
			continue;
		}
		changed = true;
		const lead = r.head.match( /^\s*/ )[ 0 ];
		if ( kept.length ) {
			out += `${ css.slice( at, r.start ) }${ lead }${ r.head.trim() }{${ kept.join( ';' ) };}`;
			at = r.end;
		} else {
			out += css.slice( at, r.start );
			at = r.end;
		}
	}
	return { css: out + css.slice( at ), changed, blocked };
}

const holdsMotion = ( r ) => ( r.properties || [] ).some( ( p ) => MOTION_LOOKS.includes( p.property ) && null !== p.to && undefined !== p.to );

export function numberHover( ctx ) {
	const { saved, target, block, db, rawSnapshot } = ctx;
	const own = recordsOf( ctx, 'reach' ).filter( ( r ) => 'hover' === r.trigger?.type && /style-hover/.test( r.trigger?.detail ?? '' ) && holdsMotion( r ) );
	if ( ! db ) {
		return [];
	}
	const stripped = stripStepHover( saved.sgsCustomCss ?? '' );
	if ( ! own.length ) {
		return stripped.changed || stripped.blocked.length ? [ { status: 'no-setting', prop: 'number hover', state: 'hover', why: `${ target.tpl } keeps a step-wide hover rule in sgsCustomCss and the handoff holds no badge hover record to replace it` } ] : [];
	}
	if ( stripped.blocked.length ) {
		return [ { status: 'no-setting', prop: 'number hover', state: 'hover', why: `${ target.tpl } styles the step-hover badge inside ${ stripped.blocked.join( ' ; ' ) } (a selector list, at-rule or pseudo-element): the step would stay the trigger, so nothing is written` } ];
	}
	const { mdb, schema, ctx: mctx } = motionTools( db, rawSnapshot );
	if ( ! mdb.targetsOf( block ).some( ( t ) => 'number' === t.target ) ) {
		return [ { status: 'no-setting', prop: 'number hover', state: 'hover', why: `${ block } declares no number motion target` } ];
	}
	const m = elementMotion( own, { mdb, ctx: mctx, sampled: null, target: 'number', offers: { names: [], opens: [], openWords: new Set() } } );
	if ( ! m.element.hover ) {
		return [ { status: 'no-setting', prop: 'number hover', state: 'hover', why: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || 'no hover layer came from the records' } ];
	}
	const doc = structuredClone( saved.sgsMotion ?? { v: 1, elements: {} } );
	doc.elements = { ...( doc.elements || {} ), number: { ...( doc.elements?.number || {} ), hover: m.element.hover } };
	const verdict = validateMotionWrite( doc, schema );
	if ( ! verdict.valid ) {
		return [ { status: 'no-setting', prop: 'number hover', state: 'hover', why: `sgsMotion write refused: ${ verdictProblems( verdict ).join( '; ' ).slice( 0, 300 ) }` } ];
	}
	const writes = [ { attr: 'sgsMotion', value: { v: 1, elements: { number: { hover: m.element.hover } } }, merge: 'deep' } ];
	if ( stripped.changed ) {
		const rest = stripped.css.trim();
		writes.push( rest ? { attr: 'sgsCustomCss', value: rest } : { attr: 'sgsCustomCss', unset: true } );
	}
	return [ settle( { prop: 'number hover', why: `${ target.tpl } the badge moves on its own hover (${ own[ 0 ].id }), not the step's`, saved, writes, record: own[ 0 ].id, state: 'hover' } ) ];
}
