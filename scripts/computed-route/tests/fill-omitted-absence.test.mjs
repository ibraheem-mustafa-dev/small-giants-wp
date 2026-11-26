// A draft that lacks a part the block already omits says nothing for a setting that would hide it. The Indus testimonial card draws
// no rating stars; calibration's default render of sgs/testimonial shows them (its fixture turns showRating on to measure the
// rating), so every variant that hides the stars scored on the draft's missing stars and `case-study-media` won (15 hidden paths),
// writing a variant that puts the name beside the quote. The node's own default (showRating off) never draws them
// (lib/fill-fixture.mjs::absentByDefault, ::withoutOmittedAbsences; 2026-11-20). The calibration is a slice of the block's
// (tests/fixtures/fill-omitted-absence/calibration.json), the fixtures and the framework database the real ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openDb } from '../lib/db.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { absentByDefault, withoutOmittedAbsences } from '../lib/fill-fixture.mjs';
import { presenceDecisions } from '../lib/fill-presence.mjs';
import { recordFixtures } from '../lib/setting-record.mjs';

const CAL = JSON.parse( fs.readFileSync( new URL( './fixtures/fill-omitted-absence/calibration.json', import.meta.url ), 'utf8' ) );
const FIXTURES = recordFixtures();
const db = openDb();
const schema = blockSchema( 'sgs/testimonial' );
const st = { fixtures: FIXTURES, db, fixtureViews: new Map() };
const NAME = '.sgs-testimonial__footer > .sgs-testimonial__meta > .sgs-testimonial__name';
const RATING = '.sgs-testimonial__rating';
const STAR = `${ RATING } > .sgs-testimonial__star:nth-of-type(1)`;
// What Fill's evidence holds for the card: the slots the skeleton named are drawn, the svg glyph paths the block has and the draft lacks are not.
const evidence = { '.sgs-testimonial__quote': true, [ NAME ]: true, [ STAR ]: false, [ `${ STAR } > svg` ]: false, [ `${ STAR } > svg > polygon` ]: false, [ RATING ]: false };

test( 'MUST FAIL: the rating the showRating switch leaves off is absent by default, with every slot calibration measured under it', () => {
	const slots = absentByDefault( st, 'sgs/testimonial', CAL, schema, {} );
	assert.ok( slots.includes( RATING ), 'the rating part is not drawn at the node\'s defaults' );
	assert.deepEqual( absentByDefault( st, 'sgs/testimonial', CAL, schema, { showRating: true } ).includes( RATING ), false, 'a node that sets the switch draws it' );
	const more = { ...CAL, settings: { ...CAL.settings, quoteColour: { slot: '.sgs-testimonial__quote' } } };
	assert.equal( absentByDefault( { ...st, fixtureViews: new Map() }, 'sgs/testimonial', more, schema, {} ).includes( '.sgs-testimonial__quote' ), false, 'a setting the switch does not gate is drawn' );
	assert.deepEqual( absentByDefault( { fixtures: null, db }, 'sgs/testimonial', CAL, schema, {} ), [], 'no fixtures, nothing known' );
} );

test( 'MUST FAIL: the draft\'s missing stars give no variant a score, so none is written', () => {
	const bare = presenceDecisions( { calibration: CAL, schema, attributes: {}, evidence } );
	assert.equal( bare.writes.find( ( w ) => 'variant' === w.attr )?.value, 'case-study-media', 'on the raw evidence the variant that hides the stars wins' );
	const slots = absentByDefault( st, 'sgs/testimonial', CAL, schema, {} );
	const kept = withoutOmittedAbsences( evidence, slots );
	assert.deepEqual( Object.keys( kept ).sort(), [ '.sgs-testimonial__quote', NAME ].sort(), 'the absences at and under the rating are dropped, the drawn parts stay' );
	assert.equal( presenceDecisions( { calibration: CAL, schema, attributes: {}, evidence: kept } ).writes.some( ( w ) => 'variant' === w.attr ), false );
} );

test( 'negative control: an absence outside the omitted parts, and a drawn part under one, keep their evidence', () => {
	const ev = { [ `${ RATING } > extra` ]: true, '.sgs-testimonial__other': false, [ RATING ]: false };
	assert.deepEqual( withoutOmittedAbsences( ev, [ RATING ] ), { [ `${ RATING } > extra` ]: true, '.sgs-testimonial__other': false } );
	assert.deepEqual( withoutOmittedAbsences( ev, [] ), ev );
	assert.deepEqual( withoutOmittedAbsences( { [ `${ RATING }-meta` ]: false }, [ RATING ] ), { [ `${ RATING }-meta` ]: false }, 'a sibling whose name starts the same is not under it' );
} );

test( 'MUST FAIL: Fill gives the presence decisions the evidence without the omitted parts\' absences', () => {
	const src = fs.readFileSync( new URL( '../lib/fill-resolve.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /const evidence = st\.db \? withoutOmittedAbsences\( drawn, absentByDefault\( st, rec\.name, cal, blockSchema\( rec\.name \) \|\| \{\}, node\.attributes \|\| \{\} \) \) : drawn;/ );
	assert.match( src, /take\( presenceDecisions\( \{ calibration: cal, schema: blockSchema\( rec\.name \), attributes: \{ \.\.\.owned, \.\.\.\( node\.attributes \|\| \{\} \) \}, evidence \} \) \)/ );
} );
