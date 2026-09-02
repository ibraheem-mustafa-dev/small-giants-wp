/**
 * Atom: MEANING (control half) — the editor UI.
 *
 * JSX + `@wordpress/components` live ONLY here, per the atom contract
 * (`scripts/check-media-atom-purity.js`). The pure logic — `resolveMediaType()`,
 * `altBaseFor()`, `disclosure()`, `validate()`, `css()` — lives in `meaning.js`
 * and is imported from there rather than duplicated.
 *
 * @package SGS\Blocks
 */
import { CheckboxControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { altBaseFor, resolveMediaType } from './meaning.js';

/**
 * Bare control rows: the decorative toggle, then the alt-text field. Never
 * its own `<InspectorControls>` — the caller mounts these inside its own
 * panel.
 *
 * @param {Object}   ctx
 * @param {Object}   ctx.attributes
 * @param {Function} ctx.setAttributes
 * @param {string}   ctx.prefix
 * @param {string}   ctx.blockSlug
 * @return {JSX.Element[]} Two rows: decorative toggle, alt text.
 */
export function control( { attributes, setAttributes, prefix, blockSlug } ) {
	const attrs = attributes || {};
	const name = ( base ) => mediaStoredAttrName( blockSlug, prefix, base );
	const type = resolveMediaType( attrs, prefix, blockSlug );
	const altKey = name( altBaseFor( type ) );
	const decorativeKey = name( 'ImageDecorative' );
	const isDecorative = !! attrs[ decorativeKey ];

	return [
		<CheckboxControl
			key="meaning-decorative"
			label={ __( 'Decorative — hide from screen readers', 'sgs-blocks' ) }
			checked={ isDecorative }
			onChange={ ( checked ) =>
				setAttributes( { [ decorativeKey ]: !! checked } )
			}
		/>,
		<TextControl
			key="meaning-alt"
			label={ __( 'Alt text', 'sgs-blocks' ) }
			help={
				isDecorative
					? __(
							'Disabled — this media is marked decorative.',
							'sgs-blocks'
					  )
					: __(
							'Pre-filled from the picked image\'s own description — only change it if this instance means something different (the same photo can be informative in one place and purely decorative in another).',
							'sgs-blocks'
					  )
			}
			value={ attrs[ altKey ] || '' }
			disabled={ isDecorative }
			onChange={ ( value ) => setAttributes( { [ altKey ]: value } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>,
	];
}
