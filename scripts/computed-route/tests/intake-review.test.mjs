// Spec 48 FR-48-17 (Bean's one batched intake review) and Appendix C "Review marks", lib/intake-review.mjs: review.md
// renders from an intake record holding every row type, reads back, applies Accept all and per-row marks, refuses
// off-list marks and unknown rows, blocks on unmarked rows, and carries marks across an identical re-export.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAjv, schemaProblems } from '../lib/handoff.mjs';
import { reviewRows, renderReview, parseReview, applyReview, carryOver, markProblem, notDefectLine, MARKS, ROW_TYPES } from '../lib/intake-review.mjs';
import { deadCodeWhy } from '../lib/intake-defects-static.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SCHEMA = path.join( HERE, '..', 'data', 'intake.schema.json' );
const TODAY = '2026-10-12';

const fixture = ( over = {} ) => ( {
	schemaVersion: '1', client: 'acme-bakery', takenOn: '2026-10-01T09:00:00Z',
	manifest: { schema_version: '1', files: { 'Site.dc.html': 'a'.repeat( 64 ) } },
	tools: { playwright: '1.50.0', browser: 'chromium 133', runtime: 'support.js 1' },
	harness: { clock: '2026-01-01T00:00:00Z', seed: 1, stepMs: 16 },
	census: [], inventory: { animations: [], surfaces: [], diff: [ { rowId: 'inventory:hero-fade', draftId: 'hero-fade', field: 'duration', ours: '600ms', theirs: '400ms' } ] },
	routing: { adapter: 'hash', routes: [], links: [] }, breakpoints: [],
	pageMap: [
		{ route: '#/', slug: 'home', title: 'Home', parent: null, template: null, postType: 'page', collection: 'static', id: null, menus: [ { menu: 'primary', position: 1 } ] },
		{ route: '#/about', slug: 'about', title: 'About | Story', parent: null, template: null, postType: 'page', collection: 'static', id: null },
	],
	palette: { tokens: [], unused: [], oneOff: [], rows: [
		{ rowId: 'palette:brand', token: 'brand', hex: '#aa3300', role: 'primary', confidence: 'high', why: 'name says brand' },
		{ rowId: 'palette:ink', token: 'ink', hex: '#111111', role: 'text', confidence: 'medium', why: 'dark text' },
	] },
	siteInfo: { refused: [], rows: [ { rowId: 'siteinfo:phone', key: 'phone', value: '0121 000 0000', normalised: '+441210000000', sources: [ { source: 'link', draftId: 'Site.dc.html:4:2' } ], valid: true, reason: null } ] },
	flags: [ { rowId: 'flag:placeholder:Hero:3', kind: 'placeholder', draftId: 'Hero:3', text: 'Lorem ipsum', why: 'lorem ipsum filler', source: 'template' } ],
	draftDefects: [ { rowId: 'defect:Nav:2', draftId: 'Nav:2', text: 'aria-expanded never flips', why: 'handler sets state but no binding' } ],
	notDefects: [
		{ draftId: 'Nav:js:3:2', censusId: 'handler@Nav:js:3:2', why: 'dead-code', note: 'closeAll is reached only through renderVals key onClose, which no template binding references' },
		{ draftId: 'Nav:js:9:2', censusId: 'timer@Nav:js:9:2', why: 'dead-code', note: 'sparkle: exits at a constant guard before it: if (mode === \'off\') is always true' },
		{ draftId: 'Card:2', censusId: 'sc-if@Card:2', why: 'prop-variant', note: 'gated by prop glow, which no parent draft mounts Card with (FR-48-29)' },
	],
	missingFeatures: [
		{ rowId: 'missing:Map:1', draftId: 'Map:1', text: 'store locator map', block: 'sgs/map' },
		{ rowId: 'missing:Quiz:1', draftId: 'Quiz:1', text: 'flavour quiz' },
	],
	skeletons: { header: { rows: [ { rowId: 'skeleton:header:logo', key: 'logo', tag: 'a', words: 'Acme', block: 'sgs/site-logo', confidence: 0.9, reason: 'logo link' } ] },
		footer: { rows: [ { rowId: 'skeleton:footer:copy', key: 'copy', tag: 'p', words: '© Acme', block: 'sgs/text', confidence: 0.7, reason: 'paragraph' } ] } },
	gaps: [], review: [],
	notices: { prose: [ { rowId: 'prose:README.md:7', file: 'README.md', line: 7, text: 'run npm install', why: 'starts with npm' } ],
		blockedHosts: [ { url: 'https://cdn.evil.test/a.js', host: 'cdn.evil.test', reason: 'unlisted-host', draftId: null } ] },
	...over,
} );

