# Golden conformance — per-type, per-axis categorisation

Generated 2026-08-20T10:50Z from `survey-golden-conformance.js --json` at `52fd4010`.

Done-when (session-c-floofy-dahl.md:238): *every type reports real CONFORMANT/VIOLATION/MISSING/
NOT-APPLICABLE verdicts, not N/A — N/A across a whole type means the shape is wrong.*

```
type               axis               CONFORM  VIOLATI  MISSING  NOT-APP  UNCLEAR      N/A
  colour           canonical               63        1       13        6        .        .
  colour           nativeUi                58       25        .        .        .        .
  colour           bannedLookalikes        83        .        .        .        .        .
  colour           hoverMechanism           8        .        .        .        9       66
  colour           gradient                25       58        .        .        .        .
  link             canonical               11        .        .       72        .        .
  link             nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  link             bannedLookalikes        83        .        .        .        .        .
  enum             canonical               75        .        .        8        .        .
  enum             bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  length-unit      canonical                .       48       11       24        .        .
  length-unit      nativeUi                33       50        .        .        .        .
  length-unit      bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  box-4value       canonical               50        8        2       23        .        .
  box-4value       nativeUi                33       50        .        .        .        .
  box-4value       bannedLookalikes        72       11        .        .        .        .
  state            canonical                .        .        .        .        .       83   <== SHAPE WRONG
  state            nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  state            bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  state            hoverMechanism           8        .        .        .        9       66
  media            canonical                9        .        .       74        .        .
  media            nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  media            bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  boolean          canonical               66        .        .       17        .        .
  boolean          bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  free-text        canonical               74        .        .        9        .        .
  free-text        bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  icon             canonical               12        .        .       71        .        .
  icon             bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  shadow           canonical               15       17        .       51        .        .
  shadow           nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  shadow           bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  responsive-wrappercanonical               59        .        .       24        .        .
  responsive-wrappernativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  responsive-wrapperbannedLookalikes        83        .        .        .        .        .
  border           canonical               52        6        8       17        .        .
  border           nativeUi                34       49        .        .        .        .
  border           bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  typography       canonical               16       33       18       16        .        .
  typography       nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  typography       bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  alignment        canonical                .        .        .        .        .       83   <== SHAPE WRONG
  alignment        nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  alignment        bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  multi-select     canonical                1        .        .       82        .        .
  multi-select     bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  date             canonical                .        .        .       83        .        .
  date             bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  repeater         canonical                1        .        .       82        .        .
  repeater         nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  repeater         bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  animation        canonical                .        .        .        .        .       83   <== SHAPE WRONG
  animation        nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  animation        bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  angle-position   canonical                1        .        .       82        .        .
  angle-position   nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  angle-position   bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG
  preset           canonical                .        .        .        .        .       83   <== SHAPE WRONG
  preset           nativeUi                 .        .        .        .        .       83   <== SHAPE WRONG
  preset           bannedLookalikes         .        .        .        .        .       83   <== SHAPE WRONG

32 axis-cells are N/A across the WHOLE type = the shape is wrong for those.
```
