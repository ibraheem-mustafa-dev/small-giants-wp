/**
 * `video-behaviour` atom — CONTROL half (JSX-equivalent `control()`, via
 * `createElement()`).
 *
 * Pairs with `video-behaviour.js` (the pure `css()`/`validate()`/
 * `disclosure()` half — see its docblock for the full defect this atom
 * fixes, and the direction-of-coupling rationale). Split per
 * `scripts/check-media-atom-purity.js`: this file owns every import the
 * parity gate's plain-Node import cannot resolve (`@wordpress/components`'
 * `ToggleControl`, and `VideoCaptionsFields`'s `@wordpress/block-editor`
 * dependency), so the logic half stays importable there.
 *
 * `control()` calls `validate()` and `disclosure()` from the logic half
 * rather than duplicating them, so the editor lock behaviour and the
 * render-time coercion (`sgs_media_atom_video_behaviour_requires()`) stay
 * expressions of the SAME rule.
 *
 * Imports its own `video-behaviour.control.css` for spacing between the six
 * stacked toggles + the captions workflow — see that file's docblock for why
 * it is NOT under `assets/css/media-atoms/` (that pipeline is the
 * paintable-CSS-property stylesheet for the rendered element, and this is
 * Inspector-sidebar chrome outside every selector it can reach).
 *
 * @package SGS\Blocks
 */
import { createElement } from '@wordpress/element';
import { ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import VideoCaptionsFields from '../controls/VideoCaptionsFields.js';
import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { validate, disclosure } from './video-behaviour.js';
import './video-behaviour.control.css';

/**
 * Bare control rows. Never its own `<InspectorControls>`.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {string}   [props.prefix]      Surface prefix.
 * @param {string}   props.blockSlug     e.g. 'sgs/media'.
 */
export function control( { attributes, setAttributes, prefix = '', blockSlug } ) {
	const key = ( base ) => mediaStoredAttrName( blockSlug, prefix, base );
	const states = disclosure( { attributes, prefix } );

	const autoplayKey = key( 'VideoAutoplay' );
	const mutedKey = key( 'VideoMuted' );
	const inlineKey = key( 'VideoPlaysInline' );
	const loopKey = key( 'VideoLoop' );
	const controlsKey = key( 'VideoControls' );
	const lazyKey = key( 'VideoLazyLoad' );

	return createElement(
		'div',
		{ className: 'sgs-media-behaviour-controls' },
		createElement( ToggleControl, {
			key: 'autoplay',
			label: __( 'Autoplay', 'sgs-blocks' ),
			checked: !! attributes[ autoplayKey ],
			onChange: ( value ) => {
				const next = { [ autoplayKey ]: validate( value, 'VideoAutoplay' ) };
				// Turning autoplay ON locks muted + playsinline ON in the SAME
				// setAttributes call — the editor never allows the unplayable
				// combination to exist even for one save.
				if ( value ) {
					next[ mutedKey ] = true;
					next[ inlineKey ] = true;
				}
				setAttributes( next );
			},
			__nextHasNoMarginBottom: true,
		} ),
		createElement( ToggleControl, {
			key: 'muted',
			label: __( 'Muted', 'sgs-blocks' ),
			checked: !! attributes[ mutedKey ],
			disabled: 'disabled' === states.VideoMuted.state,
			help: states.VideoMuted.hiddenReason || undefined,
			onChange: ( value ) =>
				setAttributes( { [ mutedKey ]: validate( value, 'VideoMuted' ) } ),
			__nextHasNoMarginBottom: true,
		} ),
		createElement( ToggleControl, {
			key: 'plays-inline',
			label: __( 'Plays inline', 'sgs-blocks' ),
			checked: !! attributes[ inlineKey ],
			disabled: 'disabled' === states.VideoPlaysInline.state,
			help: states.VideoPlaysInline.hiddenReason || undefined,
			onChange: ( value ) =>
				setAttributes( { [ inlineKey ]: validate( value, 'VideoPlaysInline' ) } ),
			__nextHasNoMarginBottom: true,
		} ),
		createElement( ToggleControl, {
			key: 'loop',
			label: __( 'Loop', 'sgs-blocks' ),
			checked: !! attributes[ loopKey ],
			onChange: ( value ) =>
				setAttributes( { [ loopKey ]: validate( value, 'VideoLoop' ) } ),
			__nextHasNoMarginBottom: true,
		} ),
		createElement( ToggleControl, {
			key: 'controls',
			label: __( 'Show controls', 'sgs-blocks' ),
			checked: !! attributes[ controlsKey ],
			onChange: ( value ) =>
				setAttributes( { [ controlsKey ]: validate( value, 'VideoControls' ) } ),
			__nextHasNoMarginBottom: true,
		} ),
		createElement( ToggleControl, {
			key: 'lazy',
			label: __( 'Lazy-load', 'sgs-blocks' ),
			checked: !! attributes[ lazyKey ],
			onChange: ( value ) =>
				setAttributes( { [ lazyKey ]: validate( value, 'VideoLazyLoad' ) } ),
			__nextHasNoMarginBottom: true,
		} ),
		createElement( VideoCaptionsFields, {
			key: 'captions',
			attributes,
			setAttributes,
			prefix,
			blockSlug,
		} )
	);
}
