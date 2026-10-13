// Spec 38A sgsMotion contract (FR-38A-2, FR-38A-55 schema clause): the cloning tool's validator over
// `plugins/sgs-blocks/schemas/motion.schema.json` and the §10 / §5.2 refusal evaluator, driven by the shared fixtures in
// `plugins/sgs-blocks/tests/fixtures/motion/` (the PHP parity test reads the same files). Each fixture holds
// { description, expect: { valid, errors, refusals }, motion }.
// Setup: the route's own packages, once: `cd scripts/computed-route && npm ci` (node_modules is gitignored).
// Run: node --test scripts/computed-route/tests/motion-schema.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
	REPO, MOTION_SCHEMA_FILE, loadMotionSchema, motionValidator, schemaErrors, checkMotion, enumerateFields, annotationKeywords,
	rangeProblem,
} from '../lib/motion-schema.mjs';

const FIXTURES = path.join( REPO, 'plugins', 'sgs-blocks', 'tests', 'fixtures', 'motion' );
const schema = loadMotionSchema();
const fixtures = fs.readdirSync( FIXTURES )
	.filter( ( f ) => /^(valid|invalid|refusal)-.*\.json$/.test( f ) )
	.sort()
	.map( ( f ) => ( { file: f, ...JSON.parse( fs.readFileSync( path.join( FIXTURES, f ), 'utf8' ) ) } ) );
const byName = ( f ) => fixtures.find( ( x ) => x.file === f );
const clone = ( v ) => JSON.parse( JSON.stringify( v ) );

test( 'the route reads the same schema file the PHP side will', () => {
	assert.equal( MOTION_SCHEMA_FILE, path.join( REPO, 'plugins', 'sgs-blocks', 'schemas', 'motion.schema.json' ) );
	assert.equal( schema.$schema, 'https://json-schema.org/draft/2020-12/schema' );
} );

test( 'the schema compiles once under Ajv strict mode with the x-sgs annotations registered', () => {
	const v1 = motionValidator( schema );
	assert.equal( typeof v1, 'function' );
	assert.equal( motionValidator( schema ), v1, 'a second call reuses the compiled validator' );
	assert.ok( annotationKeywords( schema ).includes( 'x-sgs-field' ) );
} );

test( 'the fixture set covers every kind and every refusal rule', () => {
	for ( const kind of [ 'valid', 'invalid', 'refusal' ] ) {
		assert.ok( fixtures.some( ( f ) => f.file.startsWith( `${ kind }-` ) ), `no ${ kind }-* fixture` );
	}
	const fired = new Set();
	for ( const f of fixtures.filter( ( x ) => x.file.startsWith( 'refusal-' ) ) ) {
		checkMotion( f.motion, schema ).refusals.forEach( ( r ) => fired.add( r.id ) );
	}
	const table = schema[ 'x-sgs-refusals' ];
	for ( const rule of [ ...table.pairs, ...table.limits ] ) {
		assert.ok( fired.has( rule.id ), `refusal ${ rule.id } has no fixture that fires it` );
	}
} );

for ( const f of fixtures.filter( ( x ) => x.file.startsWith( 'valid-' ) ) ) {
	test( `happy: ${ f.file } is valid with no refusals`, () => {
		const r = checkMotion( f.motion, schema );
		assert.deepEqual( r.errors, [] );
		assert.deepEqual( r.refusals, [] );
		assert.equal( r.valid, true );
	} );
}

for ( const f of fixtures.filter( ( x ) => x.file.startsWith( 'invalid-' ) ) ) {
	test( `fail: ${ f.file } is refused with a named error`, () => {
		const r = checkMotion( f.motion, schema );
		assert.equal( r.valid, false );
		for ( const line of f.expect.errors ) {
			assert.ok( r.errors.includes( line ), `expected "${ line }" in:\n${ r.errors.join( '\n' ) }` );
		}
	} );
}

for ( const f of fixtures.filter( ( x ) => x.file.startsWith( 'refusal-' ) ) ) {
	test( `fail: ${ f.file } returns its exact refusal text`, () => {
		const r = checkMotion( f.motion, schema );
		assert.deepEqual( r.errors, [], 'a refusal fixture is schema-valid' );
		assert.deepEqual( r.refusals.map( ( x ) => x.text ), f.expect.refusals );
		assert.equal( r.valid, false );
	} );
}

