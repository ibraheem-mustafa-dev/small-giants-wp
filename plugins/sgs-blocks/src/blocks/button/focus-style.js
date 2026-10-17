/**
 * sgs/button keyboard focus style (`focusStyle`), the editor twin of includes/helpers-button-focus.php.
 *
 * `''` keeps the site's focus look, `'duotone'` adds `sgs-focus--duotone`, `'signature'` adds `sgs-focus--signature`
 * (a turning border on the button's `::before`, theme/sgs-theme/assets/css/focus.css). Signature is refused when a
 * gradient border or a motion layer on the button root whose effect claims the `::before` paint slot (the motion
 * schema's `x-sgs-effects.<effect>.slots`, FR-38A-49) already owns that pseudo-element; the inspector then disables
 * the option and says why, and the canvas gets no class, exactly as render.php prints none.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { getBlockType } from '@wordpress/blocks';
import {
	elementLayers,
	slotClaims,
} from '../extensions/motion/layers/refusal-match';
import { isCssGradient } from '../../utils/background-preview';

export const FOCUS_STYLE_CLASSES = Object.freeze( {
	duotone: 'sgs-focus--duotone',
	signature: 'sgs-focus--signature',
} );

// The presets whose stylesheet rule gives the button a border (style.css `.sgs-button--<preset>`).
const BORDERED_PRESETS = Object.freeze( [ 'primary', 'secondary', 'outline' ] );

// Set on the sgs/multi-button canvas wrapper (multi-button/edit.js) from the group's default border.
export const GROUP_HOST_BORDER_PROPERTY =
	'--sgs-mb-btn-focus-host-border-default';

const ZERO_LENGTH = /^0+(?:\.0+)?(?:[a-z%]+)?$/i;

/**
 * The stored focus style, validated.
 *
 * @param {*} focusStyle Stored value.
 * @return {''|'duotone'|'signature'} The style.
 */
export function focusStyleValue( focusStyle ) {
	return Object.hasOwn( FOCUS_STYLE_CLASSES, focusStyle ) ? focusStyle : '';
}

/**
 * The label of the motion effect on the button root that claims `::before`, or `''`. The root is the motion
 * document's `root` element and any declared part marked `isWrapper`.
 *
 * @param {Object|undefined} sgsMotion The block's motion document.
 * @param {string}           [name]    Block name.
 * @return {string} The effect's slot label.
 */
export function beforeSlotOwner( sgsMotion, name = 'sgs/button' ) {
	const elements = sgsMotion?.elements;
	if ( ! elements || 'object' !== typeof elements ) {
		return '';
	}
	const parts = getBlockType( name )?.supports?.sgs?.elements || {};
	const roots = [
		'root',
		...Object.keys( parts ).filter( ( key ) => parts[ key ]?.isWrapper ),
	];
	for ( const key of roots ) {
		const element = elements[ key ];
		if ( ! element || 'object' !== typeof element ) {
			continue;
		}
		for ( const entry of elementLayers( element ) ) {
			const slot = slotClaims( entry ).find(
				( claim ) => '::before' === claim.slot
			);
			if ( slot ) {
				return slot.label || entry.effect;
			}
		}
	}
	return '';
}

/**
 * Why Signature is refused on this button, in words for the inspector, or `''` when it is offered.
 *
 * @param {Object} attrs                        The attributes the refusal reads.
 * @param {string} [attrs.borderColourGradient] The border gradient.
 * @param {Object} [attrs.sgsMotion]            The motion document.
 * @return {string} The reason.
 */
export function signatureRefusal( { borderColourGradient, sgsMotion } ) {
	if ( isCssGradient( borderColourGradient, { whole: true } ) ) {
		return __(
			'Signature is off while the border has a gradient: both draw around the button.',
			'sgs-blocks'
		);
	}
	const owner = beforeSlotOwner( sgsMotion );
	if ( owner ) {
		return sprintf(
			/* translators: %s: a motion effect's name, e.g. "Cursor field". */
			__(
				'Signature is off while the %s motion effect is on: both draw on the same layer.',
				'sgs-blocks'
			),
			owner
		);
	}
	return '';
}

