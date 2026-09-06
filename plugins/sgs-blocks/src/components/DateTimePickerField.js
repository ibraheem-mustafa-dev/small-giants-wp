/**
 * DateTimePickerField — the SGS standard DATE control (golden-controls.json
 * goldens/input.json `date` row, Bean-approved live 2026-08-19).
 *
 * Modelled directly on `LinkPopoverControl.js`'s trigger+Popover shape — the
 * established precedent in this codebase for "core component needs more room
 * than a ~248px inspector panel gives it, so mount it in a Popover instead of
 * inline." `DateTimePicker` (@wordpress/components) is core's own real
 * calendar+clock widget; core's own Post Publish panel uses the identical
 * trigger-button -> popover -> DateTimePicker shape this component copies.
 *
 * WHY THIS EXISTS: every date-holding attribute found in this codebase
 * (countdown-timer.targetDate, form-field-date.minDate/.maxDate,
 * testimonial.reviewDate, timeline's repeater-item date field) was on a raw
 * `TextControl` — some HTML5-`type`-constrained, some fully freeform. None
 * used the real picker. `DateTimePicker` had zero mounts anywhere in this
 * tree before this file — that's a gap (a real, live, actively-maintained
 * core component never reached for), not evidence it's the wrong choice.
 *
 * `mode="date"` shows only the calendar (matches HTML5 `type="date"`
 * consumers like `form-field-date.minDate`/`.maxDate`). `mode="datetime"`
 * shows the calendar plus the time/timezone row (matches
 * `countdown-timer.targetDate`'s `type="datetime-local"` shape).
 *
 * Existing TextControl consumers are NOT migrated onto this component yet —
 * that is real per-block work with its own review, deliberately out of scope
 * for the session that built this file (see the `date` row's
 * `migrationNote` in `goldens/input.json`).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState, useRef } from '@wordpress/element';
import {
	BaseControl,
	Button,
	DatePicker,
	DateTimePicker,
	Popover,
} from '@wordpress/components';
import { useInstanceId } from '@wordpress/compose';
import { calendar as calendarIcon } from '@wordpress/icons';
import './DateTimePickerField.css';

/**
 * Format an ISO date/datetime string for the compact trigger row. Falls back
 * to the raw value if it doesn't parse — never throws on a malformed stored
 * value.
 *
 * @param {string} value ISO date or datetime string, or ''.
 * @param {string} mode  'date' or 'datetime'.
 * @return {string} Human-readable label, or '' when value is empty.
 */
function formatTriggerLabel( value, mode ) {
	if ( ! value ) {
		return '';
	}
	const d = new Date( value );
	if ( Number.isNaN( d.getTime() ) ) {
		return value;
	}
	const dateLabel = d.toLocaleDateString( undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	} );
	if ( 'datetime' !== mode ) {
		return dateLabel;
	}
	const timeLabel = d.toLocaleTimeString( undefined, {
		hour: '2-digit',
		minute: '2-digit',
	} );
	return `${ dateLabel }, ${ timeLabel }`;
}

/**
 * @param {Object}   props
 * @param {string}   props.label            BaseControl label.
 * @param {string}   [props.help]           Help text.
 * @param {string}   props.value             ISO date/datetime string, or ''.
 * @param {Function} props.onChange          Receives the next ISO string (or null when cleared).
 * @param {'date'|'datetime'} [props.mode='date']  'date' hides the time/timezone row
 *                                            (matches HTML5 type="date" consumers).
 *                                            'datetime' shows it (matches type="datetime-local").
 * @param {boolean}  [props.is12Hour=false]  Passed straight through to DateTimePicker.
 */
export default function DateTimePickerField( {
	label,
	help,
	value,
	onChange,
	mode = 'date',
	is12Hour = false,
} ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const triggerRef = useRef();

	const triggerLabel = formatTriggerLabel( value, mode );

	// `id` is required for BaseControl to give its own `help` paragraph an id
	// (`${id}__help`, the same convention every native self-wiring control
	// gets from useBaseControlProps()) — without it the paragraph renders
	// with no id at all and nothing can point aria-describedby at it.
	const instanceId = useInstanceId( DateTimePickerField, 'sgs-date-picker-field' );
	const id = `sgs-date-picker-field-${ instanceId }`;
	const helpId = help ? `${ id }__help` : undefined;

	return (
		<BaseControl id={ id } label={ label } help={ help } __nextHasNoMarginBottom>
			<Button
				ref={ triggerRef }
				variant="tertiary"
				className="sgs-date-picker__row"
				icon={ calendarIcon }
				title={ triggerLabel || undefined }
				aria-describedby={ helpId }
				onClick={ () => setIsOpen( true ) }
			>
				<span className="sgs-date-picker__row-label">
					{ triggerLabel || __( 'Set date', 'sgs-blocks' ) }
				</span>
			</Button>
			{ isOpen && (
				<Popover
					anchor={ triggerRef.current }
					onClose={ () => setIsOpen( false ) }
					placement="bottom-start"
					offset={ 8 }
					shift
					className="sgs-date-popover"
				>
					<div className="sgs-date-popover__inner">
						{ 'datetime' === mode ? (
							<DateTimePicker
								currentDate={ value || null }
								onChange={ onChange }
								is12Hour={ is12Hour }
							/>
						) : (
							<DatePicker
								currentDate={ value || null }
								onChange={ onChange }
							/>
						) }
						{ !! value && (
							<Button
								variant="link"
								isDestructive
								className="sgs-date-picker__clear"
								onClick={ () => onChange( null ) }
							>
								{ __( 'Clear date', 'sgs-blocks' ) }
							</Button>
						) }
					</div>
				</Popover>
			) }
		</BaseControl>
	);
}
