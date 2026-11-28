// The sites the route's shop fixtures may be written to: fresh test sites that hold no client content. shop-fixtures.mjs refuses
// --apply anywhere else, and the foundation command's fixtures step runs only on one of them. The client's own products (catalogue.json)
// are made on any site by the foundation's catalogue step (site-build.mjs --catalogue).
export const FIXTURE_SITES = [ 'eye-care-clone-test', 'local-mamas', 'local-eye-care' ];
