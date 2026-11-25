// The sites the route's shop fixtures may be written to: fresh test sites that hold no client content. shop-fixtures.mjs refuses
// --apply anywhere else, and the foundation command's catalogue step runs only on one of them.
export const FIXTURE_SITES = [ 'eye-care-clone-test', 'local-mamas', 'local-eye-care' ];
