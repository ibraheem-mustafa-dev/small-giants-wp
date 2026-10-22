/**
 * SgsGapControl — a row gap and a column gap in one control, shaped like SgsBoxControl but with two parts instead
 * of four.
 *
 * Linked (one row) it is exactly `SgsLengthControl`: one spacing preset or length that sets both gaps, stored as a
 * single value ("50" for a preset, "20px" for a length), which is what every gap attribute held before. Unlinked,
 * it shows a Row gap and a Column gap, each a full `SgsLengthControl` row (preset names, value box with unit,
 * slider), and stores the CSS `gap` shorthand "row column". In that two-value form a preset is written as its
 * `var(--wp--preset--spacing--N)` so it survives inside the pair; `includes/helpers-css-safety.php::sgs_css_length_value`
 * and its twin `utils/css-length.js::cssLengthValue` already pass a two-value list through, so no reader changes.
 *
 * Linked or unlinked is local editor state, as in SgsBoxControl: it opens unlinked when the stored value is a pair
 * with two different parts, linked otherwise. Re-linking collapses the pair to its row value. A stored value this
 * control cannot split into one or two lengths (a `calc()` list, a keyword) is handed to the linked
 * `SgsLengthControl`, which shows it as "Set as CSS" and keeps it.
 *
 * @package
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Flex,
	FlexBlock,
	FlexItem,
	BaseControl,
} from '@wordpress/components';
import { link as linkIcon, linkOff as linkOffIcon } from '@wordpress/icons';
import SgsLengthControl from './SgsLengthControl';

const PRESET_VAR = /^var\(--wp--preset--spacing--(\d+)\)$/;

/**
 * Split a CSS value on whitespace that sits outside any parentheses.
 *
 * @param {string} value Stored value.
 * @return {string[]} Its top-level parts.
 */
export function splitTopLevel( value ) {
	const parts = [];
	let depth = 0;
	let current = '';
	for ( const ch of String( value ?? '' ).trim() ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( /\s/.test( ch ) && 0 === depth ) {
			if ( current ) {
				parts.push( current );
				current = '';
			}
		} else {
			current += ch;
		}
	}
	if ( current ) {
		parts.push( current );
	}
	return parts;
}

/**
 * A stored gap as { row, column } in SgsLengthControl's own value shape (a preset is its bare slug).
 *
 * @param {string} value Stored value: '', one length, or "row column".
 * @return {{row: string, column: string, pair: boolean}} The two parts; `pair` is true when two were stored.
 */
export function parseGap( value ) {
	const parts = splitTopLevel( value );
	const slug = ( part ) => {
		const match = PRESET_VAR.exec( part || '' );
		return match ? match[ 1 ] : part || '';
	};
	if ( 2 === parts.length ) {
		return {
			row: slug( parts[ 0 ] ),
			column: slug( parts[ 1 ] ),
			pair: true,
		};
	}
	// One part is both gaps; anything else (empty, three or more parts) goes to the linked control whole.
	return {
		row: 1 === parts.length ? slug( parts[ 0 ] ) : String( value ?? '' ),
		column: '',
		pair: false,
	};
}

/**
 * The stored form of a row and a column part: one value when they match, the shorthand otherwise. A part left empty
 * while the other is set is written as 0 so the shorthand stays valid.
 *
 * @param {string} row    Row part in SgsLengthControl's shape.
 * @param {string} column Column part in SgsLengthControl's shape.
 * @return {string} Value to store.
 */
export function composeGap( row, column ) {
	if ( row === column ) {
		return row;
	}
	const wrap = ( part ) =>
		/^\d+$/.test( part )
			? `var(--wp--preset--spacing--${ part })`
			: part || '0';
	return `${ wrap( row ) } ${ wrap( column ) }`;
}

/**
 * @param {Object}   props
 * @param {string}   [props.label]               Visible label of the linked row.
 * @param {string}   props.value                 Stored gap: '', one length, or "row column".
 * @param {Function} props.onChange              Receives the new stored value.
 * @param {boolean}  [props.presets=false]       Offer the theme's spacing sizes.
 * @param {string}   [props.placeholder]         Inherited value, shown as the resting value.
 * @param {string}   [props.help]                Help text under the linked row.
 * @param {boolean}  [props.hideLabelFromVision] Hide the label (a wrapper already shows it).
 * @param {boolean}  [props.disabled]            Disable the control.
 * @param {string[]} [props.units]               Units offered.
 * @param {number}   [props.max]                 Largest slider value.
 */
export default function SgsGapControl( {
	label,
	value,
	onChange,
	presets = false,
	placeholder,
	help,
	hideLabelFromVision,
	disabled,
	units,
	max,
} ) {
	const stored = parseGap( value );
	const inherited = parseGap( placeholder );
	const [ unlinkedByUser, setUnlinkedByUser ] = useState( false );
	const differs = stored.pair && stored.row !== stored.column;
	const unlinked = unlinkedByUser || differs;

	const shared = { presets, units, max, disabled };

	if ( ! unlinked ) {
		return (
			<div className="sgs-gap-control">
				<SgsLengthControl
					{ ...shared }
					label={ label }
					hideLabelFromVision={ hideLabelFromVision }
					help={ help }
					placeholder={ placeholder }
					value={ stored.pair ? stored.row : stored.row }
					onChange={ ( next ) => onChange( next ) }
				/>
				<Button
					size="small"
					icon={ linkIcon }
					iconSize={ 24 }
					label={ __(
						'Set row and column gaps separately',
						'sgs-blocks'
					) }
					onClick={ () => setUnlinkedByUser( true ) }
					disabled={ disabled }
				/>
			</div>
		);
	}

	const row = stored.row;
	const column = stored.pair ? stored.column : stored.row;

	return (
		<BaseControl className="sgs-gap-control" __nextHasNoMarginBottom>
			<Flex align="center" justify="space-between">
				<FlexBlock>
					{ ! hideLabelFromVision && label && (
						<BaseControl.VisualLabel>
							{ label }
						</BaseControl.VisualLabel>
					) }
				</FlexBlock>
				<FlexItem>
					<Button
						size="small"
						icon={ linkOffIcon }
						iconSize={ 24 }
						label={ __( 'Link row and column gaps', 'sgs-blocks' ) }
						onClick={ () => {
							setUnlinkedByUser( false );
							onChange( composeGap( row, row ) );
						} }
						disabled={ disabled }
					/>
				</FlexItem>
			</Flex>
			<SgsLengthControl
				{ ...shared }
				label={ __( 'Row gap', 'sgs-blocks' ) }
				placeholder={ placeholder ? inherited.row : undefined }
				value={ row }
				onChange={ ( next ) => onChange( composeGap( next, column ) ) }
			/>
			<SgsLengthControl
				{ ...shared }
				label={ __( 'Column gap', 'sgs-blocks' ) }
				placeholder={
					placeholder ? inherited.column || inherited.row : undefined
				}
				value={ column }
				onChange={ ( next ) => onChange( composeGap( row, next ) ) }
			/>
		</BaseControl>
	);
}
