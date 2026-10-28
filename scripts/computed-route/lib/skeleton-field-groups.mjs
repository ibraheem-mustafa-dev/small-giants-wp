// The fields of a draft form as the skeleton counts them (Spec 48 FR-48-57). A field is one control (an input, a select, a
// textarea) or one field group: a group of choice chips the form submits (the tiles field, rule optionSetForm) or, inside a
// form, two or more radios or two or more ticks of one group (a radio field, a checkbox field). A field group is one field
// made of several controls, so the element around it holds one field, and its label, required marker and hint are that
// field's (lib/skeleton-rules.mjs::fieldContent). An element holding two different fields is no field's wrapper.
//
// A radio or checkbox group is the radios (or ticks) of one name, or of one parent or grandparent when they carry no name,
// held by their lowest common element; it is a group only when that element holds no other control and is not the form
// itself (nor the surface's root). Each option is the <label> round its control, else the control's own parent when it holds that control alone.

// m: the inventory model; view: the record view; controlBlock( e ): the field block a control is, or null; visibleControl( e ):
// a control that is no hidden input; tilesField( e ): whether the element is a chip group the form submits (rule optionSetForm,
// returning its chips) or null; inForm( e ): whether the element sits in a form; F: rules.formControl.
export function makeFieldGroups( { m, view, controlBlock, visibleControl, tilesField, inForm, F = {} } ) {
	const desc = ( e ) => m.blockKids( e ).flatMap( ( k ) => [ k, ...desc( k ) ] );
	const parentOf = ( e ) => m.byKey[ e.parentKey ] || null;
	const ancestors = ( e ) => {
		const out = [];
		for ( let p = parentOf( e ); p; p = parentOf( p ) ) {
			out.push( p );
		}
		return out;
	};
	const typeOf = ( e ) => String( e.attrs?.type || '' ).toLowerCase();
	const bound = ( v ) => /\{\{/.test( String( v ?? '' ) );
	const isFormHost = ( e ) => 'form' === view.realTag( e );

	// The words an option shows: its option element's words, else the control's aria-label or value.
	const optionOf = ( c ) => {
		const p = parentOf( c );
		const pp = p ? parentOf( p ) : null;
		const label = p && 'label' === p.tag ? p : pp && 'label' === pp.tag ? pp : null;
		const own = p && 1 === desc( p ).filter( visibleControl ).length ? p : null;
		const el = label || own || c;
		const words = ( el === c ? '' : String( el.allText ?? m.words( el ) ) ).replace( /\s+/g, ' ' ).trim() || String( c.attrs?.[ 'aria-label' ] || '' ).trim();
		const value = c.attrs?.value && ! bound( c.attrs.value ) && 'on' !== c.attrs.value ? String( c.attrs.value ) : words;
		return { el, label: words || value, value };
	};

	let choice = null;
	// Every radio and checkbox group, by the key of its group element: { kind, block, el, members, options }.
	const choiceGroups = () => {
		if ( choice ) {
			return choice;
		}
		choice = new Map();
		const buckets = new Map();
		for ( const c of m.els ) {
			const type = typeOf( c );
			const block = controlBlock( c );
			if ( 'input' !== c.tag || ! [ 'radio', 'checkbox' ].includes( type ) || ! block || block !== F.byType?.[ type ] || ! inForm( c ) ) {
				continue;
			}
			const name = c.attrs?.name && ! bound( c.attrs.name ) ? `name:${ c.attrs.name }` : `in:${ ( parentOf( parentOf( c ) || {} ) || parentOf( c ) )?.key }`;
			const key = `${ type }|${ name }`;
			buckets.set( key, [ ...( buckets.get( key ) || [] ), c ] );
		}
		for ( const members of buckets.values() ) {
			if ( members.length < 2 ) {
				continue;
			}
			const shared = ancestors( members[ 0 ] ).filter( ( a ) => members.every( ( c ) => ancestors( c ).includes( a ) ) );
			const el = shared[ 0 ];
			if ( ! el || isFormHost( el ) || ! parentOf( el ) || desc( el ).filter( visibleControl ).some( ( k ) => ! members.includes( k ) ) ) {
				continue;
			}
			const options = members.map( optionOf );
			choice.set( el.key, { kind: 'choice', block: controlBlock( members[ 0 ] ), el, members, options } );
		}
		return choice;
	};

	// The field group whose element is e: { kind ('tiles' or 'choice'), block, el, members, options }, or null.
	const groupAt = ( e ) => {
		if ( ! e ) {
			return null;
		}
		const g = choiceGroups().get( e.key );
		if ( g ) {
			return g;
		}
		const chips = tilesField( e );
		return chips ? { kind: 'tiles', block: null, el: e, members: chips, options: chips.map( ( k ) => ( { el: k } ) ) } : null;
	};
	// The field an element is: a field group's element is that field; a control is its group's field, else its own.
	const memberOf = new Map();
	const fieldOf = ( k ) => {
		if ( groupAt( k ) ) {
			return k;
		}
		if ( ! visibleControl( k ) ) {
			return null;
		}
		if ( ! memberOf.size ) {
			choiceGroups().forEach( ( g ) => g.members.forEach( ( c ) => memberOf.set( c.key, g.el ) ) );
		}
		return memberOf.get( k.key ) || k;
	};
	const seen = new Map();
	// The distinct fields an element holds (itself included).
	const fieldsIn = ( p ) => {
		if ( ! p ) {
			return new Set();
		}
		if ( ! seen.has( p.key ) ) {
			seen.set( p.key, new Set( [ p, ...desc( p ) ].map( fieldOf ).filter( Boolean ) ) );
		}
		return seen.get( p.key );
	};
	// An element that is a field: a control or a field group.
	const isField = ( k ) => visibleControl( k ) || !! groupAt( k );
	// A field's own wrapper: an element holding exactly one field, that field (or its group) a child of it or the element itself.
	const holdsField = ( p ) => !! p && 1 === fieldsIn( p ).size && ( m.blockKids( p ).some( isField ) || !! groupAt( p ) );
	return { groupAt, fieldsIn, holdsField, isField };
}
