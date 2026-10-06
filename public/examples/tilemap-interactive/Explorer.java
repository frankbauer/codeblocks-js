import de.fau.tf.lgdv.graphics.*;
import de.fau.tf.lgdv.tilemap.*;

/**
 * Explore an island in the fog: click the map, then walk with W A S D (hold two keys for a
 * diagonal step). Every call is sent to the playground right away (RPC), the tile map reports
 * back when a character finished a step.
 *
 *   W A S D    walk          click   walk to the cell
 *   T          next theme    G       show / hide the grid
 */
public class Explorer {
    static final int W = Terrain.WATER, L = Terrain.LAND;
    static final int[][] TERRAIN = {
        {W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W},
        {W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W},
        {W, W, W, L, L, L, L, L, L, L, L, W, W, W, W, W, W, W, W, W, W, W, W, L, L, L, L, L, L, L, W, W},
        {W, W, L, L, L, L, L, L, L, L, L, L, W, W, W, W, W, W, W, W, W, L, L, L, L, L, L, L, L, L, L, W},
        {W, W, L, L, L, L, L, L, L, L, L, L, L, W, W, W, W, W, W, W, L, L, L, L, L, L, L, L, L, L, L, L},
        {W, W, L, L, L, L, L, L, L, L, L, L, L, L, W, W, W, W, W, L, L, L, L, L, L, L, L, L, L, L, L, L},
        {W, W, L, L, L, L, L, L, W, W, L, L, L, L, L, W, W, W, L, L, L, L, L, W, W, W, L, L, L, L, L, L},
        {W, W, L, L, L, L, L, L, W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, L, W, W, W, L, L, L, L, L},
        {W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, W, W, L, L, W, W, L, L, L, L, L, L},
        {W, W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, W, W, L, L, L, L, L, L, L, L, L, L},
        {W, W, W, W, L, L, L, L, L, L, L, L, L, L, L, W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L},
        {W, W, W, W, W, L, L, L, L, L, L, L, W, W, W, W, W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, W},
        {W, W, W, W, W, W, L, L, L, L, L, W, W, W, W, W, W, W, W, L, L, L, L, L, L, L, L, L, L, L, W, W},
        {W, W, W, W, W, W, W, L, L, W, W, W, W, W, W, W, W, W, W, W, L, L, L, L, L, L, L, L, L, W, W, W},
        {W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, L, L, L, L, L, L, W, W, W, W, W},
        {W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, L, L, L, L, L, L, L, W, W, W, W, W},
        {W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, L, L, L, L, L, W, W, W, W, W, W},
        {W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W},
    };

    static final int __ = Decoration.NONE, PA = Decoration.PATH,
            T1 = Decoration.TREE_1, T2 = Decoration.TREE_2, TG = Decoration.TREES_1,
            FL = Decoration.FLOWERS_1, GD = Decoration.GROUND_DETAIL_1, RK = Decoration.ROCKS_1,
            RO = Decoration.ROCK_1;
    static final int[][] DECORATIONS = {
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, T1, T2, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, GD, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, T2, __, __},
        {__, __, T1, __, __, __, PA, PA, PA, PA, PA, PA, __, __, __, __, __, __, __, __, __, __, __, __, __, FL, __, __, __, __, __, __},
        {__, __, T2, __, __, __, PA, __, __, __, __, PA, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, GD, PA, __, __, __, __, PA, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, PA, __, __, __, __, PA, PA, PA, PA, PA, PA, PA, PA, PA, PA, PA, PA, PA, __, __, __, __, T1, __, __, __},
        {__, __, __, __, __, __, PA, __, __, __, __, PA, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, PA, __, __, T1, __, PA, __, __, TG, __, __, __, __, __, __, __, __, __, PA, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, PA, PA, PA, PA, PA, PA, __, __, __, __, __, __, __, __, __, __, __, __, PA, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, PA, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, T2, __, __, __, __, __, __, __, __, __, __, __, __, PA, PA, PA, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, RK, __, __, __, __, __, __, __, PA, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, PA, __, FL, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, PA, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, RO, __, __, __, __, __, __, __, __, __, __, __, __, T1, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
    };

