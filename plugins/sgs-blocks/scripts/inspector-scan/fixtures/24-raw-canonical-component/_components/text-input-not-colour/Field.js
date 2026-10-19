export default function Field( { value, onChange } ) {
	return <input type="text" value={ value } onChange={ ( e ) => onChange( e.target.value ) } />;
}
