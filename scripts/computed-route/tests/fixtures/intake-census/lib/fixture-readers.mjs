// Fixture readers for the census controls (Spec 48 FR-48-24): one that reads every construct, one that throws and one
// that returns nothing.

// Returns a non-empty result naming the construct.
export function readAny( row ) {
	return { kind: row.kind, draftId: row.draftId };
}

// Throws for every construct (control 3).
export function readThrows( row ) {
	throw new Error( `fixture reader cannot read ${ row.draftId }` );
}

// Returns nothing for a construct it claims (control 4).
export function readEmpty() {
	return null;
}
