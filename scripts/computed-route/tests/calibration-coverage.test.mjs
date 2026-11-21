// Calibration coverage (lib/calibration-coverage.mjs; detector tools/calibration-coverage.mjs): every setting that could
// paint its block and has no usable calibration reading, with one reason each, the declaration drift and the caches'
// disagreements. Rows are shaped as the framework database's block_attributes, caches as cache/<block>.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { paintRoles, kindOf, companionOf, usable, reasonFor, stateWhy, declaredParts, slotIsPart, driftOf, instancesOf, freshest, disagreements, hitsOf, coverage, summarise, fixtureHoldsFlip } from '../lib/calibration-coverage.mjs';

const ROLES = { color: 'styling-behaviour', layout: 'styling-behaviour', behaviour: 'styling-behaviour', 'boolean-visibility': 'styling-behaviour', 'text-content': 'content-bearing', 'enum-mode': 'styling-behaviour', visual: 'styling-behaviour' };
const PRESENCE = [ 'boolean-visibility', 'presence-boolean' ];
const row = ( attr_name, extra = {} ) => ( { block_slug: 'sgs/demo', attr_name, attr_type: 'string', default_value: null, enum_values: null, is_responsive: 0, role: 'color', css_property: null, css_element: null, css_state: null, tier_shape: null, source: 'sgs', ...extra } );
const ELEMENTS = { wrapper: { isWrapper: true, attrMap: { 'css:background-color': 'bg' } }, item: { attrMap: { 'css:color': 'itemColour' }, states: { hover: { attrMap: { 'css:color': 'itemColourHover' } } } }, badge: { selector: '.sgs-demo__badge', attrMap: { 'css:color': 'badgeColour' } } };
const ctx = ( extra = {} ) => ( { paint: new Set( [ 'color', 'layout', 'visual', 'boolean-visibility' ] ), presenceRoles: PRESENCE, roles: ROLES, ...extra } );
const set = ( name, r, extra = {} ) => ( { name, row: r, kind: kindOf( r, ctx() ), parts: declaredParts( name, r, ELEMENTS, 'demo' ), state: r.css_state || null, ...extra } );
const cache = ( extra = {} ) => ( { block: 'sgs/demo', site: 'site-a', measured: '2026-11-20T00:00:00Z', fingerprints: {}, settings: {}, discovered: {}, dead: [], noMarker: [], untestedStates: [], rejected: [], oneWidth: [], ...extra } );
const read = ( property, slot = '', extra = {} ) => ( { slot, slots: [ slot ], property, state: null, reachedAt: [ 375, 768, 1440 ], ...extra } );

test( 'the pool: a painting role is read from its rows, a unit companion and a content role are not settings that paint', () => {
	const rows = [ row( 'a', { css_property: 'color' } ), row( 'b' ), row( 'c', { role: 'behaviour' } ), row( 'd', { role: 'behaviour' } ), row( 'e', { role: 'behaviour' } ), row( 'g', { role: 'behaviour' } ), row( 'f', { role: 'behaviour', css_property: 'color' } ) ];
	const paint = paintRoles( rows, ROLES );
	assert.ok( paint.has( 'color' ) );
	assert.ok( paintRoles( rows.slice( 2, 5 ).concat( row( 'h', { role: 'behaviour', css_property: 'gap' } ) ), ROLES ).has( 'behaviour' ) );
	// Negative control: a role whose rows carry a property on fewer than one row in four is no painting role.
	assert.ok( ! paint.has( 'behaviour' ) );
	assert.equal( kindOf( row( 'x', { role: 'behaviour' } ), { paint, presenceRoles: PRESENCE, roles: ROLES } ), null );
	assert.equal( kindOf( row( 'x' ), { paint, presenceRoles: PRESENCE, roles: ROLES } ), 'look' );
	assert.equal( kindOf( row( 'x', { role: 'text-content', enum_values: '["a"]' } ), { paint, presenceRoles: PRESENCE, roles: ROLES } ), null );
	assert.equal( kindOf( row( 'x', { role: 'behaviour', attr_type: 'boolean' } ), { paint, presenceRoles: PRESENCE, roles: ROLES } ), null );
	assert.equal( kindOf( row( 'x', { role: 'boolean-visibility', attr_type: 'boolean' } ), { paint, presenceRoles: PRESENCE, roles: ROLES } ), 'switch' );
	const names = new Set( [ 'sgs/demo|gap', 'sgs/demo|gapUnit' ] );
	assert.ok( companionOf( row( 'gapUnit' ), [ 'Unit' ], names ) );
	// Negative control: a Unit name with no stem setting is a setting of its own.
	assert.ok( ! companionOf( row( 'widthUnit' ), [ 'Unit' ], names ) );
} );

