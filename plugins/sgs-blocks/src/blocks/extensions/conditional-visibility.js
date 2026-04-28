/**
 * Conditional visibility extension — show/hide blocks based on rules.
 *
 * Adds visibility conditions (login status, user role, date range, days of
 * week, URL parameter, referrer) to ALL Gutenberg blocks (core and SGS).
 *
 * Conditions are evaluated server-side in includes/conditional-visibility.php
 * (priority 9, runs before device-visibility.php). Nothing is added to the
 * saved HTML — the server either outputs the block or returns an empty string.
 *
 * The editor extension adds:
 * 1. Attributes injected via blocks.registerBlockType
 * 2. A "Visibility Conditions" PanelBody in the standard Inspector (not Advanced)
 * 3. An active-condition Notice at the top of the panel when any rule is set
 * 4. A BlockListBlock HOC that applies a visual indicator (reduced opacity +
 *    dashed orange border) whenever any condition is active
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	CheckboxControl,
	TextControl,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Guard against double registration.
 *
 * If the extensions bundle is evaluated twice (e.g. a CJS build and an ESM
 * build both loaded by WordPress), the addFilter calls would fire twice and
 * controls would appear twice in the inspector.
 */
if ( ! window.__sgsConditionalVisibilityRegistered ) {
window.__sgsConditionalVisibilityRegistered = true;

/**
 * Check whether a block type supports the className prop.
 *
 * Blocks that explicitly set supports.className = false have no wrapper
 * element to which we could apply visibility logic — skip them.
 *
 * @param {Object} settings Block settings object.
 * @return {boolean} True when the block supports className.
 */
function supportsClassName( settings ) {
	if ( settings?.supports?.className === false ) {
		return false;
	}
	return true;
}

/**
 * Inject conditional visibility attributes into all block types.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name (unused but required by the filter API).
 * @return {Object} Modified settings with conditional visibility attributes.
 */
function addConditionalAttributes( settings, name ) { // eslint-disable-line no-unused-vars
	if ( ! supportsClassName( settings ) ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			/** 'none' | 'logged-in' | 'logged-out' */
			sgsConditionLoggedIn: { type: 'string', default: 'none' },
			/** Array of WordPress role slugs, e.g. ['administrator','editor'] */
			sgsConditionUserRole: {
				type: 'array',
				default: [],
				items: { type: 'string' },
			},
			/** ISO date string YYYY-MM-DD — block hidden BEFORE this date */
			sgsConditionDateStart: { type: 'string', default: '' },
			/** ISO date string YYYY-MM-DD — block hidden AFTER this date */
			sgsConditionDateEnd: { type: 'string', default: '' },
			/** Weekday integers: 0=Sun, 1=Mon … 6=Sat */
			sgsConditionDays: {
				type: 'array',
				default: [],
				items: { type: 'number' },
			},
			/** "key=value" — block shown only when this GET param is present */
			sgsConditionUrlParam: { type: 'string', default: '' },
			/** Substring matched against HTTP_REFERER */
			sgsConditionReferrer: { type: 'string', default: '' },
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'sgs/conditional-visibility-attributes',
	addConditionalAttributes
);

/** All available WordPress default roles for the role-restriction checkbox list. */
const ROLE_OPTIONS = [
	{ slug: 'administrator', label: __( 'Administrator', 'sgs-blocks' ) },
	{ slug: 'editor',        label: __( 'Editor', 'sgs-blocks' ) },
	{ slug: 'author',        label: __( 'Author', 'sgs-blocks' ) },
	{ slug: 'contributor',   label: __( 'Contributor', 'sgs-blocks' ) },
	{ slug: 'subscriber',    label: __( 'Subscriber', 'sgs-blocks' ) },
];

/** Day-of-week labels mapped to their PHP/JS integer (0=Sun … 6=Sat). */
const DAY_OPTIONS = [
	{ value: 0, label: __( 'Sunday', 'sgs-blocks' ) },
	{ value: 1, label: __( 'Monday', 'sgs-blocks' ) },
	{ value: 2, label: __( 'Tuesday', 'sgs-blocks' ) },
	{ value: 3, label: __( 'Wednesday', 'sgs-blocks' ) },
	{ value: 4, label: __( 'Thursday', 'sgs-blocks' ) },
	{ value: 5, label: __( 'Friday', 'sgs-blocks' ) },
	{ value: 6, label: __( 'Saturday', 'sgs-blocks' ) },
];

/**
 * Toggle a value inside an array attribute.
 *
 * Returns a new array with the value added (when checked=true) or removed
 * (when checked=false). Does not mutate the original array.
 *
 * @param {Array}   arr     Current attribute array.
 * @param {*}       value   The value to add or remove.
 * @param {boolean} checked Whether to add or remove.
 * @return {Array} Updated array.
 */
function toggleArrayValue( arr, value, checked ) {
	if ( checked ) {
		return [ ...arr, value ];
	}
	return arr.filter( ( v ) => v !== value );
}

/**
 * Build a plain-English summary of which conditions are currently active.
 * Used inside the editor Notice so authors know why a block may be hidden.
 *
 * @param {Object} attributes Block attribute values.
 * @return {string} Human-readable summary, or empty string when no conditions.
 */
function buildConditionSummary( attributes ) {
	const parts = [];

	if ( 'logged-in' === attributes.sgsConditionLoggedIn ) {
		const roles = attributes.sgsConditionUserRole;
		if ( roles && roles.length > 0 ) {
			parts.push(
				/* translators: %s = comma-separated list of role names */
				sprintf(
					__( 'roles: %s', 'sgs-blocks' ),
					roles.join( ', ' )
				)
			);
		} else {
			parts.push( __( 'logged-in users only', 'sgs-blocks' ) );
		}
	} else if ( 'logged-out' === attributes.sgsConditionLoggedIn ) {
		parts.push( __( 'logged-out visitors only', 'sgs-blocks' ) );
	}

	if ( attributes.sgsConditionDateStart ) {
		parts.push(
			/* translators: %s = ISO date string */
			sprintf( __( 'from %s', 'sgs-blocks' ), attributes.sgsConditionDateStart )
		);
	}

	if ( attributes.sgsConditionDateEnd ) {
		parts.push(
			/* translators: %s = ISO date string */
			sprintf( __( 'until %s', 'sgs-blocks' ), attributes.sgsConditionDateEnd )
		);
	}

	if ( attributes.sgsConditionDays && attributes.sgsConditionDays.length > 0 ) {
		const dayNames = attributes.sgsConditionDays
			.map( ( d ) => DAY_OPTIONS.find( ( o ) => o.value === d )?.label ?? d )
			.join( ', ' );
		parts.push(
			/* translators: %s = comma-separated day names */
			sprintf( __( 'days: %s', 'sgs-blocks' ), dayNames )
		);
	}

	if ( attributes.sgsConditionUrlParam ) {
		parts.push(
			/* translators: %s = key=value string */
			sprintf( __( 'URL param: %s', 'sgs-blocks' ), attributes.sgsConditionUrlParam )
		);
	}

	if ( attributes.sgsConditionReferrer ) {
		parts.push(
			/* translators: %s = referrer substring */
			sprintf( __( 'referrer contains: %s', 'sgs-blocks' ), attributes.sgsConditionReferrer )
		);
	}

	return parts.join( ' · ' );
}

/**
 * Returns true when ANY conditional visibility rule differs from its default.
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} True when at least one condition is active.
 */
function hasActiveCondition( attributes ) {
	return (
		'none' !== attributes.sgsConditionLoggedIn ||
		( attributes.sgsConditionUserRole && attributes.sgsConditionUserRole.length > 0 ) ||
		!! attributes.sgsConditionDateStart ||
		!! attributes.sgsConditionDateEnd ||
		( attributes.sgsConditionDays && attributes.sgsConditionDays.length > 0 ) ||
		!! attributes.sgsConditionUrlParam ||
		!! attributes.sgsConditionReferrer
	);
}

// sprintf is available globally in the editor via @wordpress/i18n but we
// need the local import for our module scope.
const { sprintf } = wp.i18n;

/**
 * HOC that injects the "Visibility Conditions" panel into the block inspector.
 *
 * Uses InspectorControls (the standard panel, not Advanced) so the controls
 * are discoverable. The panel is collapsed by default (initialOpen={false})
 * to keep the inspector tidy.
 */
const withConditionalVisibilityControls = createHigherOrderComponent(
	( BlockEdit ) => {
		return ( props ) => {
			const { name, attributes, setAttributes } = props;

			// Skip blocks that do not support className.
			const blockType = getBlockType( name );
			if ( blockType?.supports?.className === false ) {
				return <BlockEdit { ...props } />;
			}

			const conditionActive = hasActiveCondition( attributes );
			const summary = conditionActive ? buildConditionSummary( attributes ) : '';

			return (
				<>
					<BlockEdit { ...props } />
					<InspectorControls>
						<PanelBody
							title={ __( 'Visibility Conditions', 'sgs-blocks' ) }
							initialOpen={ false }
						>
							{ /* Active-condition notice — shown at the top of the panel */ }
							{ conditionActive && (
								<Notice
									status="warning"
									isDismissible={ false }
									style={ { marginBottom: '12px' } }
								>
									{ __( 'Conditionally hidden: ', 'sgs-blocks' ) }
									<strong>{ summary }</strong>
								</Notice>
							) }

							{ /* ─── Login status ─── */ }
							<SelectControl
								label={ __( 'Show to', 'sgs-blocks' ) }
								value={ attributes.sgsConditionLoggedIn }
								options={ [
									{
										label: __( 'Everyone', 'sgs-blocks' ),
										value: 'none',
									},
									{
										label: __( 'Logged-in users only', 'sgs-blocks' ),
										value: 'logged-in',
									},
									{
										label: __( 'Logged-out visitors only', 'sgs-blocks' ),
										value: 'logged-out',
									},
								] }
								onChange={ ( val ) =>
									setAttributes( { sgsConditionLoggedIn: val } )
								}
								__nextHasNoMarginBottom
							/>

							{ /* ─── User roles — only visible when logged-in is selected ─── */ }
							{ 'logged-in' === attributes.sgsConditionLoggedIn && (
								<div style={ { marginTop: '12px' } }>
									<p
										style={ {
											marginBottom: '6px',
											fontWeight: 600,
											fontSize: '11px',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
										} }
									>
										{ __( 'Restrict to roles (optional)', 'sgs-blocks' ) }
									</p>
									<p
										style={ {
											marginBottom: '8px',
											fontSize: '12px',
											color: 'var(--wp-admin-theme-color-darker-20, #555)',
										} }
									>
										{ __( 'Leave all unchecked to show to all logged-in users.', 'sgs-blocks' ) }
									</p>
									{ ROLE_OPTIONS.map( ( role ) => (
										<CheckboxControl
											key={ role.slug }
											label={ role.label }
											checked={
												( attributes.sgsConditionUserRole ?? [] ).includes(
													role.slug
												)
											}
											onChange={ ( checked ) =>
												setAttributes( {
													sgsConditionUserRole: toggleArrayValue(
														attributes.sgsConditionUserRole ?? [],
														role.slug,
														checked
													),
												} )
											}
											__nextHasNoMarginBottom
										/>
									) ) }
								</div>
							) }

							{ /* ─── Date range ─── */ }
							<div style={ { marginTop: '16px' } }>
								<p
									style={ {
										marginBottom: '6px',
										fontWeight: 600,
										fontSize: '11px',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									{ __( 'Date range', 'sgs-blocks' ) }
								</p>
								<TextControl
									label={ __( 'Show from', 'sgs-blocks' ) }
									type="date"
									value={ attributes.sgsConditionDateStart }
									onChange={ ( val ) =>
										setAttributes( { sgsConditionDateStart: val } )
									}
									help={ __( 'Block hidden before this date.', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={ __( 'Show until', 'sgs-blocks' ) }
									type="date"
									value={ attributes.sgsConditionDateEnd }
									onChange={ ( val ) =>
										setAttributes( { sgsConditionDateEnd: val } )
									}
									help={ __( 'Block hidden after this date.', 'sgs-blocks' ) }
									style={ { marginTop: '8px' } }
									__nextHasNoMarginBottom
								/>
							</div>

							{ /* ─── Days of week ─── */ }
							<div style={ { marginTop: '16px' } }>
								<p
									style={ {
										marginBottom: '6px',
										fontWeight: 600,
										fontSize: '11px',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									{ __( 'Days of week', 'sgs-blocks' ) }
								</p>
								<p
									style={ {
										marginBottom: '8px',
										fontSize: '12px',
										color: 'var(--wp-admin-theme-color-darker-20, #555)',
									} }
								>
									{ __( 'Leave all unchecked to show on all days.', 'sgs-blocks' ) }
								</p>
								{ DAY_OPTIONS.map( ( day ) => (
									<CheckboxControl
										key={ day.value }
										label={ day.label }
										checked={
											( attributes.sgsConditionDays ?? [] ).includes(
												day.value
											)
										}
										onChange={ ( checked ) =>
											setAttributes( {
												sgsConditionDays: toggleArrayValue(
													attributes.sgsConditionDays ?? [],
													day.value,
													checked
												),
											} )
										}
										__nextHasNoMarginBottom
									/>
								) ) }
							</div>

							{ /* ─── URL parameter ─── */ }
							<div style={ { marginTop: '16px' } }>
								<TextControl
									label={ __( 'URL parameter', 'sgs-blocks' ) }
									placeholder="key=value"
									value={ attributes.sgsConditionUrlParam }
									onChange={ ( val ) =>
										setAttributes( { sgsConditionUrlParam: val } )
									}
									help={ __(
										'Show only when this GET parameter is present, e.g. utm_source=email',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
								/>
							</div>

							{ /* ─── Referrer ─── */ }
							<div style={ { marginTop: '12px' } }>
								<TextControl
									label={ __( 'Referrer contains', 'sgs-blocks' ) }
									placeholder={ __( 'e.g. google.com', 'sgs-blocks' ) }
									value={ attributes.sgsConditionReferrer }
									onChange={ ( val ) =>
										setAttributes( { sgsConditionReferrer: val } )
									}
									help={ __(
										'Show only when the visitor arrived from a matching referrer.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
								/>
							</div>
						</PanelBody>
					</InspectorControls>
				</>
			);
		};
	},
	'withConditionalVisibilityControls'
);

addFilter(
	'editor.BlockEdit',
	'sgs/conditional-visibility-controls',
	withConditionalVisibilityControls
);

/**
 * HOC that applies a visual indicator in the editor when any condition is active.
 *
 * Reduces the block's opacity to 0.6 and adds a dashed orange border so
 * authors can see at a glance which blocks are conditionally hidden.
 */
const withConditionalVisibilityEditorStyles = createHigherOrderComponent(
	( BlockListBlock ) => {
		return ( props ) => {
			const { attributes } = props;

			if ( ! hasActiveCondition( attributes ) ) {
				return <BlockListBlock { ...props } />;
			}

			const wrapperProps = {
				...( props.wrapperProps || {} ),
				style: {
					...( props.wrapperProps?.style || {} ),
					opacity: 0.6,
					border: '2px dashed #f87a1f',
					position: 'relative',
				},
				'data-sgs-conditional': 'true',
			};

			return (
				<BlockListBlock { ...props } wrapperProps={ wrapperProps } />
			);
		};
	},
	'withConditionalVisibilityEditorStyles'
);

addFilter(
	'editor.BlockListBlock',
	'sgs/conditional-visibility-editor-styles',
	withConditionalVisibilityEditorStyles
);

} // end guard: window.__sgsConditionalVisibilityRegistered
