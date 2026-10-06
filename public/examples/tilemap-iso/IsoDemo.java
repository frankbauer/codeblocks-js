import de.fau.tf.lgdv.graphics.Color;
import de.fau.tf.lgdv.tilemap.*;

/**
 * An isometric map with all isometric sprites. Click a cell: the figure walks there, a click on
 * a snowman sends a sun ray that melts it.
 */
public class IsoDemo {
    static TileMap map;
    static MapCharacter hero;
    static MapSprite[][] snowmen;

    public static void main(String[] args) {
        map = new TileMap(Theme.SNOW, 10, 8, Projection.ISOMETRIC);
        map.fillTerrain(7, 5, 9, 7, Terrain.WATER);
        map.showCoordinates(true);
        snowmen = new MapSprite[map.rows][map.columns];

        // the six huts along the back, trees and rocks in every variant
        for (int i = 0; i < SpriteType.HUT.variants; i++) {
            block(new MapSprite(map, SpriteType.HUT, i + 2, 0, i));
        }
        block(new MapSprite(map, SpriteType.TREES, 0, 1));
        block(new MapSprite(map, SpriteType.TREES, 0, 2));
        block(new MapSprite(map, SpriteType.STONES, 9, 1));
        block(new MapSprite(map, SpriteType.STONES, 6, 6));

        // a fire that ignites and keeps burning, and snow clouds
        MapSprite fire = new MapSprite(map, SpriteType.FIRE, 2, 3);
        block(fire);
        fire.setOnAnimationEnded((sprite, animation) -> sprite.play("burning"));
        fire.play("ignite");
        MapSprite snow = new MapSprite(map, SpriteType.SNOW, 7, 2, 3);
        snow.play("snowing", true);

        // snowmen in all variants
        for (int v = 0; v < SpriteType.SNOWMAN_XMAS.variants; v++) {
            snowmen[4][v] = new MapSprite(map, SpriteType.SNOWMAN_XMAS, v, 4, v);
        }
        for (int v = 0; v < SpriteType.SNOWMAN.variants; v++) {
            snowmen[6][v] = new MapSprite(map, SpriteType.SNOWMAN, v, 6, v);
        }

        hero = new MapCharacter(map, CharacterType.FIGURE_BLUE_BIG, 1, 2);
        hero.setOnStep((h, column, row) -> map.flashCell(column, row));
        MapCharacter grinch = new MapCharacter(map, CharacterType.FIGURE_GRINCH_LOADED, 9, 3);
        grinch.setOnIdle(g -> {
            g.pause(0.5);
            g.goTo(g.getColumn() == 9 ? 4 : 9, 3);
        });
        grinch.goTo(4, 3);

        map.setOnTileClicked(IsoDemo::clicked);
        System.out.println("Click a cell to walk there, or a snowman to melt it.");
    }

    static void clicked(TileMap m, int column, int row) {
        MapSprite snowman = snowmen[row][column];
        if (snowman != null) {
            map.sunRay(column, row);
            snowman.play("melt");
            map.tintCell(column, row, new Color(0.35, 0.6, 0.8, 0.5), 1.4);
            snowmen[row][column] = null;
        } else if (!hero.goTo(column, row)) {
            System.out.println("Cannot go to " + column + " / " + row);
        }
    }

    static void block(MapSprite sprite) {
        map.setBlocked(sprite.getColumn(), sprite.getRow(), true);
    }
}
