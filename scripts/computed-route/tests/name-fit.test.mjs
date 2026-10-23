// Proves the name-fit vocabulary (lib/name-fit.mjs) that lib/triage.mjs::nameFits and G3 read: a setting name that spells a
// longer CSS property ending in the row's property (a border side, a column width, a background colour) never fits the
// row, the longer properties coming from the CSS property list and, when given, the framework DB's routed css_property
// values; a name that only shares the property's words still fits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compoundSpelled, nameState } from '../lib/name-fit.mjs';
import { nameFits, settingFits } from '../lib/triage.mjs';

test( 'MUST FAIL: a name spelling a longer property that ends in the row\'s never fits the row', () => {
	assert.equal( nameFits( 'color', 'backgroundColourHover' ), false );
	assert.equal( nameFits( 'color', 'shapeDividerTopColour' ), false );
	assert.equal( nameFits( 'width', 'minColumnWidth' ), false );
	assert.equal( nameFits( 'max-width', 'minColumnWidth' ), false );
	assert.equal( compoundSpelled( [ 'color' ], [ 'shape', 'divider', 'top', 'color' ] ), 'border-top-color' );
} );

test( 'MUST FAIL: the DB\'s routed css_property values extend the vocabulary', () => {
	assert.equal( nameFits( 'color', 'dividerColour' ), true, 'no CSS property ends in "divider color"' );
	assert.equal( nameFits( 'color', 'dividerColour', [ 'shape-divider-color' ] ), false );
	assert.equal( settingFits( 'dividerColour', { css_property: null }, 'color', [], [ 'shape-divider-color' ] ), false );
	assert.equal( settingFits( 'dividerColour', { css_property: null }, 'color' ), true );
	assert.equal( nameFits( 'color', 'shadowColourHover' ), false, 'the CSS property list holds -ms-scrollbar-shadow-color' );
} );

test( 'negative control: names that only share the property\'s words still fit, and a size keeps its min and max family', () => {
	assert.equal( nameFits( 'color', 'textColour' ), true );
	assert.equal( nameFits( 'color', 'fieldTextColour' ), true );
	assert.equal( nameFits( 'color', 'linkColour' ), true );
	assert.equal( nameFits( 'width', 'maxWidth' ), true );
	assert.equal( nameFits( 'max-width', 'contentWidth' ), true );
	assert.equal( nameFits( 'width', 'submenuMinWidth' ), true );
	assert.equal( nameFits( 'padding-top', 'fieldPadding' ), true );
	assert.equal( nameFits( 'transform', 'textTransform' ), false );
	assert.equal( nameFits( 'height', 'lineHeight' ), false );
} );

test( 'MUST FAIL: a name\'s state is the first of its words the given state list holds', () => {
	assert.equal( nameState( 'textColourHover', [ 'hover', 'scrolled' ] ), 'hover' );
	assert.equal( nameState( 'textColourScrolled', [ 'hover', 'scrolled' ] ), 'scrolled' );
	assert.equal( nameState( 'textColourHover', [ 'scrolled' ] ), null );
	assert.equal( nameState( 'textColour', [ 'hover' ] ), null );
} );
