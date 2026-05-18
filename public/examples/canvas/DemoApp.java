public class DemoApp  {  
    static Image img;
    static Div panel;
    static Div badge;
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

        panel = new Div("Hello Div", "demo-panel");
        panel.setPosition(new Vec2D(16, 16));
        panel.setSize(new Vec2D(300, 140));
        panel.setBackground(new Color(0.11, 0.16, 0.28, 0.88));
        panel.setBorderWidth(2);
        panel.setBorderType(Div.BorderType.SOLID);
        panel.setBorderColor(new Color(0.45, 0.70, 1.0, 1.0));
        panel.setRoundness(12);
        panel.setShadow(0, 8, 20, 0, new Color(0.0, 0.0, 0.0, 0.35));
        panel.setMarkdown("## Div Example\n- Typed styling\n- Strict markdown\n- Child divs");

        badge = new Div("CHILD", panel);
        badge.setPosition(new Vec2D(190, 96));
        badge.setSize(new Vec2D(90, 28));
        badge.setBackground(new Color(1.0, 0.73, 0.2, 1.0));
        badge.setBorderWidth(1);
        badge.setBorderType(Div.BorderType.SOLID);
        badge.setBorderColor(new Color(0.75, 0.45, 0.0, 1.0));
        badge.setRoundness(6);
        badge.setText("child div");

        Canvas.drawImage(img, new Vec2D(100, 42), 1.2);
        //Canvas.enableTicks();
        // int guests = 0;
        // int maxGuests = (int)(Math.random() * 50);
        // System.out.println(maxGuests/guests);
    }
}