test( 'edge: a token reference, a negated distance token and a linear() easing are accepted', () => {
	const v = byName( 'valid-token-and-linear-easing.json' ).motion.elements.root.hover.state.values;
	assert.equal( v.duration, 'token:duration.fast' );
	assert.match( v.easing, /^linear\(/ );
	assert.deepEqual( schemaErrors( byName( 'valid-token-and-linear-easing.json' ).motion, schema ), [] );
	const lift = byName( 'valid-three-panel-stacked-hover.json' ).motion.elements.root.hover.state.values.translateY;
	assert.equal( lift, '-token:distance.sm' );
} );

test( 'edge: a custom:1 target with a scoped selector is accepted and refused without its review row', () => {
	const ok = byName( 'valid-custom-target.json' ).motion;
	assert.deepEqual( schemaErrors( ok, schema ), [] );
	const noReview = clone( ok );
	delete noReview.elements[ 'custom:1' ].review;
	assert.ok( schemaErrors( noReview, schema ).includes( "/elements/custom:1: must have required property 'review'" ) );
	const escaping = clone( ok );
	escaping.elements[ 'custom:1' ].selector = '.a, body';
	assert.ok( schemaErrors( escaping, schema ).some( ( e ) => e.startsWith( '/elements/custom:1/selector:' ) ) );
	const plainSelector = clone( ok );
	plainSelector.elements.root = { selector: '.x' };
	assert.ok( schemaErrors( plainSelector, schema ).includes( '/elements/root: must NOT have additional properties (selector)' ) );
} );

test( 'fail: a planted unknown key inside an effect layer is named', () => {
	const doc = clone( byName( 'valid-three-panel-stacked-hover.json' ).motion );
	doc.elements.root.hover.effects[ 0 ].values.wobble = 1;
	assert.ok( schemaErrors( doc, schema ).includes( '/elements/root/hover/effects/0/values: must NOT have additional properties (wobble)' ) );
} );

test( 'negative control: removing the conflicting layer clears the refusal', () => {
	const doc = clone( byName( 'refusal-tilt-scrub-transform.json' ).motion );
	doc.elements.root.effects[ 0 ].values.rows[ 0 ].property = 'opacity';
	assert.deepEqual( checkMotion( doc, schema ).refusals, [] );
} );

test( 'enumeration: every field carries its type, CSS property, state and per-device flag', () => {
	const rows = enumerateFields( schema );
	const states = new Set( schema[ 'x-sgs-states' ] );
	assert.ok( rows.length > 100 );
	for ( const r of rows ) {
		assert.ok( 'cssProperty' in r && 'perDevice' in r && 'state' in r, `${ r.layer } ${ r.path }` );
		if ( r.layer !== 'stagger' ) {
			assert.ok( states.has( r.state ), `${ r.layer } ${ r.path } state ${ r.state }` );
		}
		if ( [ 'duration', 'distance', 'angle' ].includes( r.fieldType ) && r.layer !== 'stagger' ) {
			assert.equal( r.perDevice, true, `FR-38A-46: ${ r.layer } ${ r.effect || '' } ${ r.path } is not per device` );
		}
	}
	const lift = rows.find( ( r ) => r.layer === 'hover.state' && r.path === 'values.translateY' );
	assert.deepEqual( [ lift.fieldType, lift.cssProperty, lift.state, lift.perDevice ], [ 'distance', '--sgs-mh-ty', 'hover', true ] );
	assert.ok( rows.some( ( r ) => r.layer === 'effects' && r.effect === 'scramble' ) && rows.some( ( r ) => r.layer === 'entrance.text' && r.effect === 'scramble' ) );
} );

test( 'x-sgs-range: unit strings convert to the base unit; tokens and calc are exempt; relative units are refused', () => {
	const deg = { min: 0, max: 45, unit: 'deg' };
	assert.equal( rangeProblem( deg, 45 ), null );
	assert.equal( rangeProblem( deg, '0.125turn' ), null );
	assert.equal( rangeProblem( deg, '0.5rad' ), null );
	assert.equal( rangeProblem( deg, '90deg' ), 'must be from 0 to 45deg (got 90deg)' );
	assert.equal( rangeProblem( deg, 46 ), 'must be from 0 to 45deg (got 46deg)' );
	const ms = { min: 0, max: 3000, unit: 'ms' };
	assert.equal( rangeProblem( ms, '2.5s' ), null );
	assert.equal( rangeProblem( ms, '4s' ), 'must be from 0 to 3000ms (got 4s)' );
	assert.equal( rangeProblem( ms, 'token:duration.slow' ), null );
	const px = { min: 0, max: 200, unit: 'px' };
	assert.equal( rangeProblem( px, '-token:distance.sm' ), 'must be from 0 to 200px (got -token:distance.sm, a negated token)', 'a range from zero up refuses a negated token' );
	assert.equal( rangeProblem( { min: -200, max: 200, unit: 'px' }, '-token:distance.sm' ), null, 'a range that allows negatives takes it' );
	assert.equal( rangeProblem( px, 'calc(1px + 2px)' ), null );
	assert.equal( rangeProblem( px, '10vh' ), 'unit "vh" has no fixed size, so this ranged field takes px' );
	assert.equal( rangeProblem( px, '10deg' ), 'unit "deg" does not convert to px' );
	const ranged = schema.$defs.HoverStateValues.properties.maxAngle[ 'x-sgs-range' ];
	assert.deepEqual( ranged, { min: 0, max: 45, unit: 'deg' } );
} );
