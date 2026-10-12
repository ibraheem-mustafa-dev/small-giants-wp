// Spec 48 Appendix C ("Record formats") against the schema files in data/: Appendix C fixes each record's shape, the
// schema files are generated from it, and tests/intake-schemas.test.mjs fails when the two disagree. Pure functions over
// the spec's text and parsed schema objects, so the test can run them on temp copies.
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const SPEC_FILE = path.join( HERE, '..', '..', '..', '.claude', 'specs', '48-CLONING-SYSTEM.md' );
export const DATA_DIR = path.join( HERE, '..', 'data' );

// Appendix C's JSON blocks by bold label: the schema file each is generated into, and how the file wraps the block
// ('body': the file is the block plus wrapper keys; 'items': the file is an array schema whose items is the block).
export const LABELS = {
	'Calibration baseline': { file: 'calibration-baseline.schema.json', shape: 'body' },
	'Reading': { file: 'reading.schema.json', shape: 'body' },
	'Construct registry': { file: 'construct-registry.schema.json', shape: 'body' },
	'Page map row': { file: 'page-map.schema.json', shape: 'items' },
};

// Keys a schema file carries around Appendix C's body.
const WRAPPER_KEYS = [ '$schema', '$id', 'title', 'description' ];

// The text from Appendix C's heading to the end of the file (the whole text when the heading is absent).
function appendix( specText ) {
	const at = specText.indexOf( '## Appendix C.' );
	return at < 0 ? specText : specText.slice( at );
}

// The parsed first ```json block after the bold label `**<label>:**`; throws naming the label when there is none.
export function specBlock( specText, label ) {
	const text = appendix( specText );
	const at = text.indexOf( `**${ label }:**` );
	if ( at < 0 ) {
		throw new Error( `Appendix C has no **${ label }:** label` );
	}
	const m = /```json\r?\n([\s\S]*?)\r?\n```/.exec( text.slice( at ) );
	if ( ! m ) {
		throw new Error( `Appendix C has no json block after **${ label }:**` );
	}
	try {
		return JSON.parse( m[ 1 ] );
	} catch ( e ) {
		throw new Error( `Appendix C's **${ label }:** block is not valid JSON (${ e.message })` );
	}
}

// The intake record's top-level keys: the backticked names in the first column of the table under **Intake record:**.
function intakeKeys( specText ) {
	const text = appendix( specText );
	const at = text.indexOf( '**Intake record:**' );
	if ( at < 0 ) {
		throw new Error( 'Appendix C has no **Intake record:** label' );
	}
	const keys = [];
	let inTable = false;
	for ( const line of text.slice( at ).split( /\r?\n/ ).slice( 1 ) ) {
		if ( ! line.startsWith( '|' ) ) {
			if ( inTable ) {
				break;
			}
			continue;
		}
		inTable = true;
		const first = line.split( '|' )[ 1 ].trim();
		if ( 'Key' === first || /^-+$/.test( first ) ) {
			continue;
		}
		keys.push( ...[ ...first.matchAll( /`([^`]+)`/g ) ].map( ( k ) => k[ 1 ] ) );
	}
	return keys;
}

// The construct kinds listed in the paragraph after the registry block ("Each key is a construct kind (`sc-if`, ...)").
export function constructKinds( specText ) {
	const text = appendix( specText );
	const m = /Each key is a construct kind \(([^)]*)\)/.exec( text );
	if ( ! m ) {
		throw new Error( 'Appendix C has no "Each key is a construct kind (...)" list' );
	}
	return [ ...m[ 1 ].matchAll( /`([^`]+)`/g ) ].map( ( k ) => k[ 1 ] );
}

// Every difference between two JSON values as "<path>: <why>" (object key order ignored, array order kept).
function jsonDiff( want, got, at = '' ) {
	const where = at || '/';
	const kind = ( v ) => ( Array.isArray( v ) ? 'array' : null === v ? 'null' : typeof v );
	if ( kind( want ) !== kind( got ) ) {
		return [ `${ where }: Appendix C has ${ JSON.stringify( want ) }, the schema file has ${ JSON.stringify( got ) }` ];
	}
	if ( 'array' === kind( want ) ) {
		if ( want.length !== got.length ) {
			return [ `${ where }: Appendix C has ${ JSON.stringify( want ) }, the schema file has ${ JSON.stringify( got ) }` ];
		}
		return want.flatMap( ( v, i ) => jsonDiff( v, got[ i ], `${ at }/${ i }` ) );
	}
	if ( 'object' === kind( want ) ) {
		const out = [];
		for ( const k of Object.keys( want ) ) {
			if ( ! ( k in got ) ) {
				out.push( `${ at }/${ k }: in Appendix C, missing from the schema file` );
			} else {
				out.push( ...jsonDiff( want[ k ], got[ k ], `${ at }/${ k }` ) );
			}
		}
		for ( const k of Object.keys( got ) ) {
			if ( ! ( k in want ) ) {
				out.push( `${ at }/${ k }: in the schema file, not in Appendix C` );
			}
		}
		return out;
	}
	return want === got ? [] : [ `${ where }: Appendix C has ${ JSON.stringify( want ) }, the schema file has ${ JSON.stringify( got ) }` ];
}

// The part of a schema file Appendix C fixes: the body without its wrapper keys, or an array schema's items.
function schemaBody( schema, shape = 'body' ) {
	if ( 'items' === shape ) {
		if ( 'array' !== schema?.type || ! schema.items ) {
			return { error: 'the schema file is not an array schema with items' };
		}
		return { body: schema.items };
	}
	const body = { ...schema };
	for ( const k of WRAPPER_KEYS ) {
		delete body[ k ];
	}
	return { body };
}

// Readable disagreements between Appendix C's block for `label` and a parsed schema file, each prefixed with the label.
export function syncProblems( specText, label, schema ) {
	const { shape } = LABELS[ label ];
	const { body, error } = schemaBody( schema, shape );
	if ( error ) {
		return [ `${ label }: ${ error }` ];
	}
	const prefix = 'items' === shape ? '/items' : '';
	return jsonDiff( specBlock( specText, label ), body, prefix ).map( ( d ) => `${ label }: ${ d }` );
}

// Readable disagreements between the intake record's key table and a parsed intake.schema.json: its top-level required
// must equal the key set, and properties must hold each key.
export function intakeProblems( specText, schema ) {
	const keys = intakeKeys( specText );
	const want = new Set( keys );
	const required = new Set( schema?.required || [] );
	const out = [];
	for ( const k of keys ) {
		if ( ! required.has( k ) ) {
			out.push( `Intake record: ${ k } is in Appendix C but not in the schema's required` );
		}
		if ( ! schema?.properties || ! ( k in schema.properties ) ) {
			out.push( `Intake record: ${ k } is in Appendix C but not in the schema's properties` );
		}
	}
	for ( const k of required ) {
		if ( ! want.has( k ) ) {
			out.push( `Intake record: ${ k } is required by the schema but not in Appendix C` );
		}
	}
	return out;
}
