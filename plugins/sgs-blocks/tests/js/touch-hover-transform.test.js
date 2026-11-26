/**
 * scripts/hover-guard/transform.js::transformCss and ::auditCss against the shared contract fixture
 * (tests/fixtures/touch-hover/cases.json, also run by tests/php/TouchHoverContractTest.php): every hover look gets a
 * guarded mouse half and a `.sgs-pressed` touch half, every press look a pressed twin (Spec 38A FR-38A-17).
 */
const { cases } = require( '../fixtures/touch-hover/cases.json' );
const { transformCss, auditCss } = require( '../../scripts/hover-guard/transform.js' );

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
} );