    static TileMap map;
    static MapCharacter hero;
    static MapCharacter ship;
    static MapSprite book;
    static boolean up, down, left, right;
    static boolean grid;
    static boolean bookOpen;
    static int theme = Theme.SNOW.ordinal();

    // the ship sails around the islands
    static final int[][] SHIP_ROUTE = {{2, 16}, {12, 0}, {30, 1}, {12, 1}, {16, 14}};
    static int shipTarget = 0;

    public static void main(String[] args) {
        map = new TileMap(Theme.values()[theme], TERRAIN);
        map.setDecorations(DECORATIONS);
        map.fillFog(TileMap.FOG_DENSE);
        map.setZoom(3);

        new MapSprite(map, SpriteType.VILLAGE, 3, 7);
        new MapSprite(map, SpriteType.CASTLE, 26, 2);
        new MapSprite(map, SpriteType.ARROW, 27, 1);
        new MapSprite(map, SpriteType.VOLCANO, 26, 8);
        new MapSprite(map, SpriteType.DUCK_YELLOW, 9, 6);
        new MapSprite(map, SpriteType.SHARK, 14, 15);
        new MapSprite(map, SpriteType.LEVEL_POINT_YELLOW, 22, 15);
        book = new MapSprite(map, SpriteType.BOOK, 16, 8);

        hero = new MapCharacter(map, CharacterType.HERO, 11, 7);
        hero.setOnStep(Explorer::onHeroStep);
        hero.setOnIdle(h -> walk());
        map.follow(hero);
        map.reveal(hero.getColumn(), hero.getRow(), 3);

        ship = new MapCharacter(map, CharacterType.SHIP, 16, 14);
        ship.setOnIdle(Explorer::sailOn);
        sailOn(ship);

        map.setOnTileClicked((m, column, row) -> {
            if (!hero.goTo(column, row)) {
                System.out.println("The hero cannot reach (" + column + ", " + row + ")");
            }
        });
        Canvas.addKeyEventListener(Explorer::onKey);
        System.out.println("Click the map, then walk with W A S D.");
    }

    static void onKey(KeyEventType type, KeyInfo key, ModifiersInfo modifiers, MouseInfo mouse) {
        boolean pressed = type == KeyEventType.KEY_DOWN;
        switch (key.code) {
            case "KeyW": up = pressed; break;
            case "KeyS": down = pressed; break;
            case "KeyA": left = pressed; break;
            case "KeyD": right = pressed; break;
            case "KeyT":
                if (pressed) {
                    theme = (theme + 1) % Theme.values().length;
                    map.setTheme(Theme.values()[theme]);
                }
                return;
            case "KeyG":
                if (pressed) {
                    grid = !grid;
                    map.showGrid(grid);
                }
                return;
            default:
                return;
        }
        walk();
    }

    // one step into the direction of the held keys, called again when the step is done
    static void walk() {
        if (hero.isMoving()) {
            return;
        }
        Direction dir = Direction.of((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
        if (dir == null) {
            return;
        }
        // blocked diagonally? slide along the coast
        if (!hero.move(dir) && dir.isDiagonal()) {
            if (!hero.move(Direction.of(dir.dx, 0))) {
                hero.move(Direction.of(0, dir.dy));
            }
        }
    }

    static void onHeroStep(MapCharacter h, int column, int row) {
        map.reveal(column, row, 3);
        boolean onBook = row == book.getRow() && column >= book.getColumn() && column < book.getColumn() + 2;
        if (onBook != bookOpen) {
            bookOpen = onBook;
            book.play(onBook ? Animation.OPEN : Animation.CLOSE);
        }
        if (column == 22 && row == 15) {
            System.out.println("You found the yellow level point!");
        }
    }

    static void sailOn(MapCharacter s) {
        int[] target = SHIP_ROUTE[shipTarget];
        shipTarget = (shipTarget + 1) % SHIP_ROUTE.length;
        s.pause(1);
        s.goTo(target[0], target[1]);
    }
}
