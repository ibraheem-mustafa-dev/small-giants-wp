/**
 * `motion` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `motion.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`): this half owns the JSX and the
 * `@wordpress/components` import. Only `motion.js`'s
 * `css()`/`validate()`/`disclosure()` need to be Node-importable; this file
 * is a webpack-only concern.
 *
 * The mutual-exclusion `onChange` wiring below is copied exactly from
 * `hero/edit.js` (~845-861) — turning one effect on clears the other in the
 * SAME `setAttributes()` call, never a separate effect/re-render.
 *
 * @package SGS\Blocks
 */
import MediaMotionControls from '../controls/MediaMotionControls.js';
import { attrKeys, disclosure, validateBoolean, validateDuration } from './motion.js';

/**
 * Bare inspector rows for this atom.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @param {string}   [props.prefix]
 * @param {string}   [props.blockSlug]
 * @return {JSX.Element} Bare rows.
 */
export function control( { attributes, setAttributes, prefix = '', blockSlug = '' } ) {
	const keys = attrKeys( prefix, blockSlug );
	const disc = disclosure( { attributes, prefix, blockSlug } );

	return (
		<MediaMotionControls
			key={ `${ blockSlug }-${ prefix }-motion` }
			kenBurns={ attributes[ keys.kenBurns ] }
			onKenBurnsChange={ ( val ) => {
				const next = validateBoolean( val );
				setAttributes( {
					[ keys.kenBurns ]: next,
					[ keys.parallax ]: next ? false : attributes[ keys.parallax ],
				} );
			} }
			parallax={ attributes[ keys.parallax ] }
			onParallaxChange={ ( val ) => {
				const next = validateBoolean( val );
				setAttributes( {
					[ keys.parallax ]: next,
					[ keys.kenBurns ]: next ? false : attributes[ keys.kenBurns ],
				} );
			} }
			duration={ attributes[ keys.duration ] }
			onDurationChange={ ( val ) => setAttributes( { [ keys.duration ]: validateDuration( val ) } ) }
			durationDisabled={ 'disabled' === disc.AnimationDuration.state }
			durationHiddenReason={ disc.AnimationDuration.hiddenReason || '' }
		/>
	);
}
