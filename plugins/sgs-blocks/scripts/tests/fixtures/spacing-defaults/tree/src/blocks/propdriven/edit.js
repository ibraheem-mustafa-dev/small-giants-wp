import TierBox from '../../shared/TierBox';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<TierBox attr="padding" label="Padding" attributes={ attributes } setAttributes={ setAttributes } />
			<TierBox attr="cardMargin" label="Card margin" attributes={ attributes } setAttributes={ setAttributes } />
		</>
	);
}
