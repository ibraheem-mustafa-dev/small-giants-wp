// The words of a flow's opener (lib/site-build-flow-opener-label.mjs): the flow post's `openerLabel` is written from the words of the
// draft's control that opens it, after the product flow links. A flow whose product rows say different words, or whose buy box has
// openers that say different words, gets nothing; a row with no readable opener says why; a flow already holding the words plans
// nothing. Tests marked MUST FAIL fail on code that writes a guess, writes without reading back or writes a flow the site lacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { labelsPlan, planLabels, runOpenerLabels, labelApplyPhp, labelStatePhp, LABEL_ATTR, NOTE_FIELD } from '../lib/site-build-flow-opener-label.mjs';

const FLOW = 'choice-flow-add-prescription-lenses';
const product = ( slug, over = {} ) => ( { slug, postType: 'product', collection: 'live', opensFlow: FLOW, opens: [ { kind: 'flow', slug: FLOW, buyBox: true } ], ...over } );
const flowRow = { slug: FLOW, postType: 'sgs_choice_flow', collection: 'static' };
const said = ( ...words ) => ( { openers: words.map( ( label ) => ( { label } ) ) } );
const ROWS = [ product( 'product' ), flowRow ];

test( 'MUST FAIL: the flow takes the words of the draft\'s control that opens it', () => {
	const plan = labelsPlan( ROWS, () => said( 'Add my prescription' ) );
	assert.deepEqual( plan.flows, [ { slug: FLOW, rows: [ 'product' ], label: 'Add my prescription' } ] );
	assert.deepEqual( plan.notes, [] );
} );

test( 'MUST FAIL: product rows that say different words give the flow no label, and the notes name both', () => {
	const rows = [ product( 'product' ), product( 'product-two' ), flowRow ];
	const plan = labelsPlan( rows, ( r ) => said( 'product' === r.slug ? 'Add my prescription' : 'Add lenses' ) );
	assert.equal( plan.flows[ 0 ].label, null );
	assert.match( plan.notes.join( '\n' ), /say different opener words \("Add my prescription", "Add lenses"\), so no openerLabel is written/ );
} );

test( 'MUST FAIL: a buy box with two openers that say different words gives the flow no label', () => {
	const plan = labelsPlan( [ product( 'product' ), product( 'product-two' ), flowRow ], ( r ) => ( 'product' === r.slug ? said( 'Add my prescription', 'Add lenses' ) : said( 'Add my prescription' ) ) );
	assert.equal( plan.flows[ 0 ].label, null, 'even though the second row agrees with the first opener' );
	assert.match( plan.notes.join( '\n' ), /openers for flow .* that say different words/ );
} );

test( 'rows that agree, and rows that are not live buy-box rows, are handled (negative controls)', () => {
	const rows = [ product( 'a' ), product( 'b' ), product( 'c', { collection: 'static' } ), product( 'd', { opens: [ { kind: 'flow', slug: FLOW } ] } ), flowRow ];
	const asked = [];
	const plan = labelsPlan( rows, ( r ) => ( asked.push( r.slug ), said( 'Add my prescription' ) ) );
	assert.deepEqual( asked, [ 'a', 'b' ], 'a static row and a row whose buy box does not open the flow are never asked' );
	assert.equal( plan.flows[ 0 ].label, 'Add my prescription' );
} );

test( 'a row whose opener cannot be found says why and writes nothing', () => {
	const plan = labelsPlan( ROWS, () => ( { openers: [], why: 'no control in the buy box opens the flow' } ) );
	assert.equal( plan.flows[ 0 ].label, null );
	assert.match( plan.notes.join( '\n' ), /no opener words read for flow .*no control in the buy box opens the flow/ );
} );

test( 'planLabels: a changed label is an action, an equal one nothing, a missing flow post a problem (a note while pending)', () => {
	const plan = { flows: [ { slug: FLOW, rows: [ 'product' ], label: 'Add my prescription' } ], notes: [] };
	const act = planLabels( plan, { [ FLOW ]: { id: 120, label: 'Choose your options' } } );
	assert.deepEqual( act.actions.map( ( a ) => [ a.slug, a.id, a.from, a.to ] ), [ [ FLOW, 120, 'Choose your options', 'Add my prescription' ] ] );
	assert.deepEqual( planLabels( plan, { [ FLOW ]: { id: 120, label: 'Add my prescription' } } ).actions, [] );
	assert.match( planLabels( plan, { [ FLOW ]: null } ).problems.join( '' ), /no published sgs_choice_flow post/ );
	const pending = planLabels( plan, { [ FLOW ]: null }, { pending: true } );
	assert.deepEqual( pending.problems, [] );
	assert.match( pending.notes.join( '' ), /no published sgs_choice_flow post/ );
	assert.deepEqual( planLabels( { flows: [ { slug: FLOW, rows: [], label: null } ], notes: [] }, {} ).actions, [], 'no label is no action' );
} );

