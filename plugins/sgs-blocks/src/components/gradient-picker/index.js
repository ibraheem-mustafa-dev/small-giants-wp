/**
 * SgsGradientPicker — SGS fork of WordPress core's `CustomGradientPicker`
 * (`@wordpress/components`), forked at commit
 * 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4), mirroring the same
 * module boundaries the colour-picker fork already established
 * (`../colour-picker`).
 *
 * Same public contract as core's `GradientPicker`/`CustomGradientPicker`:
 * `value` is a CSS gradient string (or undefined), `onChange(newCss)`
 * receives the updated string. `GradientOverlayControl.js` mounts this in
 * place of `@wordpress/components`' `GradientPicker` — no other call site
 * needs to change shape.
 *
 * The ONE divergence from core (Task 3, D636, 2026-08-16): each colour
 * stop's popover offers the SGS theme palette (forked `ColorPalette`)
 * above the raw colour picker — see `gradient-bar/control-points.js`.
 * Picking a swatch stores that stop as `var(--wp--preset--color--<slug>)`,
 * so a brand-palette change re-colours the gradient, matching every other
 * SGS colour row (D618/D619). Everything else — the bar itself, drag/
 * keyboard positioning, linear/radial type switch, angle picker — is
 * behaviour-identical to core.
 */
import { AnglePickerControl, SelectControl, Flex } from '@wordpress/components';
import { useSettings } from '@wordpress/block-editor';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { VStack } from '../primitives';
import CustomGradientBar from './gradient-bar';
import './editor.css';
import { buildPaletteDefaultGradient } from './palette-default';
import {
	getGradientAstWithDefault,
	getLinearGradientRepresentation,
	getGradientAstWithControlPoints,
	getStopCssColor,
} from './utils';
import { serializeGradient } from './serializer';
export { resolveStopToken } from './utils';
import {
	DEFAULT_LINEAR_GRADIENT_ANGLE,
	HORIZONTAL_GRADIENT_ORIENTATION,
	GRADIENT_OPTIONS,
} from './constants';

const GradientAnglePicker = ( { gradientAST, hasGradient, onChange } ) => {
	const angle = gradientAST?.orientation?.value ?? DEFAULT_LINEAR_GRADIENT_ANGLE;
	const onAngleChange = ( newAngle ) => {
		onChange(
			serializeGradient( {
				...gradientAST,
				orientation: {
					type: 'angular',
					value: `${ newAngle }`,
				},
			} )
		);
	};
	return (
		<AnglePickerControl
			onChange={ onAngleChange }
			value={ hasGradient ? angle : '' }
		/>
	);
};

const GradientTypePicker = ( { gradientAST, hasGradient, onChange } ) => {
	const { type } = gradientAST;

	const onSetLinearGradient = () => {
		onChange(
			serializeGradient( {
				...gradientAST,
				orientation: gradientAST.orientation
					? undefined
					: HORIZONTAL_GRADIENT_ORIENTATION,
				type: 'linear-gradient',
			} )
		);
	};

	const onSetRadialGradient = () => {
		const { orientation, ...restGradientAST } = gradientAST;
		onChange(
			serializeGradient( {
				...restGradientAST,
				type: 'radial-gradient',
			} )
		);
	};

	const handleOnChange = ( next ) => {
		if ( next === 'linear-gradient' ) {
			onSetLinearGradient();
		}
		if ( next === 'radial-gradient' ) {
			onSetRadialGradient();
		}
	};

	return (
		<SelectControl
			className="sgs-gradient-picker__type-picker"
			label={ __( 'Type', 'sgs-blocks' ) }
			labelPosition="top"
			onChange={ handleOnChange }
			options={ GRADIENT_OPTIONS }
			size="__unstable-large"
			__next40pxDefaultSize
			value={ hasGradient ? type : undefined }
			__nextHasNoMarginBottom
		/>
	);
};

export default function SgsGradientPicker( {
	value,
	onChange,
	enableAlpha = true,
	__experimentalIsRenderedInSidebar = false,
} ) {
	// SGS divergence: when nothing is stored yet, start from the client's own
	// brand palette rather than core's stock blue->purple `DEFAULT_GRADIENT`.
	// Seed only — nothing is written to the block until the operator touches
	// the bar, so `hasGradient` still reads false exactly as in core.
	const [ palette ] = useSettings( 'color.palette' );
	const paletteDefault = useMemo(
		() => buildPaletteDefaultGradient( palette ),
		[ palette ]
	);

	const { gradientAST, hasGradient } = getGradientAstWithDefault(
		value,
		paletteDefault ?? undefined
	);

	const background = getLinearGradientRepresentation( gradientAST );

	// Control points colour option may be a palette-linked var() (Task 3),
	// hex from a legacy value, or custom colours will be rgb. Position is
	// always a percentage.
	const controlPoints = gradientAST.colorStops.map( ( colorStop ) => {
		const cssColor = getStopCssColor( colorStop );
		return {
			color: cssColor,
			token: colorStop.type === 'var' ? colorStop.value : undefined,
			// @ts-expect-error-equivalent: already validated by
			// hasUnsupportedLength() inside getGradientAstWithDefault().
			position: Number.parseInt( colorStop.length.value, 10 ),
		};
	} );

	return (
		<VStack spacing={ 4 } className="sgs-gradient-picker">
			<CustomGradientBar
				__experimentalIsRenderedInSidebar={ __experimentalIsRenderedInSidebar }
				disableAlpha={ ! enableAlpha }
				background={ background }
				hasGradient={ hasGradient }
				value={ controlPoints }
				onChange={ ( newControlPoints ) => {
					onChange(
						serializeGradient(
							getGradientAstWithControlPoints(
								gradientAST,
								newControlPoints
							)
						)
					);
				} }
			/>
			<Flex
				gap={ 3 }
				className="components-custom-gradient-picker__ui-line sgs-gradient-picker__ui-line"
			>
				<div className="sgs-gradient-picker__type-wrapper">
					<GradientTypePicker
						gradientAST={ gradientAST }
						hasGradient={ hasGradient }
						onChange={ onChange }
					/>
				</div>
				<div className="sgs-gradient-picker__angle-wrapper">
					{ gradientAST.type === 'linear-gradient' && (
						<GradientAnglePicker
							gradientAST={ gradientAST }
							hasGradient={ hasGradient }
							onChange={ onChange }
						/>
					) }
				</div>
			</Flex>
		</VStack>
	);
}
