// The block settings that switch one part's look onto another part (data/part-switches.json): which switches a block has, for
// lib/skeleton-part-pairing.mjs::pairAbsorbed, and the attribute the proposal writes when a pairing used one.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FILE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../data/part-switches.json' );
let cached = null;

// Every entry of the data file: [ { block, switch, value, lookElement, lookSelector, targetSelector } ].
export const allSwitches = ( file = FILE ) => {
	if ( file !== FILE ) {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) ).switches || [];
	}
	return ( cached ??= JSON.parse( fs.readFileSync( FILE, 'utf8' ) ).switches || [] );
};

// The switches of one block, as pairAbsorbed's `switches`.
export const switchesFor = ( block, file = FILE ) => allSwitches( file ).filter( ( s ) => s.block === block );

// The attributes a node holds for the switches its pairing used: { switch: value }.
export const switchAttributes = ( pairing ) => Object.fromEntries( ( pairing?.switches || [] ).map( ( s ) => [ s.switch, s.value ] ) );
