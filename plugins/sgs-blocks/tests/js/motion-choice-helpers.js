/**
 * Test helpers for a motion choice field (ChoiceAtom). A choice shows as a segmented radio group when it has up to three
 * short options and as a select otherwise, so a test that asserts which options are offered, or picks one, goes through
 * these helpers instead of reading either widget directly. Both stand-in component sets render a segmented group as
 * `[role="radiogroup"][aria-label]` with `[role="radio"]` buttons and a select as `select[aria-label]` with `option`s.
 */
const React = require( 'react' );

const { act } = React;

const GROUP = '[role="radiogroup"]';

/** The control (radio group or select) a field label names, or null. */
function choiceControl( container, label ) {
	return (
		[ ...container.querySelectorAll( `${ GROUP }, select` ) ].find(
			( node ) => node.getAttribute( 'aria-label' ) === label
		) || null
	);
}

/** The option nodes of one control; a select's blank (unset) entry is not an option. */
function optionNodes( control ) {
	if ( ! control ) {
		return [];
	}
	return control.tagName === 'SELECT'
		? [ ...control.querySelectorAll( 'option' ) ].filter( ( option ) => option.value !== '' )
		: [ ...control.querySelectorAll( '[role="radio"]' ) ];
}

const nodeLabel = ( node ) => node.textContent.replace( /\s*•$/, '' ).trim();
const nodeValue = ( node ) =>
	node.tagName === 'OPTION' ? node.value : node.dataset.option ?? null;

/** The options a choice offers, in order, as `{ value, label }` whichever widget it rendered as (`value` is null where a stand-in radio carries none). */
function choiceOptions( container, label ) {
	return optionNodes( choiceControl( container, label ) ).map( ( node ) => ( {
		value: nodeValue( node ),
		label: nodeLabel( node ),
	} ) );
}

/** The option labels a choice offers, in order. */
const choiceLabels = ( container, label ) =>
	choiceOptions( container, label ).map( ( option ) => option.label );

/** The chosen value of a choice: the select's value, or the checked radio's value (its label where it carries none). */
function choiceValue( container, label ) {
	const control = choiceControl( container, label );
	if ( ! control ) {
		return undefined;
	}
	if ( control.tagName === 'SELECT' ) {
		return control.value;
	}
	const checked = optionNodes( control ).find( ( node ) => node.getAttribute( 'aria-checked' ) === 'true' );
	if ( checked ) {
		return nodeValue( checked ) ?? nodeLabel( checked );
	}
	return control.dataset.value;
}

/** Whether any choice on the page offers an option with this label. */
const hasChoiceOption = ( container, text ) => Boolean( optionNode( container, text ) );

/** The first option node, in any choice, whose label is `text`; undefined when no choice offers it. */
function optionNode( container, text ) {
	return [ ...container.querySelectorAll( `${ GROUP }, select` ) ]
		.flatMap( optionNodes )
		.find( ( node ) => nodeLabel( node ) === text );
}

/** Chooses an option node: a radio is clicked, a select option is selected and a change fired. */
function activateOption( node ) {
	act( () => {
		if ( node.tagName === 'OPTION' ) {
			const select = node.closest( 'select' );
			select.value = node.value;
			select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} else {
			node.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
		}
	} );
}

/** Picks an option of the named choice by its value or its label, whichever widget it rendered as. */
function pickChoice( container, label, valueOrLabel ) {
	const node = optionNodes( choiceControl( container, label ) ).find(
		( candidate ) => nodeValue( candidate ) === valueOrLabel || nodeLabel( candidate ) === valueOrLabel
	);
	if ( ! node ) {
		throw new Error( `Choice "${ label }" offers no option "${ valueOrLabel }".` );
	}
	activateOption( node );
}

module.exports = {
	choiceControl,
	choiceOptions,
	choiceLabels,
	choiceValue,
	hasChoiceOption,
	optionNode,
	activateOption,
	pickChoice,
};
