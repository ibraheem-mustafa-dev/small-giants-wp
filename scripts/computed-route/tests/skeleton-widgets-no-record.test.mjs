// A static accordion unit with no record entry (lib/skeleton-widgets.mjs::widgetModel, `unitOf`): a unit the fact record holds no
// template for is no unit, so the proposal runs on instead of stopping on `templates( ut.component )` with `ut` null (MUST FAIL).
// Pure functions only: no command is spawned and no site is contacted. Mutation list: tests/skeleton-widgets-no-record.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { N, build, draftRepo, facts, db } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = `class Component {
	state = { open: 'a' };
	renderVals() {
		const S = this.state;
		return { openA: S.open === 'a', openB: S.open === 'b', toggleA: () => this.setState( { open: S.open === 'a' ? null : 'a' } ), toggleB: () => this.setState( { open: S.open === 'b' ? null : 'b' } ) };
	}
}`;
// section > div > two static units, each a toggle button and the panel it opens.
const ROOT = () => N( 'section', {}, [ N( 'div', {}, [
	N( 'div', {}, [ N( 'button', { click: 'toggleA', words: 'First' } ), N( 'p', { ifOn: '{{ openA }}', words: 'One' } ) ] ),
	N( 'div', {}, [ N( 'button', { click: 'toggleB', words: 'Second' } ), N( 'p', { ifOn: '{{ openB }}', shownIn: [], words: 'Two' } ) ] ),
] ) ] );
const accordion = ( r ) => r.proposal.rows.some( ( x ) => 'accordion' === x.rule || 'accordionItem' === x.rule );

// The proposal with the record entries named in `drop` removed.
function propose( drop = [] ) {
	const b = build( ROOT() );
	drop.forEach( ( k ) => delete b.recs[ k ] );
	const draft = draftRepo( b.html, LOGIC );
	const rec = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: {}, sources: { files: { 'Root.dc.html': draft.hash } } };
	return proposeSkeleton( { inventory: b.inventory, facts: facts( draft.repo ), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: rec, openers: {}, carried: null } );
}

test( 'MUST FAIL: static units with no record entry are no accordion units and the proposal still runs', () => {
	let r = null;
	assert.doesNotThrow( () => ( r = propose( [ 'Root/3', 'Root/6' ] ) ), 'the propose stage does not stop on a unit with no template' );
	assert.equal( accordion( r ), false );
} );

test( 'negative control: the same units with their record entries are an accordion', () => {
	assert.equal( accordion( propose() ), true );
} );
