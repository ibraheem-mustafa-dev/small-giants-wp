// Spec 48 FR-48-7, lib/read-readme.mjs and its join in lib/fact-record.mjs::joinFacts: the handoff README split into sections by
// README.template.md's headings, the judgement-call, open-item, business-detail and platform-intent lists, block hints kept as
// evidence, the template headings the README lacks, and a command-like line kept flagged. A small README in a temporary folder
// replaces a real one. Each MUST FAIL test names the behaviour whose removal turns it red
// (tests/fixtures/read-readme/mutations.json holds the mutations, tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readReadme, splitSections, normaliseHeading, templateHeadingOf, templateHeadingsOf, labelKind, loadSynonyms, TEMPLATE_HEADINGS } from '../lib/read-readme.mjs';
import { joinFacts, factsProblems } from '../lib/fact-record.mjs';
import { sourcesOf, assertCurrent, StaleRecordError } from '../lib/freshness.mjs';

const README = [
	'# Handoff: A Fixture Site',
	'',
	'## 1. Overview',
	'A small site.',
	'',
	'## Global layout (every page)',
	'Header and footer.',
	'',
	'### Header',
	'- Sticky on scroll.',
	'',
	'## 3) Judgement calls',
	'- The hero image is cropped on purpose.',
	'- The logo is lower case: the brand spells it so.',
	'',
	'## Open items',
	'* Confirm the sectors panel gradient.',
	'1. Social links point at `#/`; supply real URLs.',
	'',
	'## Business details',
	'None',
	'',
	'## Platform notes (WooCommerce)',
	'- Orders go through WooCommerce.',
	'',
	'## Block mapping (SGS)',
	'- Hero: sgs/hero (Restyle).',
	'| Part | Block |',
	'|---|---|',
	'| Footer | sgs/site-footer |',
	'',
	'## Setup',
	'```',
	'## Not a heading',
	'```',
	'Run `npm install` before you start.',
	'$ rm -rf build',
	'',
].join( '\n' );

const withFolder = ( fn, text = README ) => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'read-readme-' ) );
	text && fs.writeFileSync( path.join( dir, 'README.md' ), text );
	try {
		return fn( dir );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
};

test( 'MUST FAIL (heading split): numbered and unnumbered headings both match the template, with the note after them ignored', () => {
	assert.equal( normaliseHeading( '1. Overview' ), 'overview' );
	assert.equal( normaliseHeading( '3) Judgement calls' ), 'judgement calls' );
	assert.equal( normaliseHeading( '§2 Global layout (every page)' ), 'global layout' );
	assert.equal( templateHeadingOf( '1. Overview' ), 'Overview' );
	assert.equal( templateHeadingOf( 'Global layout (every page)' ), 'Global layout' );
	assert.equal( templateHeadingOf( 'Animations & interactions' ), 'Animations and interactions' );
	assert.equal( templateHeadingOf( 'Global layout of every page' ), 'Global layout', 'more words after the template words still match' );
	assert.equal( templateHeadingOf( 'Setup' ), null );
	assert.equal( templateHeadingOf( 'Filesystem notes' ), null, 'a word that only begins with a template word is no match' );
	withFolder( ( dir ) => {
		const r = readReadme( { folder: dir } );
		assert.equal( r.title, 'Handoff: A Fixture Site' );
		assert.deepEqual( r.sections.filter( ( s ) => s.template ).map( ( s ) => [ s.template, s.heading, s.level ] ), [
			[ 'Overview', '1. Overview', 2 ],
			[ 'Global layout', 'Global layout (every page)', 2 ],
			[ 'Judgement calls', '3) Judgement calls', 2 ],
			[ 'Open items', 'Open items', 2 ],
			[ 'Business details', 'Business details', 2 ],
		] );
		assert.equal( r.sections.find( ( s ) => 'Overview' === s.template ).text, 'A small site.' );
		assert.ok( ! r.sections.some( ( s ) => 'Not a heading' === s.heading ), 'a heading inside a code fence is text' );
		assert.equal( r.sections.find( ( s ) => 'Setup' === s.heading ).text.includes( '## Not a heading' ), true );
	} );
} );

