public class DemoApp  {  
    static Image img;
    static void onReady(Image img) {
        System.out.println("Image is ready with dimensions: " + img.getWidth() + "x" + img.getHeight());
         //Canvas.drawImage(img, 10, 20, 0.5);
         // CodeBlocks.exit(0);
    }

    static void onFailed(Image img, String message) {
        System.err.println("Failed to load image: " + img.src + " with message: " + message);
    }

    static void onMouseEvent(MouseEventType type, Vec2D position, int buttons, boolean ctrl, boolean alt, boolean shift, boolean meta){
        System.out.println("Mouse Event: " + type + " at (" + position.x + "," + position.y + ") buttons: " + buttons);
        if (img!=null && type == MouseEventType.CLICK){
            Canvas.drawImage(img, position, 0.5, new Vec2D(0.5, 1));
        }
    }

    static void onKeyEvent(KeyEventType type, boolean ctrl, boolean alt, boolean shift, boolean meta, String key, String code, int keyCode, Vec2D position, int buttons){
        System.out.println("Key Event: " + type + " key: " + key + " code: " + code + " keyCode: " + keyCode);
    }

    public static void main(String[] args) {
        img = new Image("/common/scene/floatingworld/img/Player1.png", DemoApp::onReady, DemoApp::onFailed);        
        Canvas.addMouseEventListener(DemoApp::onMouseEvent);
        Canvas.addKeyEventListener(DemoApp::onKeyEvent);
        Canvas.drawImage(img, new Vec2D(100, 42), 1.2);
    }
}