test( 'never planned: no property, no longhand, a skipped role, a number-valued choice', () => {
	assert.deepEqual( reasonFor( set( 'fit', row( 'fit', { role: 'visual', attr_type: 'object' } ) ), cache(), [], ctx() ), { reason: 'never-planned', detail: 'no-property' } );
	assert.deepEqual( reasonFor( set( 'dur', row( 'dur', { css_property: 'anim:duration' } ) ), cache(), [], ctx() ), { reason: 'never-planned', detail: 'no-longhand' } );
	assert.deepEqual( reasonFor( set( 'band', row( 'band', { role: 'layout', attr_type: 'boolean' } ) ), cache(), [], ctx() ), { reason: 'never-planned', detail: 'role-skipped' } );
	const bars = row( 'bars', { role: 'enum-mode', attr_type: 'number', enum_values: '[2, 3]' } );
	assert.deepEqual( reasonFor( set( 'bars', bars ), cache( { discovered: { bars: { height: { slots: [ '' ] } } } } ), [], ctx() ), { reason: 'never-planned', detail: 'number-choice' } );
	// Negative controls: the same choice with a presence reading is usable; a string choice's discovered paint is usable.
	assert.equal( reasonFor( set( 'bars', bars ), cache( { presence: { 'bars=2': { shows: [] } } } ), [], ctx() ), null );
	const mode = row( 'mode', { role: 'enum-mode', enum_values: '["a","b"]' } );
	assert.equal( reasonFor( set( 'mode', mode ), cache( { discovered: { mode: { display: { slots: [ '' ] } } } } ), [], ctx() ), null );
	// Another cache's discovered paint of a number choice does not read it live either.
	assert.equal( usable( { presence: [], discovered: { height: { slots: [ '' ] } } }, bars, 'choice' ), false );
	assert.equal( usable( { presence: [], discovered: { display: { slots: [ '' ] } } }, mode, 'choice' ), true );
} );

test( 'not calibrated, stale and the planned-but-silent rest', () => {
	const bg = row( 'bg', { css_property: 'background-color' } );
	assert.deepEqual( reasonFor( set( 'bg', bg ), null, [], ctx() ), { reason: 'not-calibrated', detail: null } );
	assert.equal( reasonFor( set( 'bg', bg ), cache(), [], ctx() ).reason, 'stale' );
	// Negative controls: a fingerprinted setting with no row is not stale; a read setting has no reason.
	assert.equal( reasonFor( set( 'bg', bg ), cache( { fingerprints: { bg: 'x' } } ), [], ctx() ).reason, 'dropped' );
	assert.equal( reasonFor( set( 'bg', bg ), cache( { settings: { bg: read( 'background-color' ) } } ), [], ctx() ), null );
} );

test( 'rejected and no marker', () => {
	const pos = row( 'pos', { css_property: 'position', attr_type: 'object' } );
	const rej = cache( { rejected: [ { key: 'pos-enum-static-v0', message: 'setting "pos" must be object, got "static"' } ] } );
	assert.deepEqual( reasonFor( set( 'pos', pos ), rej, [], ctx() ), { reason: 'rejected', detail: 'setting "pos" must be object, got "static"' } );
	// Negative control: another setting's refused marker.
	assert.notEqual( reasonFor( set( 'pos', pos ), cache( { rejected: [ { key: 'posX-enum-a-v0', message: 'm' } ] } ), [], ctx() ).reason, 'rejected' );
	assert.deepEqual( reasonFor( set( 'pos', pos ), cache( { noMarker: [ 'pos' ] } ), [], ctx() ), { reason: 'no-marker', detail: null } );
} );

test( 'a state that could not be triggered, by the calibration\'s own words', () => {
	const h = row( 'itemColourHover', { css_property: 'color', css_state: 'hover', css_element: 'item' } );
	const why = ( text ) => reasonFor( set( 'itemColourHover', h ), cache( { untestedStates: [ text ] } ), [], ctx() );
	assert.deepEqual( why( 'itemColourHover:hover (the element stays hidden with its panel opened, so the state cannot be triggered)' ), { reason: 'state-untriggerable', detail: 'closed-panel' } );
	assert.equal( why( 'itemColourHover:hover (no element in the instance matches .sgs-demo__item: the block.json element needs ...)' ).detail, 'part-not-drawn' );
	assert.equal( why( 'itemColourHover:completed' ).detail, 'no-trigger' );
	assert.equal( stateWhy( 'x:hover (the header never took is-header-scrolled)' ), 'other' );
	// Negative control: another setting's untested state.
	assert.notEqual( why( 'itemColourHoverGradient:hover (stays hidden)' ).reason, 'state-untriggerable' );
} );

