// Spec 48 FR-48-25 with FR-48-77 (RC10): a record that runs when a state key changes, where an interval timer is what
// changes that key, carries the timer call (lib/intake-inventory-trigger.mjs::schedulingTimer,
// lib/intake-inventory-anim.mjs), so the slider's interval is read from code (lib/motion-record-text.mjs::timerMs), never
// from words. The draft shape is a real client draft's testimonial rotation (a mount-time setInterval stepping `tIdx`, a
// componentDidUpdate entrance on the card when `tIdx` changes). The timer call is kept as `source.timer`, apart from the
// record's own code, and the slider still needs the element to read as a card or slide.
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeModel } from '../lib/intake-inventory-code.mjs';
import { animationRecords } from '../lib/intake-inventory-anim.mjs';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';
import { blob } from '../lib/motion-record-text.mjs';
import { loadAjv, MASTER_SCHEMAS } from '../lib/handoff.mjs';
import fs from 'fs';
import path from 'path';

const DRAFT = ( timer ) => `class Component extends DCComponent {
  state = { page: 'home', tIdx: 0, now: 0 };
  componentDidMount() {
    ${ timer }
  }
  componentDidUpdate(pp, ps) {
    if (ps.tIdx !== this.state.tIdx && this._tCard && !this.rm) this._tCard.animate([{ opacity: 0, transform: 'translateX(26px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16,.84,.32,1)' });
  }
  setTCard = (el) => { this._tCard = el; };
  next = () => this.setState((st) => ({ tIdx: st.tIdx + 1 }));
}`;
const ROTATE = "this._tInt = setInterval(() => { if (!document.hidden && this.state.page === 'home') this.setState((st) => ({ tIdx: (st.tIdx + 1) % 4 })); }, 6500);";

function card( logic, ref = 'setTCard' ) {
	const source = { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } };
	const m = codeModel( { sources: [ source ], rows: [] } );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	const rows = [ { id: 'waapi@App:0', kind: 'waapi', component: 'App', draftId: `App:js:${ call.loc.start.line }:${ call.loc.start.column }`, detail: {} }, { id: 'ref@App:274', kind: 'ref', component: 'App', draftId: 'App:274', detail: { expression: ref } } ];
	return animationRecords( { sources: [ source ], rows } ).records.find( ( r ) => 'waapi' === r.mechanism );
}
const speed = ( r ) => recogniseBehaviour( r, { records: [ r ] } )?.blocks?.[ 'sgs/testimonial-slider' ]?.find( ( s ) => 'autoplaySpeed' === s.attr )?.value ?? null;

test( 'MUST FAIL: the card entrance a timer replays carries the timer call in its code, and is the slider\'s autoplay at the timer\'s delay', () => {
	const r = card( DRAFT( ROTATE ) );
	assert.equal( r.trigger.type, 'state' );
	assert.match( r.source.timer, /^setInterval\(\(\) => \{ .*tIdx.* \}, 6500\);$/ );
	assert.equal( speed( r ), 6500 );
} );

test( 'MUST FAIL: the timer is kept apart from the record own code, so the recognisers that read the code never read the timer', () => {
	const r = card( DRAFT( ROTATE ) );
	assert.match( r.source.code, /^this\._tCard\.animate\(/ );
	assert.doesNotMatch( blob( r ), /setInterval|6500/ );
} );

test( 'MUST FAIL: a timer-replayed entrance on an element that reads as no card or slide (a hero word cycler) is not the slider autoplay', () => {
	const r = card( DRAFT( ROTATE ).replaceAll( '_tCard', '_word' ).replaceAll( 'setTCard', 'setWord' ), 'setWord' );
	assert.match( r.source.timer, /6500/, 'the timer is found' );
	assert.equal( speed( r ), null );
} );

test( 'MUST FAIL: a carousel, quote, review or rotator element is the slider autoplay too; a hero word rotator is still not', () => {
	for ( const part of [ 'Carousel', 'Quote', 'Review', 'Rotator' ] ) {
		const r = card( DRAFT( ROTATE ).replaceAll( '_tCard', `_${ part }` ).replaceAll( 'setTCard', `set${ part }` ), `set${ part }` );
		assert.equal( speed( r ), 6500, part );
	}
	const word = card( DRAFT( ROTATE ).replaceAll( '_tCard', '_wordRotator' ).replaceAll( 'setTCard', 'setWordRotator' ), 'setWordRotator' );
	assert.match( word.source.timer, /6500/ );
	assert.equal( speed( word ), null );
} );

test( 'negative control: a timer that changes another key, or a key only a control changes, schedules nothing', () => {
	const clock = card( DRAFT( 'this._c = setInterval(() => this.setState({ now: Date.now() }), 1000);' ) );
	assert.equal( clock.source.timer, undefined );
	assert.equal( speed( clock ), null );
	const none = card( DRAFT( '' ) );
	assert.equal( none.source.timer, undefined );
	assert.equal( recogniseBehaviour( none, { records: [ none ] } )?.kind === 'settings', false );
} );

test( 'MUST FAIL: a record that carries source.timer validates against the master animations schema (a timer-driven slider is not an inventory problem)', () => {
	const r = card( DRAFT( ROTATE ) );
	assert.ok( r.source.timer );
	const schema = JSON.parse( fs.readFileSync( path.join( MASTER_SCHEMAS, 'animations.schema.json' ), 'utf8' ) );
	const validate = loadAjv().compile( { $schema: schema.$schema, $defs: schema.$defs, $ref: '#/$defs/record' } );
	assert.ok( validate( r ), JSON.stringify( validate.errors ) );
	assert.equal( validate( { ...r, source: { ...r.source, timer: 6500 } } ), false, 'the timer is a string' );
} );