/**
 * The focus-system class the canvas button carries, or `''`: the class render.php prints.
 *
 * @param {Object} attrs                        The attributes the class reads.
 * @param {string} [attrs.focusStyle]           The stored focus style.
 * @param {string} [attrs.borderColourGradient] The border gradient.
 * @param {Object} [attrs.sgsMotion]            The motion document.
 * @return {string} The class.
 */
export function focusStyleClass( {
	focusStyle,
	borderColourGradient,
	sgsMotion,
} ) {
	const style = focusStyleValue( focusStyle );
	if ( ! style ) {
		return '';
	}
	if (
		'signature' === style &&
		signatureRefusal( { borderColourGradient, sgsMotion } )
	) {
		return '';
	}
	return FOCUS_STYLE_CLASSES[ style ];
}

/**
 * The `--sgs-focus-host-border` value of a signature button (the twin of `sgs_button_focus_host_border()`): its own
 * border width (the widest side when the sides differ), else its preset's border width token; `''` without a border.
 *
 * @param {Object} attrs                The attributes the width reads.
 * @param {Object} [attrs.borderWidth]  `{ top, right, bottom, left }`.
 * @param {string} [attrs.borderStyle]  The stored border style.
 * @param {string} [attrs.inheritStyle] The style preset.
 * @return {string} The width.
 */
export function focusHostBorder( { borderWidth, borderStyle, inheritStyle } ) {
	const keyword =
		'string' === typeof borderStyle ? borderStyle.trim().toLowerCase() : '';
	if ( 'none' === keyword || 'hidden' === keyword ) {
		return '';
	}
	const box =
		borderWidth && 'object' === typeof borderWidth ? borderWidth : {};
	const widths = [ 'top', 'right', 'bottom', 'left' ].map( ( side ) =>
		'string' === typeof box[ side ] || 'number' === typeof box[ side ]
			? String( box[ side ] ).trim()
			: ''
	);
	if ( widths.some( Boolean ) ) {
		const sides = widths.map( ( width ) =>
			! width || ZERO_LENGTH.test( width ) ? '0px' : width
		);
		const distinct = [ ...new Set( sides ) ];
		if ( 1 === distinct.length && '0px' === distinct[ 0 ] ) {
			return '';
		}
		return 1 === distinct.length
			? distinct[ 0 ]
			: `max(${ sides.join( ',' ) })`;
	}
	if ( BORDERED_PRESETS.includes( inheritStyle ) ) {
		return `var(--wp--custom--button-presets--${ inheritStyle }--border-width,2px)`;
	}
	// A preset-less button with no border of its own paints its sgs/multi-button group's default border, which the
	// group publishes as a single length in this property (outside a group the property is unset and focus.css
	// falls back to 0px). The canvas cannot read the group's block context from edit.js, so it reads the property.
	return 'custom' === inheritStyle ? `var(${ GROUP_HOST_BORDER_PROPERTY })` : '';
}

/**
 * The group default border width as one length (the twin of `sgs_button_focus_group_host_border()`): the widest
 * side when the sides differ; `''` without a border or when the group style is none/hidden.
 *
 * @param {Object} attrs                       The multi-button attributes the width reads.
 * @param {Object} [attrs.childBtnBorderWidth] `{ top, right, bottom, left }`.
 * @param {string} [attrs.childBtnBorderStyle] The stored group border style.
 * @return {string} The width.
 */
export function groupFocusHostBorder( {
	childBtnBorderWidth,
	childBtnBorderStyle,
} ) {
	return focusHostBorder( {
		borderWidth: childBtnBorderWidth,
		borderStyle: childBtnBorderStyle,
		inheritStyle: '',
	} );
}
