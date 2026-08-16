/**
 * ScaleAxisControl — 2-axis (X/Y) proportional scale control with a
 * link/unlink toggle (Spec 35 §F.2.3, D637).
 *
 * The 2-axis analogue of WP core's `BoxControl` 4-side link pattern: a
 * single icon-button toggles between editing X and Y together (one
 * `RangeControl`, writes both axes) or independently (two labelled
 * `RangeControl`s, each writing only its own axis).
 *
 * ── Linked-default computation (deliberately NOT persisted) ─────────────
 * `isLinked` mirrors core `BoxControl`'s own `isValuesMixed`-on-mount
 * check: it is computed ONCE from the incoming `value` the first time this
 * component mounts (`x === y` → start linked), then lives purely as local
 * editor UI state. It is never written back to `value`/`onChange` and there
 * is no companion "linked" attribute — re-opening the inspector for the
 * same block re-derives it fresh from whatever `x`/`y` currently are.
 *
 * ── Re-link behaviour ─────────────────────────────────────────────────────
 * Re-linking while `x !== y` collapses to ONE value by copying X onto Y
 * (X is visually primary, first field, first axis) — the same
 * "collapse to one value" behaviour core `BoxControl` exhibits on re-link.
 *
 * ── Usage ────────────────────────────────────────────────────────────────
 *   <ScaleAxisControl
 *       label={ __( 'Scale', 'sgs-blocks' ) }
 *       value={ attributes.scale }
 *       onChange={ ( next ) => setAttributes( { scale: next } ) }
 *       min={ 50 }
 *       max={ 200 }
 *       step={ 1 }
 *       unit="%"
 *   />
 *
 * @package SGS\Blocks
 */
import { useState } from '@wordpress/element';
import { Button, Flex, FlexItem, RangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { link as linkIcon, linkOff as linkOffIcon } from '@wordpress/icons';

/**
 * Resolve the NEUTRAL per-axis value — the one an unset axis falls back to and
 * the one every RangeControl resets to.
 *
 * Deliberately the caller's `defaultValue`, NOT `min`. For a scale the neutral
 * is 100 (natural, undistorted size), which is nowhere near the slider's
 * minimum; falling back to `min` would silently shrink an unset axis to the
 * smallest allowed value and make "reset" mean "shrink to smallest". `min` is
 * only the last resort when the caller declares no neutral at all.
 *
 * @param {number|undefined} defaultValue Caller-declared neutral.
 * @param {number|undefined} min          RangeControl minimum.
 * @return {number} Neutral per-axis value.
 */
function resolveNeutral( defaultValue, min ) {
	if ( typeof defaultValue === 'number' && ! Number.isNaN( defaultValue ) ) {
		return defaultValue;
	}
	if ( typeof min === 'number' && ! Number.isNaN( min ) ) {
		return min;
	}
	return 0;
}

/**
 * Normalise a possibly-missing/partial value to a concrete { x, y } pair.
 *
 * @param {{x?: number, y?: number}|undefined} value    Incoming value.
 * @param {number}                             fallback Neutral per-axis default.
 * @return {{x: number, y: number}} Concrete, numeric axis pair.
 */
function normaliseValue( value, fallback ) {
	const x = typeof value?.x === 'number' && ! Number.isNaN( value.x ) ? value.x : fallback;
	const y = typeof value?.y === 'number' && ! Number.isNaN( value.y ) ? value.y : fallback;
	return { x, y };
}

/**
 * @param {Object}   props
 * @param {string}   props.label    Label shown for the LINKED single control.
 * @param {Object}   [props.value]  { x, y } — may be undefined/partial, see normaliseValue.
 * @param {Function} props.onChange Receives the next { x, y } object.
 * @param {number}   [props.min]          RangeControl minimum.
 * @param {number}   [props.max]          RangeControl maximum.
 * @param {number}   [props.step]         RangeControl step.
 * @param {string}   [props.unit]         Display suffix appended to the RangeControl label (e.g. '%').
 * @param {number}   [props.defaultValue] Neutral per-axis value — used both as the
 *                                        fallback for a missing axis and as every
 *                                        RangeControl's reset target. Defaults to
 *                                        `min` only when the caller gives no neutral.
 * @return {JSX.Element} Controls fragment.
 */
export default function ScaleAxisControl( {
	label,
	value,
	onChange,
	min,
	max,
	step,
	unit = '',
	defaultValue,
} ) {
	const resetFallback = resolveNeutral( defaultValue, min );
	const normalised = normaliseValue( value, resetFallback );

	// Computed ONCE on mount from the incoming value (core BoxControl's own
	// isValuesMixed-on-mount pattern) — never persisted, never re-derived on
	// every render, so toggling the control mid-edit doesn't fight the user.
	const [ isLinked, setIsLinked ] = useState( () => normalised.x === normalised.y );

	const suffixedLabel = ( base ) => ( unit ? `${ base } (${ unit })` : base );

	const toggleLinked = () => {
		if ( ! isLinked ) {
			// Re-linking while x !== y collapses to ONE value: X is visually
			// primary, so Y is synced to X (mirrors core BoxControl's re-link
			// collapse behaviour).
			if ( normalised.x !== normalised.y ) {
				onChange( { x: normalised.x, y: normalised.x } );
			}
			setIsLinked( true );
		} else {
			setIsLinked( false );
		}
	};

	const linkButtonLabel = isLinked
		? __( 'Unlink horizontal and vertical scale', 'sgs-blocks' )
		: __( 'Link horizontal and vertical scale', 'sgs-blocks' );

	return (
		<Flex align="flex-end" gap={ 2 }>
			<FlexItem isBlock>
				{ isLinked ? (
					<RangeControl
						label={ suffixedLabel( label ) }
						value={ normalised.x }
						onChange={ ( next ) => {
							const v = typeof next === 'number' && ! Number.isNaN( next ) ? next : resetFallback;
							onChange( { x: v, y: v } );
						} }
						min={ min }
						max={ max }
						step={ step }
						withInputField
						allowReset
						resetFallbackValue={ resetFallback }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) : (
					<Flex direction="column" gap={ 2 }>
						<FlexItem>
							<RangeControl
								label={ suffixedLabel( __( 'Horizontal (X)', 'sgs-blocks' ) ) }
								value={ normalised.x }
								onChange={ ( next ) => {
									const v = typeof next === 'number' && ! Number.isNaN( next ) ? next : resetFallback;
									onChange( { x: v, y: normalised.y } );
								} }
								min={ min }
								max={ max }
								step={ step }
								withInputField
								allowReset
								resetFallbackValue={ resetFallback }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
						<FlexItem>
							<RangeControl
								label={ suffixedLabel( __( 'Vertical (Y)', 'sgs-blocks' ) ) }
								value={ normalised.y }
								onChange={ ( next ) => {
									const v = typeof next === 'number' && ! Number.isNaN( next ) ? next : resetFallback;
									onChange( { x: normalised.x, y: v } );
								} }
								min={ min }
								max={ max }
								step={ step }
								withInputField
								allowReset
								resetFallbackValue={ resetFallback }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
					</Flex>
				) }
			</FlexItem>
			<FlexItem>
				<Button
					icon={ isLinked ? linkIcon : linkOffIcon }
					label={ linkButtonLabel }
					aria-label={ linkButtonLabel }
					aria-pressed={ isLinked }
					isPressed={ isLinked }
					onClick={ toggleLinked }
				/>
			</FlexItem>
		</Flex>
	);
}
