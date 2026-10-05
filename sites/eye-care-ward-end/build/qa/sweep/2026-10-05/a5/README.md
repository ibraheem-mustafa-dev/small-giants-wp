# A5 live proof (2026-10-05, from 1ea514ae8's deployed build)

| Check | Command | Result |
|---|---|---|
| Framework fixes S3, S4, S5, S11 | `SGS_HEADED=1 node sites/eye-care-ward-end/build/qa/framework-fix-check.mjs` | PASS: 37 checks, 0 FAIL (`framework-fix-check.txt`) |
| About, independent of the walker | `node sites/eye-care-ward-end/build/qa/independent-check.mjs --surface about` | PASS: 24 items, 0 differences |
| Contact, independent of the walker | `node sites/eye-care-ward-end/build/qa/independent-check.mjs --surface contact` | FAIL: 106 rows. 9 are a check artefact (off-screen screen-reader text read as painted, `padding.left` near -9999), 9 are blocks the draft lacks (`cr-ref-contact-32`...), 88 are box and padding differences on about 15 blocks (28 on `cr-ref-contact-28`). The walker finds 27 distinct Contact issues; the disagreement goes to Session B. None contradicts Contact's clean items (126/137 width, 127/138, N44 top padding). |
| Sticky header (CR2), drawer stagger (14) | `node behaviour-check.mjs` (headed) | Header sticks (top 42 to 0 after 1600px); no `is-header-scrolled` class seen, so CR2 stays to prove. Drawer links are all at opacity 1 at 60ms after opening: no fade entrance, 14 still open (the rise was not sampled). |

Hover items are measured by the walker itself (`scripts/parity/lib/devtools.mjs::forcedHover`); their statuses are in the register's Sweep column.