// Ticks Accept all in the named sections and writes per-row marks into the Mark cell.
const mark = ( md, { accept = [], rows = {} } = {} ) => md.split( '\n' ).reduce( ( st, l ) => {
	const h = /^## .*\(([a-z-]+)\)$/.exec( l );
	st.cur = h ? h[ 1 ] : st.cur;
	if ( 'Accept all: [ ]' === l && accept.includes( st.cur ) ) {
		l = 'Accept all: [x]';
	}
	const id = /^\| `([^`]+)` \|/.exec( l )?.[ 1 ];
	if ( id && id in rows ) {
		l = l.replace( /\|[^|]*\|$/, `| ${ rows[ id ] } |` );
	}
	st.out.push( l );
	return st;
}, { cur: null, out: [] } ).out.join( '\n' );

test( 'MUST FAIL the fixture with notices and changed review rows validates; no notices, or an unknown review field, is refused', () => {
	const ajv = loadAjv();
	assert.deepEqual( schemaProblems( ajv, SCHEMA, fixture() ), [] );
	const prev = { ...fixture(), review: carryOver( null, fixture() ).review.map( ( r ) => ( { ...r, contentHash: 'old', mark: 'accept' } ) ) };
	const { review, changed } = carryOver( prev, fixture() );
	assert.equal( changed.length, review.length );
	assert.ok( review.every( ( r ) => true === r.changed ) );
	assert.deepEqual( schemaProblems( ajv, SCHEMA, { ...fixture(), review } ), [], 'carryOver writes schema-valid review rows, changed included' );
	const { notices, ...without } = fixture();
	assert.ok( notices );
	assert.deepEqual( schemaProblems( ajv, SCHEMA, without ), [ '/ must have required property \'notices\'' ] );
	assert.deepEqual( schemaProblems( ajv, SCHEMA, { ...fixture(), review: [ { ...review[ 0 ], colour: 'red' } ] } ), [ '/review/0 must NOT have additional properties (colour)' ] );
} );

test( 'every row type is present with a unique row ID and the Appendix C first value', () => {
	const rows = reviewRows( fixture() );
	assert.deepEqual( [ ...new Set( rows.map( ( r ) => r.rowType ) ) ].sort(), [ ...ROW_TYPES ].sort() );
	assert.equal( new Set( rows.map( ( r ) => r.rowId ) ).size, rows.length );
	assert.equal( MARKS.flag[ 0 ].value, 'accept-flagged' );
	assert.deepEqual( MARKS.notice.map( ( m ) => m.value ), [ 'noted' ] );
	assert.ok( rows.some( ( r ) => 'notice:host:cdn.evil.test' === r.rowId ) );
} );

test( 'MUST FAIL render → parse round trip: every row is read back in its own section, marks and Accept all intact', () => {
	const rows = reviewRows( fixture() );
	const md = mark( renderReview( fixture() ), { accept: [ 'palette-role' ], rows: { 'page:page:about': 'edit:title=About us' } } );
	const p = parseReview( md );
	assert.deepEqual( p.problems, [] );
	assert.deepEqual( Object.keys( p.rowSection ).sort(), rows.map( ( r ) => r.rowId ).sort() );
	rows.forEach( ( r ) => assert.equal( p.rowSection[ r.rowId ], r.rowType, r.rowId ) );
	assert.equal( p.sections[ 'palette-role' ].acceptAll, true );
	assert.equal( p.sections[ 'page-map' ].acceptAll, false );
	assert.deepEqual( p.sections[ 'page-map' ].exceptions, { 'page:page:about': 'edit:title=About us' } );
	assert.deepEqual( p.rowMarks, { 'page:page:about': 'edit:title=About us' } );
	assert.match( md, /About \\\| Story/, 'a pipe in cell text is escaped' );
} );

test( 'MUST FAIL Accept all sets the first value on every row of a section; a row\'s own mark overrides it', () => {
	const md = mark( renderReview( fixture() ), { accept: ROW_TYPES, rows: { 'palette:ink': 'role:text-muted', 'missing:Quiz:1': 'build' } } );
	const r = applyReview( fixture(), md, { today: TODAY } );
	assert.deepEqual( r.problems, [] );
	assert.deepEqual( r.missing, [] );
	const m = Object.fromEntries( r.intake.review.map( ( x ) => [ x.rowId, x.mark ] ) );
	assert.equal( m[ 'palette:brand' ], 'accept' );
	assert.equal( m[ 'palette:ink' ], 'role:text-muted' );
	assert.equal( m[ 'page:page:home' ], 'accept' );
	assert.equal( m[ 'missing:Map:1' ], 'map:sgs/map', 'Accept all on a missing feature maps to its proposed block' );
	assert.equal( m[ 'missing:Quiz:1' ], 'build' );
	assert.equal( m[ 'inventory:hero-fade' ], 'ours' );
	assert.equal( m[ 'notice:host:cdn.evil.test' ], 'noted' );
	assert.equal( m[ 'skeleton:footer:copy' ], 'accept' );
	assert.deepEqual( schemaProblems( loadAjv(), SCHEMA, r.intake ), [] );
} );

test( 'MUST FAIL a flag row with no mark is accept-flagged; a non-flag row with no mark is missing and named', () => {
	const others = ROW_TYPES.filter( ( t ) => ! [ 'flag', 'site-info' ].includes( t ) );
	const r = applyReview( fixture(), mark( renderReview( fixture() ), { accept: others } ), { today: TODAY } );
	assert.equal( r.intake.review.find( ( x ) => 'flag:placeholder:Hero:3' === x.rowId ).mark, 'accept-flagged' );
	assert.deepEqual( r.missing.map( ( x ) => x.rowId ), [ 'siteinfo:phone', 'missing:Quiz:1' ] );
	assert.match( r.missing[ 1 ].why, /proposes no block/ );
	const notes = applyReview( fixture(), mark( renderReview( fixture() ), { accept: ROW_TYPES.filter( ( t ) => 'notice' !== t ), rows: { 'missing:Quiz:1': 'difference' } } ), { today: TODAY } );
	assert.deepEqual( notes.missing.map( ( x ) => x.rowId ), [ 'notice:prose:README.md:7', 'notice:host:cdn.evil.test' ], 'a notice needs noted (FR-48-17: every other row needs a mark)' );
} );

test( 'MUST FAIL an off-list mark is refused naming the row and the mark', () => {
	const md = mark( renderReview( fixture() ), { accept: ROW_TYPES, rows: { 'siteinfo:phone': 'role:primary', 'palette:brand': 'banana', 'skeleton:header:logo': 'block:Not A Block' } } );
	const r = applyReview( fixture(), md, { today: TODAY } );
	assert.ok( r.problems.some( ( p ) => /siteinfo:phone: mark "role:primary" refused/.test( p ) ), r.problems.join( '\n' ) );
	assert.ok( r.problems.some( ( p ) => /palette:brand: mark "banana" refused/.test( p ) ) );
	assert.ok( r.problems.some( ( p ) => /skeleton:header:logo: mark "block:Not A Block" refused/.test( p ) ) );
	assert.deepEqual( r.missing.map( ( x ) => x.rowId ).sort(), [ 'missing:Quiz:1', 'palette:brand', 'siteinfo:phone', 'skeleton:header:logo' ], 'Quiz proposes no block' );
	assert.equal( markProblem( 'page-map', 'edit:postType=banana' ), '"banana" is not a valid postType' );
	assert.equal( markProblem( 'page-map', 'edit:colour=red' ).startsWith( '"colour" is not an editable' ), true );
	assert.equal( markProblem( 'flag', 'not-flagged' ), null );
} );

test( 'MUST FAIL an unknown row ID, a row in the wrong section and a malformed line are problems naming them', () => {
	const md = renderReview( fixture() ).replace( '| `palette:ink` |', '| `palette:nope` |' )
		.replace( 'Accept all: [ ]\n\n| Row | Shows | Proposed | Confidence or reason | Mark |\n|---|---|---|---|---|\n| `flag', 'Accept all: [ ]\nplease fix\n\n| Row | Shows | Proposed | Confidence or reason | Mark |\n|---|---|---|---|---|\n| `flag' );
	const r = applyReview( fixture(), `${ md }\n## Extra (page-map)\nAccept all: [ ]\n| \`siteinfo:phone\` | a | b | c | |\n| too | few |\n`, { today: TODAY } );
	assert.ok( r.problems.some( ( p ) => /row palette:nope \(palette-role section\) is not a row of this intake/.test( p ) ), r.problems.join( '\n' ) );
	assert.ok( r.problems.some( ( p ) => /unrecognised line in the flag section: "please fix"/.test( p ) ) );
	assert.ok( r.problems.some( ( p ) => /row siteinfo:phone is listed twice/.test( p ) ) );
	assert.ok( r.problems.some( ( p ) => /the page-map section appears twice/.test( p ) ) );
	assert.ok( r.problems.some( ( p ) => /a table row needs 5 cells/.test( p ) ) );
	assert.ok( r.problems.some( ( p ) => /row palette:ink is not in review\.md/.test( p ) ) );
	const moved = applyReview( fixture(), renderReview( fixture() ).replace( /(\| `palette:ink` \|[^\n]*\n)/, '' ).replace( '| `page:page:home` |', '| `palette:ink` | x | y | z | |\n| `page:page:home` |' ), { today: TODAY } );
	assert.ok( moved.problems.some( ( p ) => /palette:ink sits in the page-map section but is a palette-role row/.test( p ) ) );
	assert.deepEqual( parseReview( '## Odd heading\n' ).problems, [ 'line 1: section heading "## Odd heading" names no row type (page-map, palette-role, site-info, flag, draft-defect, not-a-defect, missing-feature, skeleton-block, inventory-diff, notice)' ] );
} );

