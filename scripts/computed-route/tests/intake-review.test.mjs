// Spec 48 FR-48-17 (Bean's one batched intake review) and Appendix C "Review marks", lib/intake-review.mjs: review.md
// renders from an intake record holding every row type, reads back, applies Accept all and per-row marks, refuses
// off-list marks and unknown rows, blocks on unmarked rows, and carries marks across an identical re-export.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAjv, schemaProblems } from '../lib/handoff.mjs';
import { reviewRows, renderReview, parseReview, applyReview, carryOver, markProblem, notDefectLine, MARKS, ROW_TYPES, byCause, CONFIDENT_HEADING } from '../lib/intake-review.mjs';
import { withUnappliedMarks } from '../lib/intake-review-carry.mjs';
import { deadCodeWhy } from '../lib/intake-defects-static.mjs';
import { deadFieldVerdict } from '../lib/intake-defects-deadfield.mjs';
import { diffAnimations } from '../lib/intake-inventory-diff.mjs';

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
	assert.equal( markProblem( 'page-map', 'edit:postType=product' ), null, 'product is in data/page-map.schema.json postType enum' );
	assert.equal( markProblem( 'page-map', 'edit:postType=page2' ), '"page2" is not a valid postType', 'an exact enum value only' );
	assert.equal( markProblem( 'page-map', 'edit:collection=live' ), null );
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
	assert.ok( a.includes( `### ${ CONFIDENT_HEADING } (2)` ), 'both confident rows sit in one group whatever their surface' );
} );

