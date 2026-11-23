// sgs/choice-flow's stepper settings (stepperColour, stepperActiveColour) paint the numbered circles the block draws only
// under progressStyle 'circles' (render.php echoes .sgs-choice-flow__stepper only then); the fixture renders the bar, so
// both read dead with their part never drawn. the setting record's fixtures.json gives the stepper family that precondition.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { planInstances, instanceCtx } from '../lib/calibrate-instances.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { openDb, attrsFor, variantInfo } from '../lib/db.mjs';
import { longhands } from '../lib/calibrate-props.mjs';
import { recordFixtures } from '../lib/setting-record.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FX = recordFixtures();
const SNAP = { palette: [ { slug: 'primary', colour: { r: 10, g: 120, b: 60, a: 1 } } ], spacing: [], fontSizes: [] };
const BLOCK = 'sgs/choice-flow';

const plan = () => {
	const db = openDb();
	const fixture = FX[ BLOCK ];
	const rows = attrsFor( db, BLOCK ).filter( ( r ) => longhands( r.css_property ).length );
	return planInstances( BLOCK, { rows, schema: blockSchema( BLOCK ) || {}, snapshot: SNAP, fixture, ctx: instanceCtx( variantInfo( db, BLOCK ), null, fixture ) } ).instances;
};

test( 'MUST FAIL (stepperActiveColour dead, stepper not drawn): every stepper marker is read with the circles stepper drawn, against a baseline that draws it too', () => {
	const instances = plan();
	const stepper = instances.filter( ( i ) => /^stepper/.test( i.row?.attr_name ?? '' ) );
	assert.ok( stepper.length > 0 );
	for ( const i of stepper ) {
		assert.equal( i.attrs.progressStyle, 'circles', i.key );
		const base = instances.find( ( b ) => b.isBase && b.baseKey === i.baseKey );
		assert.equal( base?.attrs.progressStyle, 'circles', `${ i.key } is compared with a baseline that draws the stepper` );
	}
} );

test( 'negative control: the default instances and every setting outside the stepper family keep the fixture\'s own progress style', () => {
	const instances = plan();
	for ( const d of instances.filter( ( i ) => i.isDefault ) ) {
		assert.equal( d.attrs.progressStyle, FX[ BLOCK ].attributes.progressStyle );
	}
	const others = instances.filter( ( i ) => i.row && ! /^stepper/.test( i.row.attr_name ) );
	assert.ok( others.length > 0 && others.every( ( i ) => 'circles' !== i.attrs.progressStyle ) );
} );