test( 'MUST FAIL carry-over keeps a mark when draft ID and hash match, drops it (changed, listed first) when the hash changes', () => {
	const first = applyReview( fixture(), mark( renderReview( fixture() ), { accept: ROW_TYPES, rows: { 'missing:Quiz:1': 'build' } } ), { today: '2026-10-02' } ).intake;
	const next = fixture( { takenOn: '2026-10-11T10:00:00Z', palette: { ...fixture().palette, rows: [
		{ ...fixture().palette.rows[ 0 ], confidence: 'low', why: 'wobble' },
		{ ...fixture().palette.rows[ 1 ], hex: '#222222' },
	] }, pageMap: [ fixture().pageMap[ 0 ], { ...fixture().pageMap[ 1 ], route: '#/our-story' } ] } );
	const { review, changed } = carryOver( first, next );
	const by = Object.fromEntries( review.map( ( x ) => [ x.rowId, x ] ) );
	assert.deepEqual( changed.sort(), [ 'page:page:about', 'palette:ink' ] );
	assert.deepEqual( [ by[ 'palette:brand' ].mark, by[ 'palette:brand' ].markedOn, by[ 'palette:brand' ].carriedFrom ], [ 'accept', '2026-10-02', '2026-10-01T09:00:00Z' ], 'confidence and why are not hashed' );
	assert.equal( by[ 'palette:ink' ].mark, null );
	assert.equal( by[ 'page:page:about' ].mark, null );
	assert.deepEqual( [ by[ 'palette:ink' ].changed, by[ 'page:page:about' ].changed, by[ 'palette:brand' ].changed ], [ true, true, undefined ], 'changed rows carry changed: true in review' );
	const md = renderReview( { ...next, review } );
	assert.equal( md, renderReview( { ...next, review }, { changed } ), 'changed-first is read from the review rows' );
	const pal = md.slice( md.indexOf( '## Palette roles' ) );
	assert.ok( pal.indexOf( '`palette:ink`' ) < pal.indexOf( '`palette:brand`' ), 'the changed row comes first' );
	assert.match( md, /\| `palette:ink` \| \*\*changed\*\* ink #222222/ );
	assert.match( md, /\| `palette:brand` \| brand #aa3300 \| role:primary \| low: wobble \| accept \|/, 'a carried row shows its carried mark' );
	const moved = carryOver( first, fixture( { flags: [ { ...fixture().flags[ 0 ], draftId: 'Hero:4' } ] } ) );
	assert.equal( moved.review.find( ( x ) => 'flag:placeholder:Hero:3' === x.rowId ).mark, null, 'a new draft ID drops the mark' );
} );

test( 'MUST FAIL markedOn is today for new marks and the carried date for carried ones', () => {
	const first = applyReview( fixture(), mark( renderReview( fixture() ), { accept: ROW_TYPES, rows: { 'missing:Quiz:1': 'build' } } ), { today: '2026-10-02' } ).intake;
	const next = fixture( { takenOn: '2026-10-11T10:00:00Z', siteInfo: { refused: [], rows: [ { ...fixture().siteInfo.rows[ 0 ], value: '0121 999 9999', normalised: '+441219999999' } ] } } );
	const { review, changed } = carryOver( first, next );
	const md = mark( renderReview( { ...next, review } ), { rows: { 'siteinfo:phone': 'accept', 'page:page:home': 'drop' } } );
	const r = applyReview( { ...next, review }, md, { today: TODAY } );
	assert.deepEqual( r.problems, [] );
	assert.deepEqual( r.missing, [] );
	const by = Object.fromEntries( r.intake.review.map( ( x ) => [ x.rowId, x ] ) );
	assert.deepEqual( [ by[ 'siteinfo:phone' ].markedOn, by[ 'siteinfo:phone' ].carriedFrom ], [ TODAY, null ] );
	assert.deepEqual( [ by[ 'page:page:home' ].mark, by[ 'page:page:home' ].markedOn, by[ 'page:page:home' ].carriedFrom ], [ 'drop', TODAY, null ], 'a changed carried mark is new' );
	assert.deepEqual( [ by[ 'palette:ink' ].markedOn, by[ 'palette:ink' ].carriedFrom ], [ '2026-10-02', '2026-10-01T09:00:00Z' ] );
	assert.deepEqual( [ by[ 'missing:Quiz:1' ].mark, by[ 'missing:Quiz:1' ].markedOn ], [ 'build', '2026-10-02' ] );
} );

test( 'MUST FAIL the output is deterministic: two renders are byte-identical whatever the input order', () => {
	const a = renderReview( fixture() );
	const shuffled = fixture( { flags: [ ...fixture().flags ], palette: { ...fixture().palette, rows: [ ...fixture().palette.rows ].reverse() }, skeletons: { footer: fixture().skeletons.footer, header: fixture().skeletons.header } } );
	assert.equal( renderReview( shuffled ), a );
	assert.equal( renderReview( fixture() ), a );
	assert.ok( a.indexOf( '### footer' ) < a.indexOf( '### header' ) );
} );

// A Nav draft whose toggle handler is handed to the template as onToggle, and the template's binding names it.
const NAV_LOGIC = `class Component extends DCComponent {
	toggleMenu() {
		this.setState( { open: ! this.state.open } );
	}
	renderVals() {
		return { onToggle: this.toggleMenu };
	}
}
`;
const navWhy = ( binding ) => deadCodeWhy( { component: 'Nav', logic: NAV_LOGIC }, NAV_LOGIC.indexOf( 'this.setState' ),
	{ rows: [ { component: 'Nav', kind: 'binding', detail: { expression: binding } } ] } );

test( 'MUST FAIL (FR-48-34): a handler whose template binding is misspelled is listed in the not-a-defect section; spelled right it is no entry', () => {
	const note = navWhy( 'onTogle' );
	assert.equal( note, 'toggleMenu is reached only through renderVals key onToggle, which no template binding references' );
	assert.equal( navWhy( 'onToggle' ), null, 'the correctly spelled binding wires the handler, so it is not dead code' );
	const intake = fixture( { notDefects: [ { draftId: 'Nav:js:3:4', censusId: 'timer@Nav:js:3:4', why: 'dead-code', note } ] } );
	const row = reviewRows( intake ).find( ( r ) => 'not-a-defect' === r.rowType );
	assert.equal( row.rowId, 'not-defect:timer@Nav:js:3:4' );
	assert.equal( row.acceptAll, 'not-a-defect' );
	const md = renderReview( intake );
	const section = md.slice( md.indexOf( '## Not defects: unwired code (not-a-defect)' ) );
	assert.ok( md.includes( '## Not defects: unwired code (not-a-defect)' ) );
	assert.match( section.split( '\n## ' )[ 0 ],/`not-defect:timer@Nav:js:3:4` \| timer@Nav:js:3:4 toggleMenu is reached only through renderVals key onToggle/ );
	assert.deepEqual( mark( md, { rows: { 'not-defect:timer@Nav:js:3:4': 'defect' } } ).includes( '| defect |' ), true );
	assert.equal( markProblem( 'not-a-defect', 'render-wins' ), 'not a not-a-defect mark (not-a-defect, defect)' );
} );

test( 'MUST FAIL (FR-48-34): constant-guard dead code and the other reasons are counted per reason, never listed', () => {
	const rows = reviewRows( fixture() ).filter( ( r ) => 'not-a-defect' === r.rowType );
	assert.deepEqual( rows.map( ( r ) => r.rowId ), [ 'not-defect:handler@Nav:js:3:2' ] );
	assert.equal( notDefectLine( fixture() ), 'Not defects counted, not listed: dead-code (constant guard) 1, prop-variant 1.' );
	assert.ok( renderReview( fixture() ).includes( 'Not defects counted, not listed: dead-code (constant guard) 1, prop-variant 1.' ) );
	assert.equal( notDefectLine( fixture( { notDefects: [] } ) ), 'Not defects counted, not listed: none.' );
} );