test( 'dead: the measuring site, an unstable run, a part the fixture never draws, the rest', () => {
	const b = row( 'badgeColour', { css_property: 'color', css_element: 'badge' } );
	const here = cache( { dead: [ 'badgeColour' ], fingerprints: { badgeColour: 'x' }, settings: { itemColour: read( 'color', '.sgs-demo__item' ) } } );
	const live = { site: 'site-b', map: cache( { site: 'site-b', settings: { badgeColour: read( 'color', '.sgs-demo__badge' ) } } ) };
	assert.deepEqual( reasonFor( set( 'badgeColour', b ), here, [ live ], ctx() ), { reason: 'dead-site', detail: 'live on site-b' } );
	assert.deepEqual( reasonFor( set( 'badgeColour', b ), here, [ { ...live, site: 'site-a' } ], ctx() ), { reason: 'dead', detail: 'unstable' } );
	assert.deepEqual( reasonFor( set( 'badgeColour', b ), here, [], ctx() ), { reason: 'dead-part-not-drawn', detail: 'badge' } );
	// Negative controls: the part drawn in the default paint, or another site dead as well, leaves a plain dead.
	assert.deepEqual( reasonFor( set( 'badgeColour', b ), here, [], ctx( { drawnPaths: [ '.sgs-demo__badge' ] } ) ), { reason: 'dead', detail: null } );
	assert.equal( reasonFor( set( 'badgeColour', b ), here, [ { site: 'site-b', map: here } ], ctx( { drawnPaths: [ '.sgs-demo__badge' ] } ) ).reason, 'dead' );
	const mode = row( 'mode', { role: 'enum-mode', enum_values: '["a","b"]' } );
	assert.deepEqual( reasonFor( set( 'mode', mode ), cache( { discovered: { mode: {} } } ), [], ctx() ), { reason: 'dead', detail: 'discovery-no-change' } );
} );

test( 'a presence flip that showed nothing, and one the fixture already held', () => {
	const caret = row( 'caret', { role: 'boolean-visibility', attr_type: 'boolean', default_value: 'true' } );
	const map = cache( { fingerprints: { caret: 'x' } } );
	assert.deepEqual( reasonFor( set( 'caret', caret ), map, [], ctx() ), { reason: 'dead', detail: 'presence-unseen' } );
	assert.deepEqual( reasonFor( set( 'caret', caret ), map, [], ctx( { fixture: { attributes: { caret: false } } } ) ), { reason: 'dead', detail: 'fixture-holds-flip' } );
	// Negative controls: the fixture holding the default is no held flip; a presence reading is usable.
	assert.ok( ! fixtureHoldsFlip( 'caret', caret, { attributes: { caret: true } } ) );
	assert.equal( reasonFor( set( 'caret', caret ), cache( { presence: { caret: { shows: [ '.sgs-demo__caret' ] } } } ), [], ctx() ), null );
} );

test( 'a per-device setting read at one width', () => {
	const cols = row( 'columns', { css_property: 'grid-template-columns', is_responsive: 1, tier_shape: 'tier_object' } );
	assert.deepEqual( reasonFor( set( 'columns', cols ), cache( { settings: { columns: read( 'grid-template-columns', '', { reachedAt: [ 1440 ] } ) } } ), [], ctx() ), { reason: 'one-width', detail: 'read at 1440 only' } );
	// Negative controls: read at every width; a flat sibling is one width by design.
	assert.equal( reasonFor( set( 'columns', cols ), cache( { settings: { columns: read( 'grid-template-columns' ) } } ), [], ctx() ), null );
	const tab = row( 'columnsTablet', { css_property: 'grid-template-columns', is_responsive: 1, tier_shape: 'flat_sibling' } );
	assert.equal( reasonFor( set( 'columnsTablet', tab ), cache( { settings: { columnsTablet: read( 'grid-template-columns', '', { reachedAt: [ 768 ] } ) } } ), [], ctx() ), null );
} );

