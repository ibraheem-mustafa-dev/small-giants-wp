// A draft mount that names a preset (Spec 48A FR-48A-17: `<dc-import name="Button" version="gold">`) is cloned as that preset
// (lib/fill-mount-version.mjs::mountVersions, lib/fill-preset.mjs::presetWrites): the snapshot's preset of that name is written as
// `inheritStyle` before any look is matched, only the per-instance values equal to the preset's are dropped, and a button that
// differs from its preset keeps its difference. A bound or unknown version never writes a name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { mountVersions, versionDefaults } from '../lib/fill-mount-version.mjs';
import { presetWrites } from '../lib/fill-preset.mjs';

const props = ( version ) => JSON.stringify( { version: { editor: 'enum', options: [ 'primary', 'gold', 'ghost' ], default: version }, size: { editor: 'enum', options: [ 'sm', 'lg' ] } } ).replace( /"/g, '&quot;' );
const folder = fs.mkdtempSync( path.join( os.tmpdir(), 'mount-version-' ) );
fs.writeFileSync( path.join( folder, 'Button.dc.html' ), `<x-dc><a href="#">x</a></x-dc><script data-dc-script data-props="${ props( 'primary' ) }"></script>` );
fs.writeFileSync( path.join( folder, 'Card.dc.html' ), `<x-dc><div>x</div></x-dc><script data-dc-script data-props="${ JSON.stringify( { tone: { editor: 'enum', options: [ 'a', 'b' ] } } ).replace( /"/g, '&quot;' ) }"></script>` );
const defaults = versionDefaults( folder );

const db = new DatabaseSync( ':memory:' );
db.exec( 'CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, attr_type TEXT, default_value TEXT, enum_values TEXT)' );
db.prepare( 'INSERT INTO block_attributes VALUES (?, ?, ?, ?, ?)' ).run( 'sgs/button', 'inheritStyle', 'string', '"primary"', null );

const el = ( tag, template = {} ) => ( { template: { tag, parentChain: [], attrs: {}, ...template } } );
const mount = ( name, attrs ) => el( 'dc-import', { own: { name, props: Object.keys( attrs ) }, attrs: { name, ...attrs } } );
const facts = ( attrs, component = 'Button' ) => ( { elements: { 'Home/12': mount( component, attrs ), 'Button/3': el( 'a' ), 'Card/3': el( 'a' ) } } );
const node = ( finder ) => ( { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '', finder } ] } );
const KEY = 'Root>Button@12#0/3#0';

test( 'MUST FAIL: the mount\'s literal version is the node\'s preset version', () => {
	const m = mountVersions( { nodes: [ node( { tpl: KEY } ) ], facts: facts( { version: 'gold', size: 'lg' } ), rootComponent: 'Home', defaults } );
	assert.deepEqual( m.get( 0 ), { version: 'gold', component: 'Button', how: 'mount' } );
} );

test( 'a mount with no version takes the component\'s declared default', () => {
	const m = mountVersions( { nodes: [ node( { tpl: KEY } ) ], facts: facts( { size: 'lg' } ), rootComponent: 'Home', defaults } );
	assert.deepEqual( m.get( 0 ), { version: 'primary', component: 'Button', how: 'default' } );
} );

test( 'a bound version, a component with no version enum and a non-control element read nothing (negative controls)', () => {
	const at = ( f, key = KEY, comp = 'Button' ) => mountVersions( { nodes: [ node( { tpl: key } ) ], facts: f, rootComponent: 'Home', defaults } ).size;
	assert.equal( at( facts( { version: '{{ item.version }}' } ) ), 0, 'bound' );
	assert.equal( at( facts( { version: 'a' }, 'Card' ), 'Root>Card@12#0/3#0' ), 0, 'Card declares no version enum' );
	assert.equal( at( facts( { version: 'gold' } ), 'Root>Button@12#0/4#0' ), 0, 'an element the facts do not know has no tag' );
	assert.equal( at( facts( { version: 'gold' } ), 'Root/3#0' ), 0, 'an element in the root draft is no mount' );
} );

test( 'a nested mount is found through the chain part before it', () => {
	const f = { elements: { 'Header/7': mount( 'Button', { version: 'ghost' } ), 'Button/3': el( 'a' ) } };
	const m = mountVersions( { nodes: [ node( { tpl: 'Root>Header@2#0>Button@7#0/3#0' } ) ], facts: f, rootComponent: 'Home', defaults } );
	assert.equal( m.get( 0 )?.version, 'ghost' );
} );

