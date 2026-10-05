# Snow meadow sprite sheets

Sprite sheets for the isometric snow meadow scene, built from the single frames in
`assets/snowman`, `assets/trees` and `assets/stones`. Use them with `@assets/snowmeadow/...`.

## `snowman.webp` (2700 x 265)

Melting snowman, 30 columns x 5 rows of 90 x 53 px frames.

- Row `v` (0..4) is the variant `assets/snowman/melting_*_0v.png`.
- Column `c` (0..29) is frame `melting_<2c+1>_0v.png` (every second frame: 1, 3, ..., 59).

Frame index for `Sprite` is `v * 30 + c`, e.g. `new Sprite(sheet, 90, 53, v * 30, 30, 21, false)`.

## `deko.webp` (540 x 59)

Decoration, 6 frames of 90 x 59 px:

| Frame | Source                   |
| ----- | ------------------------ |
| 0     | `trees/tree_0001.png`    |
| 1     | `trees/tree_0005.png`    |
| 2     | `trees/tree_0012.png`    |
| 3     | `stones/stone_0001.png`  |
| 4     | `stones/stone_0004.png`  |
| 5     | `stones/stone_0007.png`  |
