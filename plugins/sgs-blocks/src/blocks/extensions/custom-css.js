/**
 * Custom CSS extension - adds a textarea to the block inspector allowing per-block CSS rules
 * (Spec 32 FR-32-13, FR-32-20).
 *
 * Every rule is confined to the block instance by the shared scoper (`src/utils/custom-css-scope.js`,
 * twin of `includes/class-custom-css-scoper.php`): `&selector` is the block, any other selector is a
 * descendant of it, and `@media` / `@supports` / `@container` rules are scoped the same way. What cannot be
 * confined is refused and listed under the field, on the canvas exactly as on the page.
 *
 * `sgsCustomCssId` is the block instance's stable key: the page's scope class is `sgs-c-{id}`, so it
 * survives edits to the CSS and two blocks carrying the same CSS keep separate classes. A duplicated
 * block's copied key is replaced. `sgsCustomCssNote` is a plain-English label shown with the field, set
 * by the cloning route to say what a rule it wrote is for.
 *
 * Server-side: includes/custom-css.php handles output and scoping.
 *
 * Also disables WordPress core's native `customCSS` block support
 * (WP 7.0+, https://make.wordpress.org/core/2026/03/15/custom-css-for-individual-block-instances-in-wordpress-7-0/).
 * That native support auto-enables on any block declaring color/typography/
 * spacing/border supports (i.e. effectively every sgs/* and core block) and
 * renders its OWN "Additional CSS" textarea in the same Advanced panel,
 * writing to `attributes.style.css` — a DIFFERENT attribute our pipeline
 * (includes/custom-css.php, Spec 32 FR-32-4) never reads. Left enabled it
 * produced two visually adjacent CSS controls ("Additional CSS" then
 * "Custom CSS") bound to two unrelated attributes — proven live 2026-08-03
 * by writing to the native control and reading block attributes:
 * `attributes.style.css` populated, `attributes.sgsCustomCss` untouched.
 * `sgsCustomCss` is the one load-bearing attribute (the cloning pipeline's
 * residual-band passthrough, Spec 32 FR-32-13) — never remove it. Disabling
 * the native support here, not deleting our own control.
 */
import { addFilter } from '@wordpress/hooks';
import { InspectorAdvancedControls } from '@wordpress/block-editor';
import { Notice, TextareaControl } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { scopeCustomCss } from '../../utils/custom-css-scope';

/** Instance key -> the clientId that holds it, so a duplicated block's copied key is detected. */
const keyOwners = new Map();

/**
 * A new instance key: 8 lower-case hex characters (the server accepts `[a-z0-9]{4,16}`).
 *
 * @return {string} Key.
 */
function newInstanceKey() {
	const bytes = new Uint8Array( 4 );
	window.crypto.getRandomValues( bytes );
	return Array.from( bytes, ( b ) =>
		b.toString( 16 ).padStart( 2, '0' )
	).join( '' );
}

// Add the attributes to every block, and disable WP core's own native `customCSS` block support
// (see file header) so only one CSS control appears in the Advanced panel.
function addCustomCssAttribute( settings ) {
	if ( ! settings.attributes ) {
		return settings;
	}
	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsCustomCss: { type: 'string', default: '' },
			sgsCustomCssId: { type: 'string', default: '' },
			sgsCustomCssNote: { type: 'string', default: '' },
		},
		supports: {
			...settings.supports,
			customCSS: false,
		},
	};
}
addFilter(
	'blocks.registerBlockType',
	'sgs/custom-css-attribute',
	addCustomCssAttribute
);

// The textarea in every block's Advanced panel, plus the instance key's upkeep.
const withCustomCssControl = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, isSelected, clientId } = props;
		const { sgsCustomCss, sgsCustomCssId, sgsCustomCssNote } = attributes;
		const hasCss = !! String( sgsCustomCss || '' ).trim();

		useEffect( () => {
			if ( ! hasCss ) {
				return undefined;
			}
			const owner = sgsCustomCssId
				? keyOwners.get( sgsCustomCssId )
				: undefined;
			if ( ! sgsCustomCssId || ( owner && owner !== clientId ) ) {
				const key = newInstanceKey();
				keyOwners.set( key, clientId );
				setAttributes( { sgsCustomCssId: key } );
				return undefined;
			}
			keyOwners.set( sgsCustomCssId, clientId );
			return () => {
				if ( keyOwners.get( sgsCustomCssId ) === clientId ) {
					keyOwners.delete( sgsCustomCssId );
				}
			};
		}, [ hasCss, sgsCustomCssId, clientId, setAttributes ] );

		const refused =
			isSelected && hasCss
				? scopeCustomCss( sgsCustomCss, '&' ).refused
				: [];

		return (
			<>
				<BlockEdit { ...props } />
				{ isSelected && (
					<InspectorAdvancedControls>
						{ sgsCustomCssNote && (
							<Notice status="info" isDismissible={ false }>
								{ sgsCustomCssNote }
							</Notice>
						) }
						<TextareaControl
							label={ __( 'Custom CSS', 'sgs-blocks' ) }
							help={ __(
								'CSS rules applied to this block only. Use &selector for the block itself; any other selector styles elements inside it.',
								'sgs-blocks'
							) }
							value={ sgsCustomCss || '' }
							onChange={ ( val ) =>
								setAttributes( { sgsCustomCss: val } )
							}
							rows={ 6 }
							__nextHasNoMarginBottom
						/>
						{ refused.length > 0 && (
							<Notice status="warning" isDismissible={ false }>
								{ __( 'Not applied:', 'sgs-blocks' ) }{ ' ' }
								{ refused.join( '; ' ) }
							</Notice>
						) }
					</InspectorAdvancedControls>
				) }
			</>
		);
	};
}, 'withCustomCssControl' );

addFilter( 'editor.BlockEdit', 'sgs/custom-css-control', withCustomCssControl );

// Save filter - attribute is stored in block comment markup by default.
function saveCustomCssAttribute( extraProps ) {
	return extraProps;
}
addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/custom-css-save',
	saveCustomCssAttribute
);

/**
 * Canvas mirror of includes/custom-css.php: the block's wrapper carries a scope class and the CSS
 * renders through the same scoper as the page, so the canvas and the page confine and refuse the
 * same rules. The canvas's inline preview styles still win over a class rule, where the page's
 * scoped rules would lose to it by source order.
 */
const withCustomCssCanvas = createHigherOrderComponent( ( BlockListBlock ) => {
	return ( props ) => {
		const { attributes = {} } = props;
		const scope = `sgs-c-ed-${ props.clientId }`;
		const { css } = scopeCustomCss(
			attributes.sgsCustomCss,
			`.${ scope }.${ scope }`
		);
		if ( ! css ) {
			return <BlockListBlock { ...props } />;
		}
		const wrapperProps = {
			...( props.wrapperProps || {} ),
			className: [ props.wrapperProps?.className, scope ]
				.filter( Boolean )
				.join( ' ' ),
		};
		return (
			<>
				<style>{ css }</style>
				<BlockListBlock { ...props } wrapperProps={ wrapperProps } />
			</>
		);
	};
}, 'withCustomCssCanvas' );

addFilter(
	'editor.BlockListBlock',
	'sgs/custom-css-canvas',
	withCustomCssCanvas
);
