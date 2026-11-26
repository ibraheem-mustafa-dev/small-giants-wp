/**
 * A filled badge's fill colour reaches a custom SVG's own shapes that say `fill="currentColor"` (the clone writes its
 * icons that way), not only the `<svg>` root: a shape's fill attribute beats the value it would inherit from the root,
 * so a root-only rule left those shapes in the icon colour. Only a custom SVG's wrapper (`--custom`) takes the shape rule:
 * a library icon's currentColor shapes are its second colour. A shape with `fill="none"` or a literal colour keeps it,
 * and an outline badge is untouched. jsdom has no SVG paint cascade, so this reads the shipped stylesheet; the computed
 * fills were measured in Chromium when the rule was written (before: the icon colour; after: the fill colour).
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const css = fs
	.readFileSync(
		path.join( __dirname, '../..', 'src/blocks/trust-bar/style.css' ),
		'utf8'
	)
	.replace( /\/\*[\s\S]*?\*\//g, '' );

/** Every rule as { selectors: string[], body: string }. */
const rules = [ ...css.matchAll( /([^{}]+)\{([^{}]*)\}/g ) ].map( ( m ) => ( {
	selectors: m[ 1 ]
		.split( ',' )
		.map( ( s ) => s.trim().replace( /\s+/g, ' ' ) ),
	body: m[ 2 ].replace( /\s+/g, ' ' ),
} ) );
const fillOf = ( selector ) =>
	rules
		.filter( ( r ) => r.selectors.includes( selector ) )
		.map( ( r ) =>
			/(?:^|;)\s*fill:\s*([^;]+)/.exec( r.body )?.[ 1 ].trim()
		)
		.filter( Boolean )
		.pop();

describe( 'trust bar filled icon fill', () => {
	test.each( [
		'sgs-trust-bar__circle--filled',
		'sgs-trust-bar__icon--filled',
	] )(
		'%s paints a currentColor shape with the fill colour, as it paints the root',
		( cls ) => {
			const root = fillOf( `.${ cls } svg` );
			expect( root ).toBe(
				'var(--sgs-trust-badge-icon-fill, currentColor)'
			);
			const base = cls.replace( '--filled', '' );
			expect(
				fillOf(
					`.${ cls }.${ base }--custom svg [fill="currentColor" i]`
				)
			).toBe( root );
		}
	);

	test( 'no rule repaints a shape that says fill="none" or names its own colour', () => {
		const overreach = rules.filter(
			( r ) =>
				/(?:^|;)\s*fill:/.test( r.body ) &&
				r.selectors.some( ( s ) =>
					/__(?:circle|icon)(?:--filled)? svg (?:\*|path|\[fill\](?!=))/.test(
						s
					)
				)
		);
		expect( overreach ).toEqual( [] );
	} );

	test( 'a library icon keeps its second colour: no shape rule reaches a filled badge that is not custom', () => {
		// Lucide tag, key-round, palette ... draw a contrasting dot with fill="currentColor".
		for ( const cls of [
			'sgs-trust-bar__circle--filled',
			'sgs-trust-bar__icon--filled',
		] ) {
			expect(
				fillOf( `.${ cls } svg [fill="currentColor" i]` )
			).toBeUndefined();
		}
		const custom = fs.readFileSync(
			path.join( __dirname, '../..', 'src/blocks/trust-bar/render.php' ),
			'utf8'
		);
		expect( custom ).toMatch( /\$tb_custom_svg = true;/ );
		expect( custom ).toMatch(
			/\$tb_custom_svg \? ' ' \. \$icon_base_class \. '--custom'/
		);
	} );

	test( 'an outline badge gains no shape fill rule', () => {
		expect(
			fillOf( '.sgs-trust-bar__circle svg [fill="currentColor" i]' )
		).toBeUndefined();
	} );
} );
