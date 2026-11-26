/**
 * scripts/hover-guard/transform.js::transformCss and ::auditCss against the shared contract fixture
 * (tests/fixtures/touch-hover/cases.json, also run by tests/php/TouchHoverContractTest.php): every hover look gets a
 * guarded mouse half and a `.sgs-pressed` touch half, every press look a pressed twin (Spec 38A FR-38A-17).
 */
const { cases, unreadable } = require( '../fixtures/touch-hover/cases.json' );
const { transformCss, auditCss, mouseRemainder } = require( '../../scripts/hover-guard/transform.js' );

const flat = ( css ) => css.replace( /\s*\n\s*/g, '' ).replace( /,\s+/g, ',' ).trim();

describe( 'hover-guard transform', () => {
	test.each( cases.map( ( c ) => [ c.name, c ] ) )( '%s', ( name, c ) => {
		const once = transformCss( c.in, 'case.css' );
		expect( flat( once.css ) ).toBe( c.out );
		expect( once.findings ).toEqual( [] );
		expect( transformCss( once.css, 'case.css' ).css ).toBe( once.css );
		expect( auditCss( once.css, 'case.css' ).findings ).toEqual( [] );
	} );

	test( 'the audit refuses a bare hover rule, a guarded rule without its pressed half and a press look without its twin', () => {
		const kinds = ( css ) => auditCss( css, 'x.css' ).findings.map( ( f ) => f.kind );
		expect( kinds( '.a:hover{color:red}' ) ).toEqual( [ 'unguarded-hover' ] );
		expect( kinds( ':where(:root:not(.sgs-touch-input)) .a:hover{color:red}' ) ).toEqual( [ 'missing-touch-half' ] );
		expect( kinds( '@media (hover:hover){.a:hover{color:red}}' ) ).toEqual( [ 'missing-touch-half' ] );
		expect( kinds( '.a:active{transform:scale(.9)}' ) ).toEqual( [ 'missing-press-half' ] );
	} );

	test( 'the audit refuses a pressed half that carries other declarations or sits under other at-rules', () => {
		const kinds = ( css ) => auditCss( css, 'x.css' ).findings.map( ( f ) => f.kind );
		expect( kinds( '.a.sgs-pressed{color:blue}@media (hover:hover){.a:hover{color:red}}' ) ).toEqual( [ 'missing-touch-half' ] );
		expect( kinds( '.a.sgs-pressed{color:red}@media (hover:hover) and (min-width:1024px){.a:hover{color:red}}' ) ).toEqual( [ 'missing-touch-half' ] );
		expect( kinds( '.a.sgs-pressed{color:red}@media (hover:hover){.a:hover{color:red}}' ) ).toEqual( [] );
		expect( kinds( '@media (hover:hover){.a:active{x:y}}' ) ).toEqual( [] );
	} );

	test.each( unreadable.map( ( c ) => [ c.name, c ] ) )( 'input the contract cannot rewrite is a finding, never skipped: %s', ( name, c ) => {
		expect( transformCss( c.in, 'case.css' ).findings.map( ( f ) => f.kind ) ).toContain( c.kind );
		expect( auditCss( c.in, 'case.css' ).findings.map( ( f ) => f.kind ) ).toContain( c.kind );
	} );

	test( 'a media query is mouse-only only when (hover: hover) is one of its and-conditions', () => {
		expect( mouseRemainder( '(hover: hover)' ) ).toBe( '' );
		expect( mouseRemainder( 'all and (hover:hover)' ) ).toBe( '' );
		expect( mouseRemainder( '(hover:hover) and (min-width: 1024px)' ) ).toBe( '(min-width: 1024px)' );
		expect( mouseRemainder( 'screen and (hover:hover) and (min-width:1px)' ) ).toBe( 'screen and (min-width:1px)' );
		expect( mouseRemainder( 'not all and (hover:hover)' ) ).toBeNull();
		expect( mouseRemainder( '(hover:hover),(min-width:1px)' ) ).toBeNull();
		expect( mouseRemainder( '(hover:hover) or (min-width:1px)' ) ).toBeNull();
		expect( mouseRemainder( '(hover:none)' ) ).toBeNull();
	} );
} );