test( 'MUST FAIL (lists): judgement calls, open items and platform intent are the bullets and numbered items under their headings; None is no item', () => withFolder( ( dir ) => {
	const r = readReadme( { folder: dir } );
	assert.deepEqual( r.judgementCalls.map( ( j ) => j.text ), [ 'The hero image is cropped on purpose.', 'The logo is lower case: the brand spells it so.' ] );
	assert.deepEqual( r.judgementCalls.map( ( j ) => j.line ), [ 13, 14 ] );
	assert.deepEqual( r.openItems.map( ( j ) => j.text ), [ 'Confirm the sectors panel gradient.', 'Social links point at `#/`; supply real URLs.' ] );
	assert.deepEqual( r.businessDetails, [], 'a "None" section holds no item' );
	assert.equal( r.sections.find( ( s ) => 'Business details' === s.template ).none, true );
	assert.deepEqual( r.platformIntent.map( ( p ) => p.text ), [ 'Orders go through WooCommerce.' ] );
	assert.deepEqual( r.platformIntent.map( ( p ) => p.section ), [ 'Platform notes (WooCommerce)' ] );
} ) );

test( 'MUST FAIL (sub-sections): a list reads the deeper headings under its template heading too', () => {
	const text = '## Judgement calls\n- One.\n### Header\n- Two.\n## Open items\n- Three.\n';
	withFolder( ( dir ) => {
		const r = readReadme( { folder: dir } );
		assert.deepEqual( r.judgementCalls.map( ( j ) => [ j.text, j.section ] ), [ [ 'One.', 'Judgement calls' ], [ 'Two.', 'Header' ] ] );
		assert.deepEqual( r.openItems.map( ( j ) => j.text ), [ 'Three.' ] );
	}, text );
	assert.equal( splitSections( text ).sections.length, 3 );
} );

test( 'MUST FAIL (heading synonyms): a heading that begins with an accepted word is the template heading nothing else claims; an exact heading wins', () => {
	const templates = ( ...headings ) => templateHeadingsOf( headings );
	assert.deepEqual( templates( 'Screens / Views', 'Animations & Behaviour', 'Global elements' ), [ 'Routes', 'Animations and interactions', 'Global layout' ] );
	assert.deepEqual( templates( 'Interactions and animation', 'Breakpoints and layout' ), [ 'Animations and interactions', null ], 'the accepted word must begin the heading' );
	assert.deepEqual( templates( 'Routes', 'Pages', 'Screens / Views' ), [ 'Routes', 'Pages', null ], 'both templates are claimed by their own words' );
	assert.deepEqual( templates( 'Pages', 'Screens / Views' ), [ 'Pages', 'Routes' ], 'the first template in template order takes a tie' );
	const text = '# T\n\n## Screens / Views\n- a\n\n## Animations & Behaviour\nHover lifts the cards.\n\n## Global elements\nHeader.\n';
	withFolder( ( dir ) => {
		const r = readReadme( { folder: dir } );
		assert.deepEqual( r.sections.map( ( s ) => s.template ), [ 'Routes', 'Animations and interactions', 'Global layout' ] );
		assert.deepEqual( r.missing, TEMPLATE_HEADINGS.filter( ( t ) => ! [ 'Routes', 'Animations and interactions', 'Global layout' ].includes( t ) ) );
	}, text );
} );

