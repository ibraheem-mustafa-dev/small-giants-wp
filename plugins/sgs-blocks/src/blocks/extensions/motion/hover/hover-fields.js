/**
 * The Hover panel's Fine-tune fields (Spec 38A §5.1): which hover-state fields exist, how they are labelled and grouped,
 * and how each one is drawn. The fields themselves come from the schema extract (`HoverStateValues`, read through
 * `components/motion/motion-defs.js`): a group lists only the keys the schema declares, so a field the schema does not
 * (yet) hold, such as the ring, is never drawn. The label table covers every field the schema holds today;
 * `tests/js/motion-hover-panel.test.js` fails when the schema gains a field that has no label.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import defs from '../../../../components/motion/motion-defs';

const SCHEMA = defs.$defs;

/** Field key to its label, and the extra atom hints a field needs (`lift`: offer negated distance tokens). */
export const FIELD_LABELS = Object.freeze( {
	translateX: { label: __( 'Move across (X)', 'sgs-blocks' ), lift: true },
	translateY: {
		label: __( 'Move up or down (Y)', 'sgs-blocks' ),
		lift: true,
	},
	scale: { label: __( 'Scale', 'sgs-blocks' ) },
	restRotate: { label: __( 'Rest rotate (Z)', 'sgs-blocks' ) },
	rotate: { label: __( 'Hover rotate (Z)', 'sgs-blocks' ) },
	restRotateX: { label: __( 'Rest rotate X', 'sgs-blocks' ) },
	rotateX: { label: __( 'Hover rotate X', 'sgs-blocks' ) },
	restRotateY: { label: __( 'Rest rotate Y', 'sgs-blocks' ) },
	rotateY: { label: __( 'Hover rotate Y', 'sgs-blocks' ) },
	perspective: { label: __( 'Perspective', 'sgs-blocks' ) },
	perspectiveOn: {
		label: __( 'Perspective applies to', 'sgs-blocks' ),
		options: [
			{ value: 'self', label: __( 'This element', 'sgs-blocks' ) },
			{ value: 'parent', label: __( 'Its parent', 'sgs-blocks' ) },
		],
	},
	followPointer: { label: __( 'Follow pointer', 'sgs-blocks' ) },
	maxAngle: { label: __( 'Maximum angle', 'sgs-blocks' ) },
	axisLock: {
		label: __( 'Axis lock', 'sgs-blocks' ),
		options: [
			{ value: 'none', label: __( 'None', 'sgs-blocks' ) },
			{ value: 'x', label: __( 'X only', 'sgs-blocks' ) },
			{ value: 'y', label: __( 'Y only', 'sgs-blocks' ) },
		],
	},
	resetDuration: { label: __( 'Reset duration', 'sgs-blocks' ) },
	resetEasing: { label: __( 'Reset easing', 'sgs-blocks' ) },
	opacity: { label: __( 'Opacity on hover', 'sgs-blocks' ) },
	blur: { label: __( 'Blur on hover', 'sgs-blocks' ) },
	restGrayscale: { label: __( 'Grayscale at rest', 'sgs-blocks' ) },
	grayscale: { label: __( 'Grayscale on hover', 'sgs-blocks' ) },
	brightness: { label: __( 'Brightness on hover', 'sgs-blocks' ) },
	ringSpread: { label: __( 'Ring thickness', 'sgs-blocks' ) },
	ringColour: { label: __( 'Ring colour', 'sgs-blocks' ) },
	accentWidth: { label: __( 'Accent line thickness', 'sgs-blocks' ) },
	accentColour: { label: __( 'Accent line colour', 'sgs-blocks' ) },
	indent: { label: __( 'Indent on hover', 'sgs-blocks' ) },
	duration: { label: __( 'Duration', 'sgs-blocks' ) },
	delay: { label: __( 'Delay', 'sgs-blocks' ) },
	easing: { label: __( 'Easing', 'sgs-blocks' ) },
	borderColour: { label: __( 'Border colour', 'sgs-blocks' ) },
	backgroundColour: { label: __( 'Background colour', 'sgs-blocks' ) },
} );

/**
 * Fields the schema holds that the panel does not offer. `perspectiveOn` is hidden, so perspective always applies to
 * the element itself, until FR-38A-41's real-Safari check shows that putting it on the parent works.
 */
export const HIDDEN_KEYS = Object.freeze( [ 'perspectiveOn' ] );

/** The Hover panel's message in place of the ring and accent line fields on an element whose block sets a shadow (FR-38A-42). */
export const RING_REFUSAL_MESSAGE = __(
	'This element has a shadow of its own (or its style can add one), and a hover ring or accent line would replace it, so neither is offered here. Clear the shadow to use them, or put them on a different part.',
	'sgs-blocks'
);

/** The ring and accent line fields (both a `box-shadow`), which the Hover panel leaves out on a shadowed element. */
export const RING_KEYS = Object.freeze( [
	'ringSpread',
	'ringColour',
	'accentWidth',
	'accentColour',
] );