const logs = () => {
	const out = { log: [], error: [] };
	return { out, log: ( m ) => out.log.push( m ), error: ( m ) => out.error.push( m ) };
};
const phpRunner = ( { start = 'Choose your options', end = 'Add my prescription' } = {} ) => {
	const calls = [];
	const run = ( code ) => {
		calls.push( code );
		if ( code.includes( 'resolve_choice_flow' ) ) {
			return JSON.stringify( { [ FLOW ]: { id: 120, label: calls.some( ( c ) => c.includes( 'wp_update_post' ) ) ? end : start } } );
		}
		return JSON.stringify( { set: 1, wrong: [] } );
	};
	return { run, calls };
};

test( 'MUST FAIL: a dry run prints the plan and writes nothing; an apply writes the label', () => {
	const dry = logs();
	const php = phpRunner();
	assert.equal( runOpenerLabels( { rows: ROWS, controlsOf: () => said( 'Add my prescription' ), runPhp: php.run, apply: false, log: dry.log, error: dry.error } ), 0 );
	assert.match( dry.out.log.join( '\n' ), /openerLabel "Choose your options" -> "Add my prescription"/ );
	assert.match( dry.out.log.join( '\n' ), /1 opener label\(s\) to set \(dry run/ );
	assert.ok( ! php.calls.some( ( c ) => c.includes( 'wp_update_post' ) ), 'a dry run never updates the post' );
	const live = logs();
	const apply = phpRunner();
	assert.equal( runOpenerLabels( { rows: ROWS, controlsOf: () => said( 'Add my prescription' ), runPhp: apply.run, apply: true, log: live.log, error: live.error } ), 0 );
	assert.ok( apply.calls.some( ( c ) => c.includes( 'wp_update_post' ) ) );
	assert.match( live.out.log.join( '\n' ), /1 opener label\(s\) set/ );
} );

test( 'MUST FAIL: a read-back that disagrees fails the step', () => {
	const l = logs();
	const run = ( code ) => ( code.includes( 'resolve_choice_flow' ) ? JSON.stringify( { [ FLOW ]: { id: 120, label: 'x' } } ) : JSON.stringify( { set: 0, wrong: [ { slug: FLOW, label: 'x' } ] } ) );
	assert.equal( runOpenerLabels( { rows: ROWS, controlsOf: () => said( 'Add my prescription' ), runPhp: run, apply: true, log: l.log, error: l.error } ), 1 );
	assert.match( l.out.error.join( '\n' ), /FAILED: 0 set; read back wrong/ );
} );

test( 'MUST FAIL: a flow post the site lacks stops the step before any write', () => {
	const l = logs();
	const calls = [];
	const run = ( code ) => ( calls.push( code ), JSON.stringify( { [ FLOW ]: null } ) );
	assert.equal( runOpenerLabels( { rows: ROWS, controlsOf: () => said( 'Add my prescription' ), runPhp: run, apply: true, log: l.log, error: l.error } ), 1 );
	assert.equal( calls.length, 1, 'only the read ran' );
	assert.match( l.out.error.join( '\n' ), /STOP flow .* is no published sgs_choice_flow post/ );
} );

test( 'a flow whose words are undecided never reaches the site', () => {
	const l = logs();
	const calls = [];
	const rows = [ product( 'a' ), product( 'b' ), flowRow ];
	assert.equal( runOpenerLabels( { rows, controlsOf: ( r ) => said( 'a' === r.slug ? 'One' : 'Two' ), runPhp: ( c ) => ( calls.push( c ), '{}' ), apply: true, log: l.log, error: l.error } ), 0 );
	assert.deepEqual( calls, [] );
	assert.match( l.out.log.join( '\n' ), /different opener words/ );
	assert.match( l.out.log.join( '\n' ), /nothing to do/ );
} );

test( 'the PHP sets the attribute on the flow\'s root block and carries its inputs encoded, not interpolated', () => {
	const label = 'Add "my" prescription\'; DROP';
	const php = labelApplyPhp( [ { slug: FLOW, id: 120, to: label } ] );
	assert.ok( php.includes( '\'sgs/choice-flow\'' ) && php.includes( `$attrs['${ LABEL_ATTR }']` ) && php.includes( 'serialize_block_attributes( $attrs )' ) );
	assert.ok( ! php.includes( 'DROP' ), 'the label is base64 in the code, never text in it' );
	const b64 = /base64_decode\( '([^']+)' \)/.exec( php )[ 1 ];
	assert.deepEqual( JSON.parse( Buffer.from( b64, 'base64' ).toString() ), [ [ 120, FLOW, label ] ] );
	const unusable = /base64_decode\( '([^']+)' \)/.exec( labelApplyPhp( [ { slug: 'Bad Slug', id: 1, to: 'x' } ] ) )[ 1 ];
	assert.deepEqual( JSON.parse( Buffer.from( unusable, 'base64' ).toString() ), [], 'an unusable slug is dropped from the list' );
	assert.ok( labelStatePhp( [ FLOW, 'x y' ] ).includes( 'resolve_choice_flow' ) );
} );

