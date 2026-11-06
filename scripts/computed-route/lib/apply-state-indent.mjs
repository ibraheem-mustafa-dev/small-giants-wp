// State motion, indent. A hover the draft gives as a start-padding change (`style-hover="padding-left:16px"`) is the motion hover
// layer's Indent: `indent` is the hover padding minus the resting padding (the channel adds it to the rest), and `restIndent` is
// the resting padding itself, which the channel then sets (Spec 38A 5.1). The resting padding is the draft's computed read at 1440;
// the hover padding is the record's. A layer already holding both values is `equal`.
import { hoverLayer } from './motion-layers.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';
import { INDENT_PROPS } from './fill-state-motion.mjs';
import { recordsFor } from './apply-records.mjs';

const px = ( v ) => ( /^-?[\d.]+px$/.test( String( v ?? '' ).trim() ) ? parseFloat( v ) : null );
const round = ( n ) => Math.round( n * 100 ) / 100;

export function indentHover( { target, block, saved, draft, recordsIndex, tools } ) {
	const records = recordsFor( recordsIndex, target.tpl ).filter( ( r ) => 'hover' === r.trigger?.type );
	const rec = records.find( ( r ) => ( r.properties || [] ).some( ( p ) => INDENT_PROPS.includes( p.property ) && null !== p.to && undefined !== p.to ) );
	if ( ! rec ) {
		return [];
	}
	const look = rec.properties.find( ( p ) => INDENT_PROPS.includes( p.property ) );
	const item = ( o ) => ( { prop: 'hover indent', state: 'hover', ...o } );
	const to = px( look.to );
	const rest = px( draft[ 1440 ]?.styles?.[ 'padding-left' ] );
	if ( null === to || null === rest ) {
		return [ item( { status: 'no-setting', why: `${ rec.id } indents to ${ look.to } from ${ draft[ 1440 ]?.styles?.[ 'padding-left' ] ?? 'an unread resting padding' }: the Indent fields take px lengths` } ) ];
	}
	if ( to === rest ) {
		return [];
	}
	const { mdb, schema } = tools;
	if ( ! mdb.targetsOf( block ).some( ( t ) => 'root' === t.target ) || ! mdb.field( 'hover.state', 'values.restIndent' ) ) {
		return [ item( { status: 'no-setting', why: `${ block } declares no root hover state with an Indent field` } ) ];
	}
	const layer = hoverLayer( [ { ...rec, properties: [ { ...look, from: `${ rest }px` } ] } ], mdb ).layer;
	if ( ! layer ) {
		return [ item( { status: 'no-setting', why: `${ rec.id }: the hover layer holds no indent for ${ look.to }` } ) ];
	}
	const held = saved.sgsMotion?.elements?.root?.hover?.state?.values;
	const want = { ...( held ? {} : layer.values ), indent: round( to - rest ), ...( rest ? { restIndent: rest } : {} ) };
	if ( held && Object.entries( want ).every( ( [ k, v ] ) => held[ k ] === v ) ) {
		return [ item( { status: 'equal', why: `the saved hover layer already indents ${ want.indent }px from ${ rest }px` } ) ];
	}
	const doc = structuredClone( saved.sgsMotion ?? { v: 1, elements: {} } );
	doc.elements ??= {};
	doc.elements.root ??= {};
	doc.elements.root.hover = { ...( doc.elements.root.hover || {} ), state: { ...( doc.elements.root.hover?.state || {} ), values: { ...( held || {} ), ...want } } };
	const verdict = validateMotionWrite( doc, schema );
	if ( ! verdict.valid ) {
		return [ item( { status: 'no-setting', why: `sgsMotion write refused: ${ verdictProblems( verdict ).join( '; ' ).slice( 0, 300 ) }` } ) ];
	}
	return [ item( {
		status: 'op',
		why: `${ target.tpl } rests at ${ rest }px and indents to ${ to }px on hover (${ rec.id }): indent ${ want.indent }, restIndent ${ rest }`,
		writes: [ { attr: 'sgsMotion', value: { v: 1, elements: { root: { hover: { state: { values: want } } } } }, merge: 'deep' } ],
		checks: [ { width: 1440, prop: 'padding-left', want: `${ rest }px` } ],
		record: rec.id,
	} ) ];
}