/** The groups of the hover state's Fine-tune, in order. */
export const HOVER_GROUPS = Object.freeze( [
	{
		id: 'move',
		label: __( 'Movement', 'sgs-blocks' ),
		keys: [ 'translateX', 'translateY', 'scale' ],
	},
	{
		id: 'rotate',
		label: __( 'Rotate', 'sgs-blocks' ),
		keys: [
			'restRotate',
			'rotate',
			'restRotateX',
			'restRotateY',
			'perspective',
		],
		// The one modular Rotate (§5.1, FR-38A-41): a driver switch picks the hover X and Y angles or Follow pointer.
		driver: {
			key: 'followPointer',
			angleKeys: [ 'rotateX', 'rotateY' ],
			pointerKeys: [
				'maxAngle',
				'axisLock',
				'resetDuration',
				'resetEasing',
			],
		},
	},
	{
		id: 'look',
		label: __( 'Opacity and filter', 'sgs-blocks' ),
		keys: [ 'opacity', 'blur', 'restGrayscale', 'grayscale', 'brightness' ],
	},
	{
		id: 'ring',
		label: __( 'Ring and accent line', 'sgs-blocks' ),
		keys: [ 'ringSpread', 'ringColour', 'accentWidth', 'accentColour' ],
		refusable: true,
	},
	{
		id: 'indent',
		label: __( 'Indent', 'sgs-blocks' ),
		keys: [ 'indent' ],
	},
	{
		id: 'timing',
		label: __( 'Timing of this state change', 'sgs-blocks' ),
		keys: [ 'duration', 'delay', 'easing' ],
	},
] );

/** The groups of the form-field Focus state, in order. */
export const FOCUS_GROUPS = Object.freeze( [
	{
		id: 'look',
		label: __( 'Focus look', 'sgs-blocks' ),
		keys: [ 'borderColour', 'backgroundColour' ],
	},
	{
		id: 'timing',
		label: __( 'Timing of this state change', 'sgs-blocks' ),
		keys: [ 'duration', 'delay', 'easing' ],
	},
] );

/**
 * The fields of one values `$def`, grouped. A key the `$def` does not declare is left out and a group left with no key
 * is dropped, so the panel draws exactly what the schema holds.
 *
 * @param {string}  defName The values `$def` (`HoverStateValues`).
 * @param {Object}  groups  `HOVER_GROUPS` or `FOCUS_GROUPS`.
 * @param {Object=} root    The `$defs` to read (tests pass a changed copy).
 * @param {string[]=} omit  Keys left out for this element. A group marked `refusable` whose keys are left out stays in
 *                          the list with no fields and `refused: true`, so the panel can say why.
 * @return {{id: string, label: string, fields: Object[], driver: (Object|null), refused: boolean}[]} The groups with
 *         their fields.
 */
export function fieldGroups( defName, groups, root = SCHEMA, omit = [] ) {
	const properties = root[ defName ]?.properties || {};
	const fieldFor = ( key ) => {
		const node = properties[ key ];
		const meta = node[ 'x-sgs-field' ] || {};
		return {
			key,
			label: FIELD_LABELS[ key ].label,
			lift: Boolean( FIELD_LABELS[ key ].lift ),
			options: FIELD_LABELS[ key ].options || null,
			node,
			fieldType: meta.fieldType,
			perDevice: meta.perDevice === true,
		};
	};
	const fieldsOf = ( keys = [] ) =>
		keys
			.filter(
				( key ) =>
					properties[ key ] &&
					FIELD_LABELS[ key ] &&
					! HIDDEN_KEYS.includes( key ) &&
					! omit.includes( key )
			)
			.map( fieldFor );
	return groups
		.map( ( group ) => {
			const driven = group.driver && properties[ group.driver.key ];
			return {
				id: group.id,
				label: group.label,
				refused:
					group.refusable === true &&
					group.keys.some( ( key ) => omit.includes( key ) ),
				fields: fieldsOf( group.keys ),
				driver: driven
					? {
							key: group.driver.key,
							angleFields: fieldsOf( group.driver.angleKeys ),
							pointerFields: fieldsOf( group.driver.pointerKeys ),
					  }
					: null,
			};
		} )
		.filter(
			( group ) =>
				group.fields.length > 0 || group.driver || group.refused
		);
}

/**
 * Every key a values `$def` holds that no group draws or hides on purpose.
 *
 * @param {string}  defName The values `$def`.
 * @param {Object}  groups  The groups.
 * @param {Object=} root    The `$defs` to read.
 * @return {string[]} The keys with no group, for the drift test.
 */
export function undrawnKeys( defName, groups, root = SCHEMA ) {
	const drawn = new Set( HIDDEN_KEYS );
	groups.forEach( ( group ) => {
		group.keys.forEach( ( key ) => drawn.add( key ) );
		if ( group.driver ) {
			drawn.add( group.driver.key );
			[ ...group.driver.angleKeys, ...group.driver.pointerKeys ].forEach(
				( key ) => drawn.add( key )
			);
		}
	} );
	return Object.keys( root[ defName ]?.properties || {} ).filter(
		( key ) => ! drawn.has( key )
	);
}
