/**
 * Forked from WordPress core (`@wordpress/components` `color-picker/component.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * Deviations from source:
 *  - `contextConnect`/`useContextSystem` (core's private polymorphic
 *    "context-connect" system, from `../context`) are stripped. That system
 *    lets a component receive default props from a matching context
 *    `<Provider>` and support the `as` prop for a swapped root element —
 *    neither of which this fork's usage exercises, since we render
 *    `ColorPicker` as a fixed component with no provider wrapping it. Props
 *    are used directly instead; behaviour for this call site is identical.
 *  - The `styled()` (`@emotion/styled`) wrapper components from `./styles`
 *    are replaced with plain elements carrying classes from `./style.scss`
 *    (this project has no `@emotion/styled` dependency — see that file's own
 *    header comment for the full reasoning).
 *
 * External dependencies
 */
import { colord, extend, getFormat } from 'colord';
import namesPlugin from 'colord/plugins/names';
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { useCallback, useState, useMemo, forwardRef } from '@wordpress/element';
import { useDebounce } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';
import { SelectControl, Flex } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { HStack } from '../../primitives';
import { ColorCopyButton } from './color-copy-button';
import { ColorInput } from './color-input';
import { Picker } from './picker';
import { useControlledValue } from '../utils/use-controlled-value';

// Stylesheet imported once, globally, from src/blocks/extensions/index.js —
// NOT here. This component is reached (via DesignTokenPicker → SgsColourPanel
// and other colour-control paths), not directly mounted per block, so a
// per-block count here is a REACH figure, not a mount count (MOUNTS != REACH
// — one-hop resolution undercounts this kind of shared internal component).
// ⚠ CORRECTED 2026-08-19 — "36 blocks" is stale; `SgsColourPanel` alone now
// mounts on 61 of 83 blocks (`git grep -c '<SgsColourPanel' -- 'src/blocks/*/
// edit.js'`, 2026-08-19), each of which reaches this component through
// DesignTokenPicker. Re-derive via `npm run survey:inspector-surface` (or
// the equivalent mount census) before quoting an exact figure — the reason
// this comment exists (CSS bundling scope) holds regardless of the count:
// importing the stylesheet from here let webpack's per-entry CSS extraction
// attribute the compiled CSS to an arbitrary block's frontend style.css
// bundle rather than the editor-only stylesheet it actually is.

extend( [ namesPlugin ] );

const options = [
	{ label: 'RGB', value: 'rgb' },
	{ label: 'HSL', value: 'hsl' },
	{ label: 'Hex', value: 'hex' },
];

const UnconnectedColorPicker = ( props, forwardedRef ) => {
	const {
		enableAlpha = false,
		color: colorProp,
		onChange,
		defaultValue = '#fff',
		copyFormat,
		className,
		...divProps
	} = props;

	// Use a safe default value for the color and remove the possibility of `undefined`.
	const [ color, setColor ] = useControlledValue( {
		onChange,
		value: colorProp,
		defaultValue,
	} );

	const safeColordColor = useMemo( () => {
		return colord( color || '' );
	}, [ color ] );

	const debouncedSetColor = useDebounce( setColor );

	const handleChange = useCallback(
		( nextValue ) => {
			debouncedSetColor( nextValue.toHex() );
		},
		[ debouncedSetColor ]
	);

	const [ colorType, setColorType ] = useState( copyFormat || 'hex' );

	/*
	 * ! Listener intended for the CAPTURE phase
	 *
	 * Capture paste events over the entire color picker, looking for clipboard
	 * data that could be parsed as a color. If not, let the paste event
	 * propagate normally, so that individual input controls within the
	 * component have a chance to handle it.
	 */
	const maybeHandlePaste = useCallback(
		( event ) => {
			const pastedText = event.clipboardData?.getData( 'text' )?.trim();
			if ( ! pastedText ) {
				return;
			}

			const parsedColor = colord( pastedText );
			if ( ! parsedColor.isValid() ) {
				return;
			}

			// Apply all valid colors, even if the format isn't supported in
			// the UI (e.g. names like "cyan" or, in the future color spaces
			// like "lch" if we add the right colord plugins)
			handleChange( parsedColor );

			// This redundancy helps TypeScript and is safer than assertions
			const supportedFormats = {
				hex: 'hex',
				rgb: 'rgb',
				hsl: 'hsl',
			};

			const detectedFormat = String( getFormat( pastedText ) );
			const newColorType = supportedFormats[ detectedFormat ];
			if ( newColorType ) {
				setColorType( newColorType );
			}

			// Stop at capture phase; no bubbling
			event.stopPropagation();
			event.preventDefault();
		},
		[ handleChange, setColorType ]
	);

	return (
		<div
			ref={ forwardedRef }
			{ ...divProps }
			className={ clsx( 'sgs-colour-picker__colorful-wrapper', className ) }
			onPasteCapture={ maybeHandlePaste }
		>
			<Picker
				onChange={ handleChange }
				color={ safeColordColor }
				enableAlpha={ enableAlpha }
			/>
			<div className="sgs-colour-picker__auxiliary-wrapper">
				<HStack
					justify="space-between"
					className="sgs-colour-picker__auxiliary-header"
				>
					<SelectControl
						className="sgs-colour-picker__format-select"
						__next40pxDefaultSize
						size="compact"
						options={ options }
						value={ colorType }
						onChange={ ( nextColorType ) =>
							setColorType( nextColorType )
						}
						label={ __( 'Color format' ) }
						hideLabelFromVision
						variant="minimal"
					/>
					<ColorCopyButton
						color={ safeColordColor }
						colorType={ copyFormat || colorType }
					/>
				</HStack>
				<Flex
					direction="column"
					gap={ 2 }
					className="sgs-colour-picker__color-input-wrapper"
				>
					<ColorInput
						colorType={ colorType }
						color={ safeColordColor }
						onChange={ handleChange }
						enableAlpha={ enableAlpha }
					/>
				</Flex>
			</div>
		</div>
	);
};

export const ColorPicker = forwardRef( UnconnectedColorPicker );

export default ColorPicker;
