/**
 * Preset thumbnails (Spec 38A §11, FR-38A-28): the demo's channel and direction come from the preset row's values, every
 * hover and entrance preset that moves or fades gets an animation (a fade-only preset included), a fade-out leaves, the
 * markup carries no inline style, and the stylesheet keeps a still thumbnail drawn without a full clip and stops the
 * demo under reduced motion.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { act } = React;
const { createRoot } = require( 'react-dom/client' );
const presetFile = require( '../../src/components/motion/generated-motion-presets.json' );
const {
	default: PresetThumbnail,
	thumbnailSpec,
	thumbnailClasses,
} = require( '../../src/blocks/extensions/motion/thumbnails/PresetThumbnail' );

global.IS_REACT_ACT_ENVIRONMENT = true;

const bySlug = ( slug ) => presetFile.presets.find( ( row ) => row.slug === slug );
const css = fs.readFileSync(
	path.join( __dirname, '../../assets/css/motion-thumbnails.css' ),
	'utf8'
);
const rows = presetFile.presets.filter(
	( row ) =>
		row.kind !== 'intensity' &&
		( row.panel === 'hover' || row.panel === 'entrance' )
);

describe( 'thumbnailSpec reads the channel and direction from the values', () => {
	test.each( [
		[ 'hover-lift', 'hover', 'shift-up', false ],
		[ 'hover-scale', 'hover', 'grow', false ],
		[ 'hover-rotate', 'hover', 'turn-cw', false ],
		[ 'hover-translate', 'hover', 'shift-right', false ],
		[ 'hover-indent', 'hover', 'shift-right', false ],
		[ 'hover-follow-pointer', 'hover', 'tilt', false ],
		[ 'entrance-fade-up', 'entrance', 'shift-down', true ],
		[ 'entrance-fade-down', 'entrance', 'shift-up', true ],
		[ 'entrance-fade-left', 'entrance', 'shift-right', true ],
		[ 'entrance-fade-right', 'entrance', 'shift-left', true ],
		[ 'entrance-fade-in', 'entrance', 'still', true ],
		[ 'entrance-slide-down', 'entrance', 'shift-up', false ],
		[ 'entrance-scale-in', 'entrance', 'shrink', true ],
		[ 'entrance-scale-out', 'entrance', 'grow', true ],
		[ 'entrance-rotate-in', 'entrance', 'turn-ccw', true ],
		[ 'entrance-blur-in', 'entrance', 'blur', true ],
		[ 'entrance-reveal-up', 'entrance', 'wipe', false ],
		[ 'keyframe-zoom-in', 'entrance', 'shrink', true ],
		[ 'keyframe-bounce', 'entrance', 'shift-up', false ],
	] )( '%s', ( slug, kind, movement, fades ) => {
		expect( bySlug( slug ) ).toBeTruthy();
		expect( thumbnailSpec( bySlug( slug ) ) ).toMatchObject( {
			kind,
			movement,
			fades,
		} );
	} );

	test( 'a row with no values draws a still demo', () => {
		expect( thumbnailSpec( bySlug( 'hover-none' ) ).movement ).toBe( 'still' );
		expect( thumbnailSpec( null ).movement ).toBe( 'still' );
	} );

	test( 'the sign of a value decides the direction, not the preset name', () => {
		const up = thumbnailSpec( { panel: 'hover', values: { translateY: -4 } } );
		const down = thumbnailSpec( { panel: 'hover', values: { translateY: 4 } } );
		const token = thumbnailSpec( { panel: 'hover', values: { translateX: '-token:distance.sm' } } );
		expect( [ up.movement, down.movement, token.movement ] ).toEqual( [
			'shift-up',
			'shift-down',
			'shift-left',
		] );
	} );

	test( 'every hover and entrance preset row maps to a movement the stylesheet defines', () => {
		expect( rows.length ).toBeGreaterThan( 20 );
		rows.forEach( ( row ) => {
			const { movement } = thumbnailSpec( row );
			if ( movement !== 'still' ) {
				expect( css ).toContain( `.sgs-motion-thumb--${ movement } {` );
			}
		} );
	} );
} );

/** The selectors of the stylesheet's rules inside the no-preference block that declare `property`. */
const animationSelectors = ( property = 'animation' ) => {
	const block = css.match( /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/ )[ 0 ];
	return [ ...block.matchAll( new RegExp( `([^{}]+)\\{\\s*${ property }:`, 'g' ) ) ].map(
		( match ) => match[ 1 ].trim()
	);
};

/** The thumbnail's box inside a radio, as the grid draws it. */
const boxIn = ( row, checked = true ) => {
	const item = document.createElement( 'div' );
	item.className = 'sgs-motion-thumbs__item';
	item.setAttribute( 'aria-checked', String( checked ) );
	item.innerHTML = `<span class="${ thumbnailClasses( row ) }"><span class="sgs-motion-thumb__box"></span></span>`;
	return item.querySelector( '.sgs-motion-thumb__box' );
};

