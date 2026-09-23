/**
 * Google Reviews — the section shell and the schema helpers behind every styling section.
 *
 * Nothing here is a new control. This file derives "has this been changed?" and "reset" from
 * block.json, so a reset always writes the schema's own default and can never drift from it, and
 * provides the collapsed PanelBody + ToolsPanel shell (`Section`) and its rows (`Row`). The field
 * controls themselves (lengths, boxes, borders, typography) are in panel-fields.js.
 *
 * ToolsPanel / ToolsPanelItem come from the primitives boundary ONLY: the bare names are
 * `undefined` on WP 7.1 and importing them from '@wordpress/components' crashed the editor
 * (React error #130, D1141).
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import { typographyAttrKeys } from '../../../components';
import metadata from '../block.json';

const SCHEMA = metadata.attributes;

/** True when block.json declares the attribute. */
export function isDeclared( attr ) {
	return attr in SCHEMA;
}

/** The default block.json declares for an attribute (undefined when it declares none). */
export function defaultOf( attr ) {
	return SCHEMA[ attr ]?.default;
}

/** True for undefined / null / '' / {} / an object or array whose every leaf is empty. */
function isEmpty( value ) {
	if ( undefined === value || null === value || '' === value ) {
		return true;
	}
	if ( 'object' === typeof value ) {
		return Object.values( value ).every( isEmpty );
	}
	return false;
}

function sameValue( a, b ) {
	if ( a === b ) {
		return true;
	}
	if ( a && b && 'object' === typeof a && 'object' === typeof b ) {
		const keys = new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] );
		return [ ...keys ].every( ( key ) => sameValue( a[ key ], b[ key ] ) );
	}
	return false;
}

/** True when the stored value differs from the schema default (an empty tier object counts as unset). */
export function isSet( attributes, attr ) {
	const value = attributes[ attr ];
	const def = defaultOf( attr );
	if ( isEmpty( value ) && isEmpty( def ) ) {
		return false;
	}
	return ! sameValue( value, def );
}

/**
 * The value to store when the border-style control is cleared. The control reports '' for "no
 * style", but the preview request validates every attribute against block.json, and an enum that
 * does not list '' rejects it (REST 400, the canvas goes blank). Use the enum's own "none".
 *
 * @param {string} attr  A border-style attribute.
 * @param {string} value What the control reported.
 * @return {string} A value the attribute's enum accepts.
 */
export function borderStyleValue( attr, value ) {
	if ( value ) {
		return value;
	}
	const allowed = SCHEMA[ attr ]?.enum;
	return Array.isArray( allowed ) && ! allowed.includes( '' ) && allowed.includes( 'none' ) ? 'none' : '';
}

/** A setAttributes patch that puts every named attribute back to its block.json default. */
export function resetPatch( attrs ) {
	return Object.fromEntries( attrs.map( ( attr ) => [ attr, defaultOf( attr ) ] ) );
}

/** Every attribute TypographyControls reads or writes for the given prefixes, that block.json declares. */
export function typographyAttrs( prefixes ) {
	return prefixes.flatMap( ( prefix ) =>
		Object.values( typographyAttrKeys( prefix ) ).filter( isDeclared )
	);
}

/**
 * One collapsed section: a PanelBody holding a ToolsPanel, in the Styles tab.
 *
 * @param {Object}   props
 * @param {string}   props.title         Section title.
 * @param {string[]} props.attrs         Every attribute the section owns (drives "Reset all").
 * @param {Function} props.setAttributes Block setter.
 */
export function Section( { title, attrs, setAttributes, children } ) {
	return (
		<InspectorControls group="styles">
			<PanelBody title={ title } initialOpen={ false }>
				<ToolsPanel
					/* translators: %s: section name, e.g. "Card". The PanelBody above already carries the bare name. */
					label={ sprintf( __( '%s settings', 'sgs-blocks' ), title ) }
					resetAll={ () => setAttributes( resetPatch( attrs ) ) }
				>
					{ children }
				</ToolsPanel>
			</PanelBody>
		</InspectorControls>
	);
}

/**
 * One ToolsPanel row. It shows a reset dot once any of its attributes leaves its default, and
 * the reset writes those defaults back. `isShownByDefault`: a control a client cannot see is a
 * control they do not know exists, so no row hides behind the "+" menu.
 */
export function Row( { label, attrs, attributes, setAttributes, children } ) {
	return (
		<ToolsPanelItem
			label={ label }
			hasValue={ () => attrs.some( ( attr ) => isSet( attributes, attr ) ) }
			onDeselect={ () => setAttributes( resetPatch( attrs ) ) }
			isShownByDefault
		>
			{ children }
		</ToolsPanelItem>
	);
}