test( 'MUST FAIL on d6d613ca9: the write rewrites only the flow\'s opening tag, saves past the content filter and proves the read-back', () => {
	const php = labelApplyPhp( [ { slug: FLOW, id: 120, to: 'Add my prescription' } ] );
	assert.ok( ! php.includes( 'serialize_blocks(' ), 'the whole post is never re-serialised: every byte outside the opening tag stays as saved' );
	assert.ok( php.includes( 'kses_remove_filters()' ) && php.includes( 'kses_init_filters()' ), 'the save runs with the content filter off, and puts it back' );
	assert.match( php, /\$back === \$new/, 'the read-back must equal the written content byte for byte' );
	assert.match( php, /'post_content' => \$content/, 'a read-back that differs puts the old content back' );
	assert.ok( php.includes( 'wp:sgs/choice-flow(\\s+' ), 'the tag pattern needs space after the name, so sgs/choice-flow-step never matches' );
} );

test( 'MUST FAIL on bea6be759: a post holding two choice-flow tags is never rewritten by text', () => {
	const php = labelApplyPhp( [ { slug: FLOW, id: 120, to: 'Add my prescription' } ] );
	assert.ok( php.includes( "if ( null !== $attrs && 1 !== preg_match_all( '#<!--\\s+wp:sgs/choice-flow\\s#', $content ) ) {\n\t\t$attrs = null;" ), 'the write runs only when the post holds one flow tag, so a nested flow never takes the root flow\'s attributes' );
} );

// The opener's note (the flow's `openerNote`, "from +£59" on Eye Care's lens opener): the same step writes it after the words.
const noted = ( label, note ) => ( { openers: [ { label, note } ] } );

test( 'MUST FAIL: the flow takes the note of the draft\'s opener, and an opener drawing no note plans an empty one', () => {
	assert.deepEqual( labelsPlan( ROWS, () => noted( 'Add my prescription', 'from +£59' ), NOTE_FIELD ).flows, [ { slug: FLOW, rows: [ 'product' ], label: 'from +£59' } ] );
	assert.deepEqual( labelsPlan( ROWS, () => noted( 'Add my prescription', '' ), NOTE_FIELD ).flows[ 0 ].label, '', 'no note drawn: the flow\'s note is cleared, not left as it was' );
	const unread = labelsPlan( ROWS, () => said( 'Add my prescription' ), NOTE_FIELD );
	assert.deepEqual( [ unread.flows, unread.notes ], [ [], [] ], 'negative control: an opener whose note was not read plans nothing and says nothing' );
} );

test( 'MUST FAIL: rows whose openers carry different notes give the flow no note', () => {
	const rows = [ product( 'a' ), product( 'b' ), flowRow ];
	const plan = labelsPlan( rows, ( r ) => noted( 'Add my prescription', 'a' === r.slug ? 'from +£59' : 'from +£49' ), NOTE_FIELD );
	assert.equal( plan.flows[ 0 ].label, null );
	assert.match( plan.notes.join( '\n' ), /say different opener notes \("from \+£59", "from \+£49"\), so no openerNote is written/ );
} );

test( 'MUST FAIL: one run writes the words and then the note, each read back on its own attribute', () => {
	const calls = [];
	const run = ( code ) => {
		calls.push( code );
		if ( code.includes( 'resolve_choice_flow' ) ) {
			const wrote = ( attr ) => calls.some( ( c ) => c.includes( 'wp_update_post' ) && c.includes( `$attrs['${ attr }']` ) );
			const reading = code.includes( `['attrs']['openerNote']` ) ? 'openerNote' : 'openerLabel';
			return JSON.stringify( { [ FLOW ]: { id: 120, label: 'openerNote' === reading ? ( wrote( 'openerNote' ) ? 'from +£59' : '' ) : ( wrote( 'openerLabel' ) ? 'Add my prescription' : 'Choose your options' ) } } );
		}
		return JSON.stringify( { set: 1, wrong: [] } );
	};
	const l = logs();
	assert.equal( runOpenerLabels( { rows: ROWS, controlsOf: () => noted( 'Add my prescription', 'from +£59' ), runPhp: run, apply: true, log: l.log, error: l.error } ), 0 );
	const writes = calls.filter( ( c ) => c.includes( 'wp_update_post' ) );
	assert.equal( writes.length, 2 );
	assert.ok( writes[ 0 ].includes( `$attrs['openerLabel']` ) && writes[ 1 ].includes( `$attrs['openerNote']` ), 'the words first, then the note' );
	assert.match( l.out.log.join( '\n' ), /openerNote "" -> "from \+£59"/ );
	assert.match( l.out.log.join( '\n' ), /1 opener note\(s\) set/ );
} );

test( 'negative control: a failed words step stops before the note is touched', () => {
	const calls = [];
	const run = ( code ) => ( calls.push( code ), code.includes( 'resolve_choice_flow' ) ? JSON.stringify( { [ FLOW ]: null } ) : '{}' );
	const l = logs();
	assert.equal( runOpenerLabels( { rows: ROWS, controlsOf: () => noted( 'Add my prescription', 'from +£59' ), runPhp: run, apply: true, log: l.log, error: l.error } ), 1 );
	assert.equal( calls.length, 1, 'only the words read ran' );
} );

