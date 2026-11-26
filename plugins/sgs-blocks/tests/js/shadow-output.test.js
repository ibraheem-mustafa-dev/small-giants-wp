/**
 * The shared shadow output (`src/utils/shadow-output.js`) against the table the PHP twin is tested against
 * (`tests/shared/shadow-output-cases.json`), plus the editor preset fix: a theme preset on a surface that follows its
 * shape used to draw nothing on the canvas, because the JS converter could not read the theme's preset list.
 *
 * Guards (each was proven able to fail by breaking the rule in turn):
 *   1 follow mode prints box-shadow                    -> the follow cases
 *   2 a preset reference is not resolved               -> "follow: a multi-layer preset ..." and the registry test
 *   3 box mode loses its forced-colours fallback       -> "box: one layer ..."
 *   4 the editor's own settings are not read           -> "reads the theme presets from the editor's settings"
 */
'use strict';

import {
	dropShadow,
	shadowDeclMap,
	shadowForcedColoursDecl,
} from '../../src/utils/shadow-output';
import {
	registerShadowPresets,
	shadowPresetComposed,
} from '../../src/utils/shadow-presets';
import { composeShadow } from '../../src/utils/shadow-layers';
import table from '../shared/shadow-output-cases.json';
// Loading the shape atom registers the mask shapes the shadow emitter asks about.
import '../../src/components/media/atoms/shape';
import { emit as shadowEmit } from '../../src/components/media/atoms/shadow';

const fill = ( map ) =>
	Object.fromEntries(
		Object.entries( map ).map( ( [ key, value ] ) => [
			key,
			'@FORCED@' === value ? table.forcedColours : value,
		] )
	);

// The block editor's settings, as `getSettings().__experimentalFeatures` serves them: presets by origin.
const serveEditorPresets = ( presets ) => {
	globalThis.wp = {
		data: {
			select: () => ( {
				getSettings: () => ( {
					__experimentalFeatures: { shadow: { presets } },
				} ),
			} ),
		},
	};
};

beforeEach( () => serveEditorPresets( table.presets ) );
afterEach( () => {
	registerShadowPresets( [] );
	delete globalThis.wp;
} );

describe( 'shadowDeclMap against the shared table', () => {
	test( 'the forced-colours fallback is the table\'s', () => {
		expect( shadowForcedColoursDecl() ).toBe( table.forcedColours );
	} );

	test.each( table.cases.map( ( row ) => [ row.name, row ] ) )( '%s', ( name, row ) => {
		const composed = composeShadow( row.shape, row.colour );
		// A palette-free hex colour in the table is already hex; the canvas composer leaves rgba() alone, so the
		// preset path (which hexes) is the one that must match PHP.
		expect( shadowDeclMap( composed, { followShape: row.followShape } ) ).toEqual(
			fill( row.expected )
		);
	} );
} );

describe( 'theme presets on a surface that follows its shape', () => {
	const SLOT = { prefix: 'm', kinds: [ 'image' ], context: 'element' };
	const attrs = {
		mSource: { kind: 'image', width: 800, height: 600 },
		mShape: { shape: 'hexagon' },
		mBoxShadow: 'soft',
	};

	test( 'a registered preset prints its layers as a drop-shadow', () => {
		expect( shadowPresetComposed( 'soft' ) ).toBe(
			'0px 1px 2px 0px #0000001F, 0px 4px 8px 0px #00000014'
		);
		expect( dropShadow( 'var(--wp--preset--shadow--soft)' ) ).toBe(
			'drop-shadow(0px 1px 2px #0000001F) drop-shadow(0px 4px 8px #00000014)'
		);
	} );

	test( 'without the preset list the preset draws nothing, as before', () => {
		delete globalThis.wp;
		expect( dropShadow( 'var(--wp--preset--shadow--soft)' ) ).toBe( '' );
	} );

	test( 'media prints a preset on a masked shape as a filter on the surface', () => {
		const css = shadowEmit( SLOT, attrs, 'u', true );
		expect( css ).toContain( 'filter:drop-shadow(0px 1px 2px #0000001F)' );
		expect( css ).not.toContain( 'box-shadow' );
	} );

	test( "reads the theme presets from the editor's settings when none is registered", () => {
		serveEditorPresets( {
			default: [ { slug: 'soft', shadow: '0 9px 9px #000000' } ],
			theme: [ { slug: 'soft', shadow: '0 1px 2px #000000' } ],
		} );
		// The theme origin wins over the default, as `flattenSettingList` orders them.
		expect( dropShadow( 'var(--wp--preset--shadow--soft)' ) ).toBe(
			'drop-shadow(0px 1px 2px #000000)'
		);
		// Custom wins over both: a shadow edited in Global Styles.
		serveEditorPresets( {
			default: [ { slug: 'soft', shadow: '0 9px 9px #000000' } ],
			theme: [ { slug: 'soft', shadow: '0 1px 2px #000000' } ],
			custom: [ { slug: 'soft', shadow: '0 2px 3px #000000' } ],
		} );
		expect( dropShadow( 'var(--wp--preset--shadow--soft)' ) ).toBe(
			'drop-shadow(0px 2px 3px #000000)'
		);
	} );
} );