test( 'MUST FAIL (FR-48-6): skeleton rows are grouped by cause, never by page: one heading per rule with its reason, the rows needing a decision first', () => {
	const pill = ( surface, key ) => ( { rowId: `skeleton:${ surface }:${ key }`, key, tag: 'a', words: 'Call', block: 'sgs/button', confidence: 1, rule: 'pillButton', reason: 'a link holding one label and an icon is one button' } );
	const intake = fixture( { skeletons: {
		header: { rows: [ pill( 'header', 'call' ), { rowId: 'skeleton:header:wrap', key: 'wrap', tag: 'div', words: '', block: 'sgs/container', confidence: 0.4, low: true, reason: 'wrapper' } ] },
		footer: { rows: [ pill( 'footer', 'call' ), { rowId: 'skeleton:footer:nav', key: 'nav', tag: 'nav', words: '', block: 'sgs/nav-drawer-menu', confidence: 1, rule: 'clientBuiltSurface', builtPost: { site: 'canary', postType: 'sgs_drawer', postId: 7, title: 'Drawer' } } ] },
	} } );
	const md = renderReview( intake );
	const sk = md.slice( md.indexOf( '## Skeleton block choices' ) ).split( '\n## ' )[ 0 ];
	const headings = sk.split( '\n' ).filter( ( l ) => l.startsWith( '### ' ) );
	assert.deepEqual( headings, [
		'### Needs a decision (low): block:sgs/container (1)',
		'### Settled by built post sgs_drawer 7: the client already built this surface (Drawer on canary) (1)',
		'### Settled by rule pillButton: a link holding one label and an icon is one button (2)',
	] );
	const group = sk.slice( sk.indexOf( '### Settled by rule pillButton' ) ).split( '\n### ' )[ 0 ];
	assert.ok( group.includes( '`skeleton:header:call`' ) && group.includes( '`skeleton:footer:call`' ), 'one rule\'s rows from two surfaces sit together' );
	assert.ok( ! /^### (header|footer)$/m.test( sk ), 'no heading per page' );
	assert.deepEqual( byCause( reviewRows( intake ).filter( ( r ) => 'skeleton-block' === r.rowType ) ).map( ( [ h ] ) => h ), headings.map( ( h ) => h.slice( 4 ) ) );
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

test( 'MUST FAIL (FR-48-34): a dead field written only behind a constant guard is counted by its kind; one also written by an unwired member is listed; the old note-reading stays the fallback', () => {
	// guarded: arm() writes this._el only behind a constant guard, so the code itself turns the field off.
	const guarded = 'class Component { componentDidMount() { this.arm(); this.go(); } go() { if ( this._el ) { this._el.animate( [], 300 ); } } arm() { const on = false; if ( ! on ) { return; } this._el = document.body; } }';
	const g = deadFieldVerdict( { logic: guarded }, guarded.indexOf( '.animate(' ), { rows: [] } );
	assert.equal( g.kind, 'constant-guard' );
	assert.match( g.note, /exits at a constant guard/ );
	const entry = { draftId: 'Home:js:1:1', censusId: 'waapi@Home:js:1:1', why: 'dead-code', deadKind: g.kind, note: g.note };
	const intake = fixture( { notDefects: [ entry ] } );
	assert.deepEqual( reviewRows( intake ).filter( ( r ) => 'not-a-defect' === r.rowType ), [] );
	assert.equal( notDefectLine( intake ), 'Not defects counted, not listed: dead-code (constant guard) 1.' );
	assert.equal( notDefectLine( fixture( { notDefects: [ { ...entry, deadKind: 'data-gated' } ] } ) ), 'Not defects counted, not listed: dead-code (data-gated) 1.' );
	// mixed: setRef() also writes this._el and nothing references it. A misspelled wiring would set the field, so the
	// owner must see it (Bean, 2026-10-12): unwired, listed.
	const mixed = 'class Component { componentDidMount() { this.arm(); this.go(); } go() { if ( this._el ) { this._el.animate( [], 300 ); } } arm() { const on = false; if ( ! on ) { return; } this._el = document.body; } setRef( el ) { this._el = el; } }';
	const m = deadFieldVerdict( { logic: mixed }, mixed.indexOf( '.animate(' ), { rows: [] } );
	assert.match( m.note, /setRef is never referenced/ );
	assert.equal( m.kind, 'unwired', 'one unwired writer is enough to list it' );
	assert.equal( reviewRows( fixture( { notDefects: [ { ...entry, deadKind: m.kind, note: m.note } ] } ) ).filter( ( r ) => 'not-a-defect' === r.rowType ).length, 1 );
	const { deadKind, ...old } = { ...entry, note: m.note };
	assert.ok( deadKind );
	assert.equal( reviewRows( fixture( { notDefects: [ old ] } ) ).filter( ( r ) => 'not-a-defect' === r.rowType ).length, 1, 'a record without deadKind falls back to the wording of its note' );
	const only = 'class Component { componentDidMount() { this.go(); } go() { if ( this._el ) { this._el.animate( [], 300 ); } } setRef( el ) { this._el = el; } }';
	assert.equal( deadFieldVerdict( { logic: only }, only.indexOf( '.animate(' ), { rows: [] } )?.kind, 'unwired', 'with only the unreferenced writer it is unwired, so listed' );
} );

test( 'MUST FAIL a row ID holding a pipe, a backtick, CR or LF renders, parses back and keeps its own mark', () => {
	const intake = fixture( {
		notDefects: [ { draftId: 'C', censusId: 'C|1', why: 'dead-code', note: 'q is reached only through renderVals key q, which no template binding references' } ],
		inventory: { animations: [], surfaces: [], diff: [
			{ rowId: 'inventory:surface:route:a|b:only-theirs', draftId: 'a|b', field: 'route', ours: null, theirs: 'a|b' },
			{ rowId: 'inventory:tick`x`\r\ny', draftId: 'y', field: 'f', ours: '1', theirs: '2' },
			{ draftId: 'same', field: 'f1', ours: '1', theirs: '2' }, { draftId: 'same', field: 'f2', ours: '1', theirs: '2' },
		] },
	} );
	const ids = reviewRows( intake ).map( ( r ) => r.rowId );
	assert.ok( ids.includes( 'not-defect:C%7C1' ) && ids.includes( 'inventory:surface:route:a%7Cb:only-theirs' ) && ids.includes( 'inventory:tick%60x%60%0D%0Ay' ) );
	assert.ok( ids.includes( 'inventory:same' ) && ids.includes( 'inventory:same#2' ), 'two rows falling back to one ID stay apart' );
	assert.equal( new Set( ids ).size, ids.length );
	const md = mark( renderReview( intake ), { accept: ROW_TYPES, rows: { 'inventory:surface:route:a%7Cb:only-theirs': 'theirs', 'not-defect:C%7C1': 'defect', 'missing:Quiz:1': 'difference' } } );
	assert.deepEqual( parseReview( md ).problems, [] );
	const r = applyReview( intake, md, { today: TODAY } );
	assert.deepEqual( [ r.problems, r.missing ], [ [], [] ] );
	assert.equal( r.intake.review.find( ( x ) => 'inventory:surface:route:a%7Cb:only-theirs' === x.rowId ).mark, 'theirs' );
	assert.equal( r.intake.review.find( ( x ) => 'not-defect:C%7C1' === x.rowId ).mark, 'defect' );
} );

test( 'MUST FAIL (Appendix C "the default") a not-a-defect row left blank is not-a-defect, never missing; it shows its draft ID when it has no census ID', () => {
	const intake = fixture( { notDefects: [ { draftId: 'B:js:4', why: 'dead-code', note: 'baz is reached only through renderVals key baz, which no template binding references' } ] } );
	const r = applyReview( intake, mark( renderReview( intake ), { accept: ROW_TYPES.filter( ( t ) => 'not-a-defect' !== t ), rows: { 'missing:Quiz:1': 'difference' } } ), { today: TODAY } );
	assert.deepEqual( r.missing, [] );
	assert.equal( r.intake.review.find( ( x ) => 'not-a-defect' === x.rowType ).mark, 'not-a-defect' );
	assert.match( reviewRows( intake ).find( ( x ) => 'not-a-defect' === x.rowType ).shows, /^B:js:4 baz/ );
} );

test( 'MUST FAIL (FR-48-25) a re-export that inserts one record keeps every other inventory-diff row\'s ID, hash and mark', () => {
	const rec = ( id, line, ms ) => ( { id, mechanism: 'waapi', name: 'n', source: { file: 'a.js', line }, trigger: { type: 'load' }, duration_ms: ms, properties: [] } );
	const run = ( ours, theirs ) => fixture( { inventory: { animations: [], surfaces: [], diff: diffAnimations( { records: ours, counts: {} }, { records: theirs, counts: {} } ) } } );
	const v1 = run( [ rec( 'A-01', 10, 500 ), rec( 'A-02', 20, 500 ) ], [ rec( 'A-1', 10, 999 ), rec( 'A-2', 20, 999 ) ] );
	// Ours gains an effect at line 5 and both sides renumber their own IDs.
	const v2 = run( [ rec( 'A-01', 5, 500 ), rec( 'A-02', 10, 500 ), rec( 'A-03', 20, 500 ) ], [ rec( 'A-1', 10, 999 ), rec( 'A-2', 20, 999 ) ] );
	v1.review = reviewRows( v1 ).map( ( r ) => ( { rowId: r.rowId, rowType: r.rowType, contentHash: r.contentHash, mark: 'inventory-diff' === r.rowType ? 'theirs' : null, markedOn: TODAY, carriedFrom: null } ) );
	const diffRows = carryOver( v1, v2 ).review.filter( ( r ) => 'inventory-diff' === r.rowType );
	assert.deepEqual( diffRows.map( ( r ) => [ r.rowId, r.mark ] ).sort(), [
		[ 'inventory:anim:a.js%7C10%7Cwaapi:duration_ms', 'theirs' ], [ 'inventory:anim:a.js%7C20%7Cwaapi:duration_ms', 'theirs' ], [ 'inventory:anim:a.js%7C5%7Cwaapi:only-ours', null ] ] );
} );

test( 'MUST FAIL a missing-feature row shows its one-line description, never the raw record', () => {
	const intake = fixture( { missingFeatures: [ { rowId: 'missing:Nav:4', draftId: 'Nav:4', construct: 'element <span>', from: 'skeleton', line: '<span>: no SGS block fits it', mainFlow: null } ] } );
	const row = reviewRows( intake ).find( ( r ) => 'missing:Nav:4' === r.rowId );
	assert.equal( row.shows, '<span>: no SGS block fits it' );
	assert.ok( ! renderReview( intake ).includes( '{"construct"' ) );
} );

test( 'MUST FAIL: Accept all marks a seen-but-unsupported row as a tracked gap with its wave (difference when excluded); a non-coverage missing feature with no block, or a coverage row the map does not hold, is never bulk-accepted', () => {
	const intake = fixture( { missingFeatures: [
		{ rowId: 'missing:coverage:css-at:container', draftId: 'Home:3', construct: 'css-at:container', from: 'coverage', line: 'css-at:container seen 2 times in the draft: seen but unsupported', mainFlow: null, wave: 'draft reading' },
		{ rowId: 'missing:coverage:svg:unlisted', draftId: 'logo.svg', construct: 'svg:unlisted', from: 'coverage', line: 'svg:unlisted seen 4 times in the draft: seen but unsupported', mainFlow: null, excluded: true },
		{ rowId: 'missing:coverage:html:new-thing', draftId: 'Home:4', construct: 'html:new-thing', from: 'coverage', line: 'html:new-thing seen 1 time in the draft: seen but unsupported', mainFlow: null },
		{ rowId: 'missing:Quiz:1', draftId: 'Quiz:1', construct: 'flavour quiz', from: 'census', line: 'flavour quiz: no SGS block holds it', mainFlow: null, wave: 'behaviour recognisers' },
	] } );
	const rows = Object.fromEntries( reviewRows( intake ).filter( ( r ) => 'missing-feature' === r.rowType ).map( ( r ) => [ r.rowId, r ] ) );
	assert.equal( rows[ 'missing:coverage:css-at:container' ].acceptAll, 'gap:draft reading' );
	assert.equal( rows[ 'missing:coverage:css-at:container' ].needs, null, 'a tracked gap needs no reading' );
	assert.equal( rows[ 'missing:coverage:svg:unlisted' ].acceptAll, 'difference' );
	assert.equal( rows[ 'missing:Quiz:1' ].acceptAll, null, 'only a coverage row is a tracked gap, whatever fields it carries' );
	const r = applyReview( intake, mark( renderReview( intake ), { accept: ROW_TYPES } ), { today: TODAY } );
	const got = Object.fromEntries( r.intake.review.filter( ( x ) => 'missing-feature' === x.rowType ).map( ( x ) => [ x.rowId, x.mark ] ) );
	assert.deepEqual( got, { 'missing:coverage:css-at:container': 'gap:draft reading', 'missing:coverage:svg:unlisted': 'difference', 'missing:coverage:html:new-thing': null, 'missing:Quiz:1': null } );
	assert.deepEqual( r.missing.map( ( m ) => m.rowId ).sort(), [ 'missing:Quiz:1', 'missing:coverage:html:new-thing' ] );
	assert.equal( markProblem( 'missing-feature', 'gap:states' ), null );
	assert.ok( markProblem( 'missing-feature', 'gap:' ) );
} );

test( 'review.md writes each paragraph of its guide as one line (no hard wraps)', () => {
	const md = renderReview( fixture() );
	const guide = md.split( '\n' ).find( ( l ) => l.startsWith( 'How to mark:' ) );
	assert.match( guide, /Then run `node scripts\/computed-route\/intake\.mjs --apply-review acme-bakery`\.$/ );
} );

test( 'MUST FAIL: a mark written in review.md but never applied survives a re-run; a changed row drops it, and a ticked Accept all is reported', () => {
	const prev = { ...fixture(), review: carryOver( null, fixture() ).review };
	const [ a, b ] = prev.review;
	const md = mark( renderReview( prev ), { accept: [ a.rowType ], rows: { [ a.rowId ]: 'accept', [ b.rowId ]: 'accept' } } );
	const kept = withUnappliedMarks( prev, md, { day: '2026-10-18' } );
	assert.deepEqual( kept.carried, [ a.rowId, b.rowId ] );
	assert.deepEqual( kept.acceptAll, [ a.rowType ] );
	const next = fixture();
	const { review } = carryOver( { ...kept.intake, review: kept.intake.review.map( ( r ) => ( r.rowId === b.rowId ? { ...r, contentHash: 'old' } : r ) ) }, next );
	assert.deepEqual( [ review.find( ( r ) => r.rowId === a.rowId ).mark, review.find( ( r ) => r.rowId === a.rowId ).markedOn ], [ 'accept', '2026-10-18' ] );
	assert.equal( review.find( ( r ) => r.rowId === b.rowId ).mark, null, 'a row whose content changed is unmarked, as for an applied mark' );
	assert.equal( carryOver( prev, next ).review.find( ( r ) => r.rowId === a.rowId ).mark, null, 'control: without the review.md step the mark is lost' );
	const applied = { ...prev, review: prev.review.map( ( r ) => ( r.rowId === a.rowId ? { ...r, mark: 'drop', markedOn: '2026-10-10' } : r ) ) };
	assert.equal( withUnappliedMarks( applied, md ).intake.review.find( ( r ) => r.rowId === a.rowId ).mark, 'drop', 'an applied mark is never overwritten by review.md' );
} );

test( 'MUST FAIL: a review.md mark --apply-review would refuse, or one on a row listed in another section, is not carried and is named', () => {
	const prev = { ...fixture(), review: carryOver( null, fixture() ).review };
	const [ a, b ] = prev.review.filter( ( r, i, all ) => all.findIndex( ( x ) => x.rowType === r.rowType ) === i );
	const md = mark( renderReview( prev ), { rows: { [ a.rowId ]: 'not-a-real-mark' } } );
	const kept = withUnappliedMarks( prev, md, { day: '2026-10-19' } );
	assert.deepEqual( kept.carried, [] );
	assert.equal( kept.intake.review.find( ( r ) => r.rowId === a.rowId ).mark, null );
	assert.match( kept.refused[ 0 ], /not-a-real-mark.*not carried/ );
	const lines = md.split( '\n' );
	const rowLine = lines.findIndex( ( l ) => l.startsWith( `| \`${ a.rowId }\` |` ) );
	const moved = lines.filter( ( _, i ) => i !== rowLine );
	const target = moved.findIndex( ( l ) => l.startsWith( `| \`${ b.rowId }\` |` ) );
	moved.splice( target + 1, 0, lines[ rowLine ].replace( /\| not-a-real-mark \|$/, '| accept |' ) );
	const wrong = withUnappliedMarks( prev, moved.join( '\n' ), { day: '2026-10-19' } );
	assert.ok( ! wrong.carried.includes( a.rowId ), 'a row listed in another section is not carried' );
	assert.match( wrong.refused.join( ' ' ), /listed in the .* section, but it is a/ );
} );