test( 'drift between the declaration and the measurement', () => {
	const none = { resting: new Map(), any: new Map(), drawn: new Map(), base: new Map() };
	const kinds = ( name, r, s, inst = none ) => driftOf( set( name, r ), cache( { settings: { [ name ]: s } } ), inst, 'demo' ).map( ( d ) => d.kind );
	assert.deepEqual( kinds( 'mode', row( 'mode', { enum_values: '["a"]' } ), read( 'display' ) ), [ 'undeclared-property' ] );
	assert.deepEqual( kinds( 'gapX', row( 'gapX', { css_property: 'gap' } ), read( 'margin' ) ), [ 'other-property', 'undeclared-part' ] );
	// Negative control: a shorthand read for a declared longhand is the same property.
	assert.deepEqual( kinds( 'bg', row( 'bg', { css_property: 'margin-bottom' } ), read( 'margin' ) ), [] );
	assert.deepEqual( kinds( 'itemColour', row( 'itemColour', { css_property: 'color' } ), read( 'color', '.sgs-demo__other' ) ), [ 'elsewhere' ] );
	// Negative controls: read inside the part, the root read on the block's own class, a pseudo slot.
	assert.deepEqual( kinds( 'itemColour', row( 'itemColour', { css_property: 'color' } ), read( 'color', '.sgs-demo__item > svg' ) ), [] );
	assert.deepEqual( kinds( 'bg', row( 'bg', { css_property: 'background-color' } ), read( 'background-color', '.sgs-demo' ) ), [] );
	assert.deepEqual( kinds( 'itemColour', row( 'itemColour', { css_property: 'color' } ), read( 'color', '@scrim::before' ) ), [] );
	assert.deepEqual( kinds( 'itemColour', row( 'itemColour', { css_property: 'color', css_element: 'title' } ), read( 'color', '.sgs-demo__item' ) ), [ 'declarations-differ' ] );
	// Negative control: the database's part and block.json's resolve to the same element.
	assert.deepEqual( kinds( 'bg', row( 'bg', { css_property: 'background-color', css_element: 'box' } ), read( 'background-color' ) ), [] );
	assert.ok( slotIsPart( '.sgs-demo__badge', '.sgs-demo__badge' ) && ! slotIsPart( '.sgs-demo__badges', '.sgs-demo__badge' ) );
} );

test( 'drift on repeated parts: one instance where a sibling reads every one, a part drawn once', () => {
	const open = row( 'itemBgOpen', { css_property: 'background-color', css_element: 'item' } );
	const all = read( 'box-shadow', '.sgs-demo__item:nth-of-type(1)', { slots: [ '.sgs-demo__item:nth-of-type(1)', '.sgs-demo__item:nth-of-type(2)' ] } );
	const one = read( 'background-color', '.sgs-demo__item:nth-of-type(1)' );
	const map = cache( { settings: { itemShadow: all, itemBgOpen: one } } );
	const inst = instancesOf( map, {} );
	assert.deepEqual( driftOf( set( 'itemBgOpen', open ), map, inst, 'demo' ).map( ( d ) => d.kind ), [ 'indexed-subset' ] );
	// Negative control: a hover setting read on the one hovered item.
	const hover = row( 'itemBgOpen', { css_property: 'background-color', css_element: 'item', css_state: 'hover' } );
	assert.deepEqual( driftOf( set( 'itemBgOpen', hover ), map, instancesOf( map, { itemBgOpen: hover } ), 'demo' ), [] );
	// Negative control: a hover setting read on every item is no resting sibling of a resting setting read on one.
	const hmap = cache( { settings: { itemShadowHover: all, itemBgOpen: one } } );
	assert.deepEqual( driftOf( set( 'itemBgOpen', open ), hmap, instancesOf( hmap, { itemShadowHover: row( 'itemShadowHover', { css_state: 'hover' } ) } ), 'demo' ).map( ( d ) => d.kind ), [] );
	const field = read( 'font-size', '.sgs-demo__inner > .sgs-field:nth-of-type(2) > .sgs-field__input' );
	const fmap = cache( { settings: { fieldSize: field, labelColour: read( 'color', '.sgs-demo__inner > .sgs-field:nth-of-type(3) > .sgs-field__label' ) } } );
	const fieldRow = row( 'fieldSize', { css_property: 'font-size', css_element: 'item' } );
	assert.deepEqual( driftOf( set( 'fieldSize', fieldRow ), fmap, instancesOf( fmap, {} ), 'demo' ).map( ( d ) => d.kind ), [ 'elsewhere', 'one-instance' ] );
	// Negative control: the default paint draws the input in two fields, and the setting reads one of them, not one-instance.
	const drawn = instancesOf( fmap, {}, [ '.sgs-demo__inner > .sgs-field:nth-of-type(2) > .sgs-field__input', '.sgs-demo__inner > .sgs-field:nth-of-type(3) > .sgs-field__input' ] );
	assert.deepEqual( driftOf( set( 'fieldSize', fieldRow ), fmap, drawn, 'demo' ).map( ( d ) => d.kind ), [ 'elsewhere' ] );
} );

