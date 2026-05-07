public class DemoApp  {  
    static Image img;
    static void onReady(Image img) {
        System.out.println("Image is ready with dimensions: " + img.getWidth() + "x" + img.getHeight());
    }

    static void onFailed(Image img, String message) {
        System.err.println("Failed to load image: " + img.src + " with message: " + message);
    }

    static void onMouseEvent(MouseEventType type, MouseInfo mouse, ModifiersInfo modifiers){
        System.out.println("Mouse Event: " + type + " at (" + mouse.position.x + "," + mouse.position.y + ") buttons: " + mouse.buttons);
        if (img!=null && type == MouseEventType.MOUSE_DOWN) {
            Canvas.drawImage(img, mouse.position, 0.5, new Vec2D(0.5, 1));
        }
    }

    static void onKeyEvent(KeyEventType type, KeyInfo key, ModifiersInfo modifiers, MouseInfo mouse){
        System.out.println("Key Event: " + type + " key: " + new String(key.key) + " code: " + new String(key.code) + " keyCode: " + key.keyCode);
    }

    static void onTick(double time, double delta) {
        System.out.println("Tick: time=" + time + " delta=" + delta);
    }

    public static void main(String[] args) {
        System.out.println("DemoApp started: " + CodeBlocks.getVersion());
        img = new Image("/common/scene/floatingworld/img/Player1.png", DemoApp::onReady, DemoApp::onFailed);        
        Canvas.addMouseEventListener(DemoApp::onMouseEvent);
        Canvas.addKeyEventListener(DemoApp::onKeyEvent);
        Canvas.addTickEventListener(DemoApp::onTick);
        
        //img.waitForReady();
        System.out.println("Width: " + img.getWidth());
   
        Int2D size = Canvas.getScreenDimensions(); 
        System.out.println("Canvas size: " + size.x + "x" + size.y);

        Canvas.drawImage(img, new Vec2D(100, 42), 1.2);
        //Canvas.enableTicks();
        // int guests = 0;
        // int maxGuests = (int)(Math.random() * 50);
        // System.out.println(maxGuests/guests);
    }
}