describe( 'which thumbnails animate', () => {
	test( 'every row with a fade or a movement matches an animation rule, and no other row does', () => {
		const selectors = animationSelectors();
		expect( selectors.length ).toBeGreaterThanOrEqual( 2 );
		rows.forEach( ( row ) => {
			const spec = thumbnailSpec( row );
			const animates = selectors.some( ( selector ) => boxIn( row ).matches( selector ) );
			expect( [ row.slug, animates ] ).toEqual( [
				row.slug,
				spec.movement !== 'still' || spec.fades,
			] );
		} );
	} );

	test( 'a fade-only entrance animates and a fade-out leaves', () => {
		const leave = animationSelectors( 'animation-name' );
		expect( thumbnailSpec( bySlug( 'entrance-fade-in' ) ) ).toMatchObject( { movement: 'still', fades: true, fadesOut: false } );
		expect( thumbnailSpec( bySlug( 'keyframe-fade-in' ) ).fadesOut ).toBe( false );
		expect( thumbnailSpec( bySlug( 'keyframe-fade-out' ) ) ).toMatchObject( { movement: 'still', fades: true, fadesOut: true } );
		expect( leave.some( ( s ) => boxIn( bySlug( 'keyframe-fade-out' ) ).matches( s ) ) ).toBe( true );
		expect( leave.some( ( s ) => boxIn( bySlug( 'keyframe-fade-in' ) ).matches( s ) ) ).toBe( false );
	} );

	test( 'an unchosen, unhovered, unfocused thumbnail matches no animation rule', () => {
		const box = boxIn( bySlug( 'hover-lift' ), false );
		expect( animationSelectors().some( ( s ) => box.matches( s ) ) ).toBe( false );
		expect( animationSelectors().some( ( s ) => boxIn( bySlug( 'hover-lift' ) ).matches( s ) ) ).toBe( true );
	} );
} );

describe( 'the drawing of a still thumbnail, and under reduced motion', () => {
	/** The percentage a `clip-path: inset(...)` declaration clips from the top, with the wipe's custom property resolved. */
	const topClip = ( declaration ) => {
		const wipe = Number( css.match( /--wipe \{ --sgs-thumb-c: (\d+)%/ )[ 1 ] );
		const calc = declaration.match( /inset\(calc\(var\(--sgs-thumb-c\) \* ([\d.]+)\)/ );
		return calc ? wipe * Number( calc[ 1 ] ) : null;
	};

	test( 'Reveal up is drawn at a partial clip, never fully clipped', () => {
		expect( thumbnailSpec( bySlug( 'entrance-reveal-up' ) ).movement ).toBe( 'wipe' );
		const outside = css.replace( /@keyframes[^{]+\{[\s\S]*?\n\}/g, '' );
		const declarations = outside.match( /clip-path:[^;]+;/g );
		expect( declarations.length ).toBeGreaterThan( 0 );
		declarations.forEach( ( declaration ) => {
			const clipped = topClip( declaration );
			expect( clipped ).not.toBeNull();
			expect( clipped ).toBeGreaterThan( 0 );
			expect( clipped ).toBeLessThan( 100 );
		} );
	} );

	test( 'negative control: a full clip is caught', () => {
		expect( topClip( 'clip-path: inset(calc(var(--sgs-thumb-c) * 1) 0 0 0);' ) ).toBe( 100 );
	} );

	test( 'animates only under no-preference and stops the demo under reduce', () => {
		const noPreference = css.match( /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/ );
		const reduce = css.match( /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/ );
		expect( noPreference[ 0 ] ).toContain( 'animation: sgs-thumb-hover' );
		expect( noPreference[ 0 ] ).toContain( 'animation: sgs-thumb-entrance' );
		expect( reduce[ 0 ] ).toContain( 'animation: none' );
		const outside = css.replace( noPreference[ 0 ], '' ).replace( reduce[ 0 ], '' );
		expect( outside.replace( /@keyframes[\s\S]*?\n\}/g, '' ) ).not.toMatch( /animation(-name)?\s*:\s*sgs-/ );
	} );
} );

describe( 'PresetThumbnail markup', () => {
	let host;
	let root;
	beforeEach( () => {
		host = document.createElement( 'div' );
		root = createRoot( host );
	} );
	afterEach( () => act( () => root.unmount() ) );

	test( 'renders classes only: decorative, no inline style, valid SGS-BEM', () => {
		act( () => root.render( <PresetThumbnail slug="entrance-fade-up" /> ) );
		const thumb = host.firstElementChild;
		expect( thumb.getAttribute( 'aria-hidden' ) ).toBe( 'true' );
		expect( thumb.hasAttribute( 'style' ) ).toBe( false );
		expect( thumb.querySelector( '[style]' ) ).toBeNull();
		expect( thumb.className ).toBe(
			'sgs-motion-thumb sgs-motion-thumb--entrance sgs-motion-thumb--shift-down sgs-motion-thumb--fade'
		);
		expect( thumbnailClasses( bySlug( 'hover-none' ) ) ).toContain( 'sgs-motion-thumb--still' );
		const bem = /^sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$/;
		rows.forEach( ( row ) =>
			thumbnailClasses( row )
				.split( ' ' )
				.forEach( ( token ) => expect( token ).toMatch( bem ) )
		);
	} );

	test( 'a class list is built from the row alone', () => {
		expect( thumbnailClasses( bySlug( 'hover-scale' ) ) ).toBe(
			'sgs-motion-thumb sgs-motion-thumb--hover sgs-motion-thumb--grow'
		);
	} );
} );
