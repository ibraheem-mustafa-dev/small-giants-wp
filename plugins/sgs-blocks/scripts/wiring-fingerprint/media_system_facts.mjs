/**
 * The media system's wiring facts for check-wiring-fingerprint.py (Spec 49 §8, §9.3).
 *
 * An adopted block (a `supports.sgs.mediaElements` entry that declares `kinds`) has its media attributes written by the
 * shared panels, read by the shared renderer and drawn in the canvas by `mediaPreview`, none of which name the
 * attribute: each builds `{prefix}{Base}` at run time. So the gate cannot see these links in the block's own files. This
 * script gives it the data instead, from the same registry the generator, the panels and the renderer read:
 *
 *   { blocks: { '<block>': { '<attribute>': { base, context, offered, reads: { php, js } } } },
 *     shared: { canvas: [...], php: [...] } }
 *
 * - `offered`: the shared panels offer the setting for that slot: the slot's atoms carry the row, the row has a
 *   control, and the row's `slots` allow the slot's context and one of its kinds (`settingAppliesToSlot`, the rule the
 *   generator and the panel model share). A setting the slot never offers is `offered: false`, and the gate gives it no
 *   credit.
 * - `paints`: the row names a CSS property or an emitter. A row with neither (Load priority) changes no appearance, so a
 *   role that is not a paint role makes the attribute not-paint.
 * - `reads.php`: the base's name is a quoted literal in the renderer's atoms and helpers (`includes/media/**`), so the
 *   renderer reads it by name. `reads.js`: the same in the canvas's emitters (`src/components/media/atoms`, `emit`).
 *
 * Usage: node media_system_facts.mjs <plugin dir> [<blocks dir>]   (the blocks dir defaults to <plugin dir>/src/blocks; the
 * tests point it at block.json files of their own)
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const plugin = path.resolve( process.argv[ 2 ] || '.' );
const blocksDir = path.resolve( process.argv[ 3 ] || path.join( plugin, 'src', 'blocks' ) );
const url = ( ...seg ) => pathToFileURL( path.join( plugin, ...seg ) ).href;

// A plugin tree with no media system (the gate's miniature fixtures) has no adopted blocks.
if ( ! fs.existsSync( path.join( plugin, 'src', 'components', 'media', 'emit', 'adopted-settings.js' ) ) ) {
	process.stdout.write( JSON.stringify( { blocks: {}, shared: { php: [], canvas: [] } } ) );
	process.exit( 0 );
}
const { adoptedAtomsForElement, ADOPTED_SETTINGS, settingAppliesToSlot } = await import( url( 'src', 'components', 'media', 'emit', 'adopted-settings.js' ) );
const { mediaAttrName } = await import( url( 'src', 'components', 'MediaElementControls.js' ) );

const walk = ( dir, test, out = [] ) => {
	for ( const entry of fs.existsSync( dir ) ? fs.readdirSync( dir, { withFileTypes: true } ) : [] ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			walk( full, test, out );
		} else if ( test( entry.name ) ) {
			out.push( full );
		}
	}
	return out;
};
const textOf = ( files ) => files.map( ( f ) => fs.readFileSync( f, 'utf8' ) ).join( '\n' );
const rel = ( f ) => path.relative( plugin, f ).split( path.sep ).join( '/' );

const phpFiles = walk( path.join( plugin, 'includes', 'media' ), ( n ) => n.endsWith( '.php' ) );
const jsFiles = [
	...walk( path.join( plugin, 'src', 'components', 'media', 'atoms' ), ( n ) => n.endsWith( '.js' ) && ! n.endsWith( '.control.js' ) ),
	...walk( path.join( plugin, 'src', 'components', 'media', 'emit' ), ( n ) => n.endsWith( '.js' ) && ! /settings\.js$/.test( n ) ),
];
const php = textOf( phpFiles );
const js = textOf( jsFiles );
const quoted = ( text, base ) => new RegExp( `['"]${ base }['"]` ).test( text );

const blocks = {};
for ( const file of walk( blocksDir, ( n ) => n === 'block.json' ).sort() ) {
	const block = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const entries = ( block?.supports?.sgs?.mediaElements || [] ).filter( ( e ) => Array.isArray( e?.kinds ) );
	if ( ! entries.length ) {
		continue;
	}
	const attrs = {};
	for ( const element of entries ) {
		const prefix = element.prefix ? String( element.prefix ) : '';
		for ( const id of adoptedAtomsForElement( element ) ) {
			for ( const setting of ADOPTED_SETTINGS[ id ] || [] ) {
				const name = mediaAttrName( prefix, setting.base );
				const offered = !! setting.control && settingAppliesToSlot( setting, element );
				const prior = attrs[ name ];
				attrs[ name ] = {
					base: setting.base,
					context: element.context || 'element',
					offered: !! ( prior && prior.offered ) || offered,
					paints: !! ( setting.css?.property || ( setting.emitter && 'none' !== setting.emitter ) ),
					reads: { php: quoted( php, setting.base ), js: quoted( js, setting.base ) },
				};
			}
		}
	}
	blocks[ block.name ] = attrs;
}

process.stdout.write( JSON.stringify( {
	blocks,
	shared: { php: phpFiles.map( rel ), canvas: jsFiles.map( rel ) },
} ) );
