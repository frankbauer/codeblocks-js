import de.fau.tf.lgdv.runtime.CommandBuffer;
import de.fau.tf.lgdv.tilemap.*;

/**
 * Builds a tile map and moves characters with method calls. All calls are recorded in a
 * CommandBuffer (command queue) and played back by the tileMap library after main() ended.
 */
public class MapDemo {
    // try Theme.BEACH, Theme.DESERT or Theme.SNOW
    static final Theme THEME = Theme.VALLEY;

    static final int W = Terrain.WATER, L = Terrain.LAND;
    static final int[][] TERRAIN = {
        {W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W},
        {W, W, W, W, L, L, L, L, L, L, L, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W},
        {W, W, W, L, L, L, L, L, L, L, L, L, L, W, W, W, W, L, L, L, L, L, L, L, W, W},
        {W, W, L, L, L, L, L, L, L, L, L, L, L, L, W, W, L, L, L, L, L, L, L, L, L, W},
        {W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, W, L, L, L, L, L, L, L, L, L, W},
        {W, W, L, L, L, L, L, L, W, W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, L, W},
        {W, W, L, L, L, L, L, L, W, W, W, L, L, L, L, L, L, W, W, L, L, L, L, L, L, W},
        {W, W, L, L, L, L, L, L, W, W, L, L, L, L, L, L, W, W, W, W, L, L, L, L, L, W},
        {W, W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, L, W, W, L, L, L, L, L, W, W},
        {W, W, W, W, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, W, W},
        {W, W, W, W, W, L, L, L, L, L, L, L, W, W, L, L, L, L, L, L, L, L, L, W, W, W},
        {W, W, W, W, W, W, L, L, L, L, L, W, W, W, W, W, L, L, L, L, L, L, W, W, W, W},
        {W, W, W, W, W, W, W, W, L, L, W, W, W, W, W, W, W, W, L, L, W, W, W, W, W, W},
        {W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W},
    };

    static final int __ = Decoration.NONE, PA = Decoration.PATH,
            T1 = Decoration.TREE_1, T2 = Decoration.TREE_2, TG = Decoration.TREES_1,
            FL = Decoration.FLOWERS_1, GD = Decoration.GROUND_DETAIL_1, RK = Decoration.ROCKS_1;
    static final int[][] DECORATIONS = {
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, T1, T2, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, GD, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, T1, __, __, __, __, PA, PA, PA, PA, PA, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, T2, __, __, __, PA, __, FL, __, __, PA, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, GD, PA, __, __, __, __, PA, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, FL, __, PA, PA, __, __, __, __, PA, __, __, TG, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, PA, __, __, __, __, __, PA, __, __, __, __, __, __, __, __, __, FL, __, __, __, __},
        {__, __, __, __, __, PA, __, __, __, __, __, PA, __, __, __, __, __, __, __, __, __, __, T1, __, __, __},
        {__, __, __, __, __, PA, PA, PA, PA, PA, PA, PA, PA, __, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, T1, __, __, __, __, __, __, __, __, __, __, GD, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, T2, __, __, __, __, __, __, __, FL, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, __, __, RK, __, __, __, __, __, __, __, __, __, __, __, __},
        {__, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __, __},
    };

    public static void main(String[] args) {
        // record all tile map commands instead of sending them one by one
        CommandBuffer commands = new CommandBuffer();
        commands.activate();

        TileMap map = new TileMap(THEME, TERRAIN);
        map.setDecorations(DECORATIONS);

        new MapSprite(map, SpriteType.VILLAGE, 5, 2);
        new MapSprite(map, SpriteType.CASTLE, 12, 7);
        new MapSprite(map, SpriteType.VOLCANO, 19, 2);
        new MapSprite(map, SpriteType.ARROW, 13, 6);
        new MapSprite(map, SpriteType.LEVEL_POINT_RED, 6, 4);
        new MapSprite(map, SpriteType.LEVEL_POINT_YELLOW, 12, 9);
        new MapSprite(map, SpriteType.DUCK_BROWN, 9, 6);
        MapSprite book = new MapSprite(map, SpriteType.BOOK, 17, 9);
        book.play("open");
        MapSprite shark = new MapSprite(map, SpriteType.SHARK_SWIMMING, 0, 13);
        shark.moveTo(14, 13, 8);

        // the hero follows the path from the red to the yellow level point ...
        MapCharacter hero = new MapCharacter(map, CharacterType.HERO, 6, 4);
        hero.moveDown();
        hero.moveDown();
        hero.moveLeft();
        hero.move(Direction.S, 3);
        hero.move(Direction.E, 7);
        hero.face(Direction.N);
        hero.pause(1);
        // ... walks to the other island and makes a round in all four diagonal directions
        hero.goTo(20, 9);
        hero.moveNE();
        hero.moveSE();
        hero.moveSW();
        hero.moveNW();
        System.out.println("Hero ends at (" + hero.getColumn() + ", " + hero.getRow() + ")");

        // the ship can only move on water
        MapCharacter ship = new MapCharacter(map, CharacterType.SHIP, 0, 12);
        ship.move(Direction.E, 6);
        ship.moveSE();
        ship.move(Direction.E, 12);
        if (!ship.moveUp()) {
            System.out.println("The ship cannot sail onto land at (" + ship.getColumn() + ", " + (ship.getRow() - 1) + ")");
        }
        ship.goTo(25, 4);
        System.out.println("Ship ends at (" + ship.getColumn() + ", " + ship.getRow() + ")");

        // hand everything to the playground
        commands.sendCommands();
    }
}
