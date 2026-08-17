/**
 * Constants shared by more than one wrapper panel.
 *
 * Deliberately tiny: a dependency scan found LENGTH_UNITS is the ONLY constant used by more than
 * one panel (WidthPanel + BackgroundPanel). Everything else lives with its single consumer.
 * Do not use this as a dumping ground — if something is used once, it belongs in that panel's file.
 */

export const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: '%', label: '%' },
	{ value: 'vw', label: 'vw' },
];