// --- presetWrites ---
const GOLD = { background: '#d8ca50', text: '#000000', 'border-width': '0px', padding: '10px 20px 10px 20px', 'font-size': '16px', 'font-weight': '700', 'hover-background': '#000000' };
const PRIMARY = { background: '#0a7ea8', text: '#ffffff', 'border-width': '0px', padding: '10px 20px 10px 20px', 'font-size': '16px', 'font-weight': '700' };
const STYLES = { 'background-color': 'rgb(216, 202, 80)', color: 'rgb(0, 0, 0)', 'border-top-width': '0px', 'padding-top': '10px', 'padding-right': '20px', 'padding-bottom': '10px', 'padding-left': '20px', 'font-size': '16px', 'font-weight': '700' };
const readsOf = ( styles ) => ( { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles } } ] ) ), states: {} } );
const w = ( prop, attr ) => ( { node: 'r0', slot: '', prop, attr, before: null, after: 'x', widths: [ 1440 ] } );
function run( { styles = STYLES, mounts, presets = { primary: PRIMARY, gold: GOLD } } ) {
	const flat = [ { name: 'sgs/button', attributes: { colourBackground: 'x', fontSize: 'x', letterSpacing: 'x' }, ref: 'r0' } ];
	const res = presetWrites( { nodes: [ node( { tpl: KEY } ) ], flat, refOf: ( n ) => n.ref, reads: readsOf( styles ), rawSnapshot: { settings: { custom: { buttonPresets: presets } } }, snapshot: { palette: [], spacing: [], fontSizes: [] }, writes: [ w( 'background-color', 'colourBackground' ), w( 'font-size', 'fontSize' ), w( 'letter-spacing', 'letterSpacing' ) ], db, mounts } );
	return { flat, ...res };
}
const MOUNTED = ( version ) => new Map( [ [ 0, { version, component: 'Button', how: 'mount' } ] ] );

test( 'the mount\'s version is written as the preset, and the values equal to it are not written', () => {
	const r = run( { mounts: MOUNTED( 'gold' ) } );
	assert.equal( r.flat[ 0 ].attributes.inheritStyle, 'gold' );
	assert.equal( r.flat[ 0 ].attributes.colourBackground, undefined, 'equal to the preset: dropped' );
	assert.equal( r.flat[ 0 ].attributes.fontSize, undefined, 'equal to the preset: dropped' );
	assert.match( r.notes.join( '\n' ), /mounts Button as version gold/ );
} );

test( 'the mount\'s version wins over the preset the look matches', () => {
	// The look equals gold, the mount says primary: the mount decides, and the gold-coloured background (different from primary) stays written.
	const r = run( { mounts: MOUNTED( 'primary' ) } );
	assert.equal( r.flat[ 0 ].attributes.inheritStyle, 'primary' );
	assert.equal( r.flat[ 0 ].attributes.colourBackground, 'x', 'differs from the primary preset: the button keeps its difference' );
	assert.equal( r.flat[ 0 ].attributes.fontSize, undefined, 'equal to the primary preset too: dropped' );
	assert.ok( r.writes.some( ( x ) => 'colourBackground' === x.attr ), 'the write stays in the list' );
} );

test( 'a button that differs from its named preset keeps every value that differs', () => {
	const r = run( { mounts: MOUNTED( 'gold' ), styles: { ...STYLES, 'font-size': '22px' } } );
	assert.equal( r.flat[ 0 ].attributes.inheritStyle, 'gold' );
	assert.equal( r.flat[ 0 ].attributes.fontSize, 'x', 'the 22px size differs from the preset 16px and stays' );
	assert.equal( r.flat[ 0 ].attributes.colourBackground, undefined );
} );

test( 'a version the snapshot does not carry writes no preset and is noted; no mount keeps the look match (negative controls)', () => {
	const none = run( { mounts: MOUNTED( 'neon' ) } );
	assert.equal( none.flat[ 0 ].attributes.inheritStyle, undefined, 'not even the preset the look would match' );
	assert.match( none.notes.join( '\n' ), /version neon, which the site's buttonPresets does not carry/ );
	const { 'hover-background': _hover, ...rest } = GOLD;
	assert.equal( run( { mounts: null, presets: { primary: PRIMARY, gold: rest } } ).flat[ 0 ].attributes.inheritStyle, 'gold', 'a classic draft still matches by look' );
} );