test( 'MUST FAIL (synonyms table): a table naming a non-template heading or a non-word is refused', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'readme-syn-' ) );
	try {
		const write = ( data ) => {
			const f = path.join( dir, 's.json' );
			fs.writeFileSync( f, JSON.stringify( data ) );
			return f;
		};
		assert.throws( () => loadSynonyms( write( { headings: { 'Not a heading': [ 'x' ] } } ) ), /not a template heading/ );
		assert.throws( () => loadSynonyms( write( { headings: { Routes: [ 'Screens!' ] } } ) ), /lower-case words/ );
		assert.throws( () => loadSynonyms( write( { labels: { other: [ 'x' ] } } ) ), /judgementCalls or openItems/ );
		assert.deepEqual( loadSynonyms( write( { headings: { Routes: [ 'screens' ] }, labels: { openItems: [ 'open' ] } } ) ), { headings: { Routes: [ 'screens' ] }, labels: { openItems: [ 'open' ] } } );
		assert.ok( Object.keys( loadSynonyms().headings ).every( ( h ) => TEMPLATE_HEADINGS.includes( h ) ) );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL (labels): items under a decision label leave the open items; a still-open or to-supply line joins them', () => {
	const text = [
		'# T', '', '## Open items',
		'Client to supply: a phone number, the opening hours.', '',
		'**Inert in the draft, by decision. What each becomes:**',
		'- Express pay: through the processor.',
		'- Find address: postcode lookup.', '',
		'**Notes**',
		'- A plain bullet after a label that names nothing.', '',
		'**Decisions applied on 2026-10-11:** autoplay is off under reduced motion.', '',
		'**Still open** (`surfaces.json` unresolved): sign-in is simulated.', '',
		'## Judgement calls', '- Kept.', '',
		'### Still open', '- A question.', '',
		'### Decisions', '- A choice.', '',
	].join( '\n' );
	withFolder( ( dir ) => {
		const r = readReadme( { folder: dir } );
		assert.deepEqual( r.openItems.map( ( i ) => i.text ), [ 'Client to supply: a phone number, the opening hours.', 'A plain bullet after a label that names nothing.', '**Still open** (`surfaces.json` unresolved): sign-in is simulated.', 'A question.' ] );
		assert.deepEqual( r.judgementCalls.map( ( i ) => i.text ), [ 'Express pay: through the processor.', 'Find address: postcode lookup.', '**Decisions applied on 2026-10-11:** autoplay is off under reduced motion.', 'Kept.', 'A choice.' ] );
		assert.deepEqual( r.openItems.map( ( i ) => i.section ), [ 'Open items', 'Open items', 'Open items', 'Still open' ] );
	}, text );
	assert.equal( labelKind( 'Inert in the draft, by decision. What each becomes:' ), 'judgementCalls' );
	assert.equal( labelKind( 'Decisions still open' ), 'openItems', 'an open word wins' );
	assert.equal( labelKind( 'Reopened' ), null, 'whole words only' );
	assert.equal( labelKind( 'Notes' ), null );
} );

