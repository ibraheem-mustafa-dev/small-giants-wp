/**
 * sgs/account — the icon inside the sign-in and create-account buttons.
 *
 * One panel per button, the same controls as sgs/button's icon (picker, side, size, gap, circle diameter); the icon
 * colour and circle fill are colour rows (extraColourRows in OrdersPanel.js). The icon prints server-side onto
 * WooCommerce's own button (includes/account/helpers-account-button-icon.php), so the canvas preview is the
 * block's server render.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import {
	IconPicker,
	ResponsiveOverride,
	SgsLengthControl,
} from '../../components';
import { Choice } from './extraControls';

const POSITIONS = [
	{ label: __( 'After the label (default)', 'sgs-blocks' ), value: '' },
	{ label: __( 'Before the label', 'sgs-blocks' ), value: 'before' },
];

/**
 * @param {Object}   props               Panel props.
 * @param {string}   props.prefix        Attribute prefix, 'loginButton' or 'registerButton'.
 * @param {string}   props.title         Panel title.
 * @param {Node}     props.gap           The per-device gap control (written out per button, so each mount names its own setting).
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The icon panel for one button.
 */
function ButtonIconPanel( { prefix, title, gap, attributes, setAttributes } ) {
	const icon = attributes[ prefix + 'Icon' ];
	const sizeName = prefix + 'IconSize';
	const shapeName = prefix + 'IconShapeSize';
	const p = { attributes, setAttributes };
	return (
		<PanelBody title={ title } initialOpen={ false }>
			<IconPicker
				label={ __( 'Icon', 'sgs-blocks' ) }
				sources={ [ 'lucide' ] }
				value={ icon ? { source: 'lucide', name: icon } : null }
				onChange={ ( val ) =>
					setAttributes( {
						[ prefix + 'Icon' ]: val ? val.name : '',
					} )
				}
			/>
			{ icon && (
				<>
					<Choice
						{ ...p }
						name={ prefix + 'IconPosition' }
						label={ __( 'Icon position', 'sgs-blocks' ) }
						options={ POSITIONS }
					/>
					<ResponsiveOverride
						label={ __( 'Icon size (px)', 'sgs-blocks' ) }
						value={ attributes[ sizeName ] }
						onChange={ ( obj ) =>
							setAttributes( { [ sizeName ]: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<RangeControl
								label={ __( 'Icon size (px)', 'sgs-blocks' ) }
								hideLabelFromVision
								value={
									ownValue ||
									( inherited ? effectiveValue : 16 ) ||
									16
								}
								onChange={ ( val ) => setOwnValue( val ) }
								min={ 8 }
								max={ 100 }
								step={ 1 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					{ gap }
					<ResponsiveOverride
						label={ __( 'Icon circle size (px)', 'sgs-blocks' ) }
						value={ attributes[ shapeName ] }
						onChange={ ( obj ) =>
							setAttributes( { [ shapeName ]: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<RangeControl
								label={ __(
									'Icon circle size (px)',
									'sgs-blocks'
								) }
								hideLabelFromVision
								help={ __(
									'Shows once an icon circle colour is set (Colours panel). Empty = 1.8 times the icon size.',
									'sgs-blocks'
								) }
								value={
									ownValue ||
									( inherited ? effectiveValue : 0 ) ||
									0
								}
								onChange={ ( val ) => setOwnValue( val || '' ) }
								min={ 0 }
								max={ 200 }
								step={ 1 }
								allowReset
								resetFallbackValue={ 0 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</>
			) }
		</PanelBody>
	);
}

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Both button icon panels.
 */
export default function ButtonIconPanels( { attributes, setAttributes } ) {
	const loginGap = (
		<ResponsiveOverride
			label={ __( 'Icon gap', 'sgs-blocks' ) }
			value={ attributes.loginButtonIconGap }
			onChange={ ( obj ) => setAttributes( { loginButtonIconGap: obj } ) }
		>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					label={ __( 'Icon gap', 'sgs-blocks' ) }
					hideLabelFromVision
					value={ ownValue }
					placeholder={ inherited ? effectiveValue : '' }
					onChange={ setOwnValue }
				/>
			) }
		</ResponsiveOverride>
	);
	const registerGap = (
		<ResponsiveOverride
			label={ __( 'Icon gap', 'sgs-blocks' ) }
			value={ attributes.registerButtonIconGap }
			onChange={ ( obj ) =>
				setAttributes( { registerButtonIconGap: obj } )
			}
		>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					label={ __( 'Icon gap', 'sgs-blocks' ) }
					hideLabelFromVision
					value={ ownValue }
					placeholder={ inherited ? effectiveValue : '' }
					onChange={ setOwnValue }
				/>
			) }
		</ResponsiveOverride>
	);
	return (
		<>
			<ButtonIconPanel
				prefix="loginButton"
				title={ __( 'Sign in button icon', 'sgs-blocks' ) }
				gap={ loginGap }
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<ButtonIconPanel
				prefix="registerButton"
				title={ __( 'Create account button icon', 'sgs-blocks' ) }
				gap={ registerGap }
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
		</>
	);
}