test( 'freshest cache and the caches\' disagreements', () => {
	const a = { wt: 'w1', site: 'site-a', measured: '2026-11-20', map: cache( { settings: { bg: read( 'background-color' ) } } ) };
	const b = { wt: 'w2', site: 'site-b', measured: '2026-11-21', map: cache( { site: 'site-b', dead: [ 'bg' ] } ) };
	const c = { wt: 'w3', site: 'site-b', measured: '2026-11-22', map: cache( { site: 'site-b', dead: [ 'bg' ] } ), candidate: true };
	assert.equal( freshest( { 'sgs/demo': [ a, b, c ] } )[ 'sgs/demo' ], b );
	const bg = set( 'bg', row( 'bg', { css_property: 'background-color' } ) );
	assert.equal( disagreements( 'sgs/demo', [ bg ], [ a, b, c ] )[ 0 ].kind, 'across-sites' );
	assert.equal( disagreements( 'sgs/demo', [ bg ], [ a, { ...b, site: 'site-a' } ] )[ 0 ].kind, 'same-site' );
	// Negative control: a cache that predates the setting holds no answer to disagree with.
	assert.deepEqual( disagreements( 'sgs/demo', [ bg ], [ a, { ...b, map: cache() } ] ), [] );
} );

test( 'draft rows that hit a hole: block, state, property and part', () => {
	const hole = { block: 'sgs/demo', state: null, property: 'background-color', parts: [ { part: 'badge', selector: '.sgs-demo__badge' } ], slots: [] };
	const rows = [
		{ source: 'gaps', block: 'sgs/demo', part: '.sgs-demo__badge', property: 'background-color', rows: 5 },
		{ source: 'list', block: 'sgs/demo', part: null, look: 'background', rows: 1 },
		// Negative controls: another part, another state, another property, another block.
		{ source: 'gaps', block: 'sgs/demo', part: '', property: 'background-color', rows: 7 },
		{ source: 'motion', block: 'sgs/demo', part: null, property: 'background-color', state: 'hover', rows: 1 },
		{ source: 'gaps', block: 'sgs/demo', part: '.sgs-demo__badge', property: 'color', rows: 3 },
		{ source: 'gaps', block: 'sgs/other', part: '.sgs-demo__badge', property: 'background-color', rows: 2 },
	];
	assert.deepEqual( hitsOf( hole, rows ), { rows: 6, by: { gaps: 5, list: 1 } } );
} );

test( 'coverage and summarise end to end on a fake block', () => {
	const rows = [
		row( 'bg', { css_property: 'background-color', css_element: 'wrapper' } ),
		row( 'badgeColour', { css_property: 'color', css_element: 'badge' } ),
		row( 'gap', { role: 'layout', css_property: 'gap' } ),
		row( 'gapUnit', { role: 'layout' } ),
		row( 'sgsCustomCss', { role: 'layout' } ),
		row( 'note', { role: 'text-content' } ),
		row( 'core', { source: 'native_wp', css_property: 'color' } ),
	];
	const map = cache( { settings: { bg: read( 'background-color' ), gap: read( 'gap', '.sgs-demo__inner' ) }, dead: [ 'badgeColour' ], fingerprints: { bg: 1, gap: 1, badgeColour: 1 } } );
	const result = coverage( { rows, roles: ROLES, elementsOf: { 'sgs/demo': ELEMENTS }, observations: { 'sgs/demo': [ { wt: 'w', site: 'site-a', measured: map.measured, map } ] }, presenceRoles: PRESENCE, unitSuffixes: [ 'Unit' ], draftRows: [ { source: 'gaps', block: 'sgs/demo', part: '.sgs-demo__badge', property: 'color', rows: 4 } ] } );
	assert.equal( result.checked, 3 );
	assert.deepEqual( result.apart, { companion: 1, customCss: 1 } );
	assert.deepEqual( result.holes.map( ( h ) => [ h.setting, h.reason, h.hits.rows ] ), [ [ 'badgeColour', 'dead-part-not-drawn', 4 ] ] );
	assert.deepEqual( result.drift.map( ( d ) => [ d.setting, d.kind ] ), [ [ 'gap', 'undeclared-part' ] ] );
	const s = summarise( result );
	assert.equal( s.usable, 2 );
	assert.deepEqual( s.perBlock[ 'sgs/demo' ], { declarations: 1, kinds: { 'undeclared-part': 1 } } );
} );