test( 'MUST FAIL (block hints): block-mapping bullets and table rows are kept as evidence, never in a decision list', () => withFolder( ( dir ) => {
	const r = readReadme( { folder: dir } );
	assert.deepEqual( r.blockHints.map( ( h ) => h.text ), [ 'Hero: sgs/hero (Restyle).', '| Part | Block |', '| Footer | sgs/site-footer |' ] );
	assert.ok( r.blockHints.every( ( h ) => 'Block mapping (SGS)' === h.section ) );
	assert.ok( ! r.platformIntent.some( ( p ) => /sgs\//.test( p.text ) ), 'a block hint is not platform intent' );
	withFolder( ( d ) => {
		const o = readReadme( { folder: d } );
		assert.deepEqual( [ o.platformIntent.length, o.blockHints.length ], [ 0, 1 ], 'a heading that names blocks and WooCommerce is a block hint, not platform intent' );
	}, '## Block mapping (SGS) for WooCommerce\n- Cart: sgs/cart\n' );
	assert.ok( ! [ ...r.judgementCalls, ...r.openItems, ...r.businessDetails ].some( ( p ) => /sgs\//.test( p.text ) ) );
} ) );

test( 'MUST FAIL (missing headings): a template heading the README lacks is listed, in template order', () => withFolder( ( dir ) => {
	const r = readReadme( { folder: dir } );
	assert.deepEqual( r.missing, [ 'Files', 'Routes', 'Pages', 'Forms', 'Animations and interactions', 'Revision' ] );
	assert.deepEqual( TEMPLATE_HEADINGS.filter( ( t ) => ! r.missing.includes( t ) ), [ 'Overview', 'Global layout', 'Business details', 'Judgement calls', 'Open items' ] );
	const none = readReadme( { folder: dir + '-absent' } );
	assert.deepEqual( [ none.present, none.missing.length, none.sections ], [ false, 11, [] ], 'no README: present false and every heading missing' );
} ) );

test( 'MUST FAIL (flagged command): command-like lines are kept with their reason and never dropped or acted on', () => withFolder( ( dir ) => {
	const r = readReadme( { folder: dir } );
	assert.deepEqual( r.flagged.map( ( f ) => [ f.text, Boolean( f.why ) ] ), [ [ 'Run `npm install` before you start.', true ], [ '$ rm -rf build', true ] ] );
	const setup = r.sections.find( ( s ) => 'Setup' === s.heading );
	assert.equal( setup.flagged.length, 2 );
	assert.ok( setup.text.includes( '$ rm -rf build' ), 'the flagged text stays in the section' );
	withFolder( ( d ) => assert.deepEqual( readReadme( { folder: d } ).openItems, [], 'a None bullet is no item' ), '## Open items\n- None\n' );
	withFolder( ( d ) => assert.deepEqual( readReadme( { folder: d } ).flagged.map( ( f ) => f.text ), [ 'echo hi' ] ), '## Setup\n```bash\necho hi\n```\n```text\nplain sample\n```\n' );
	const withItem = '## Open items\n- Run `npm install` first.\n- Plain item.\n';
	withFolder( ( d ) => {
		const o = readReadme( { folder: d } );
		assert.deepEqual( o.openItems.map( ( i ) => [ i.text, Boolean( i.flagged ) ] ), [ [ 'Run `npm install` first.', true ], [ 'Plain item.', false ] ] );
	}, withItem );
} ) );

test( 'MUST FAIL (join): joinFacts puts one readme object in the record and the record validates against the schema', () => withFolder( ( dir ) => {
	const readme = readReadme( { folder: dir } );
	const empty = { gaps: [], byElement: {}, surfaces: {}, byTemplate: new Map(), conditions: {}, holes: {}, mounted: {}, records: 0, unjoined: [], order: [], elements: {} };
	const base = { client: 'fixture', sources: { files: {}, route: { commit: null } }, widths: [ 375 ], template: empty, logic: empty, surfaces: empty, animations: empty, instances: empty };
	const joined = joinFacts( { ...base, readme } );
	assert.deepEqual( joined.readme, readme );
	assert.deepEqual( factsProblems( joined ), [] );
	assert.equal( 'readme' in joinFacts( base ), false, 'a record built without the reader result carries no readme' );
	assert.ok( factsProblems( { ...joined, readme: { ...readme, missing: 'Files' } } ).length > 0, 'a readme whose missing list is not a list does not validate' );
} ) );

test( 'MUST FAIL (freshness): a record whose sources hold the README is refused when the README changes', () => withFolder( ( dir ) => {
	const sources = sourcesOf( dir, { commit: null } );
	assert.ok( 'README.md' in sources.files );
	assert.deepEqual( assertCurrent( { sources }, dir ), { checked: true } );
	fs.writeFileSync( path.join( dir, 'README.md' ), `${ README }\n- late edit\n` );
	assert.throws( () => assertCurrent( { sources }, dir ), ( e ) => e instanceof StaleRecordError && /README\.md changed/.test( e.message ) );
} ) );
