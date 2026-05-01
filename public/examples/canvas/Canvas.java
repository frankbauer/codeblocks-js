interface InputMessage extends CodeBlocksBaseMessage {
    @JSProperty
    String getType();

    @JSProperty
    int getX();

    @JSProperty
    int getY();

    @JSProperty
    int getButtons();

    @JSProperty
    boolean getCtrl();

    @JSProperty
    boolean getAlt();

    @JSProperty
    boolean getShift();

    @JSProperty
    boolean getMeta();

    @JSProperty
    String getKey();

    @JSProperty
    String getCode();

    @JSProperty
    int getKeyCode();
}


enum MouseEventType {
    MOUSE_MOVE("mousemove"),
    MOUSE_DOWN("mousedown"),
    MOUSE_UP("mouseup"),
    CLICK("click"),
    MOUSE_ENTER("mouseenter"),
    MOUSE_LEAVE("mouseleave");

    private final String eventName;

    MouseEventType(String eventName) {
        this.eventName = eventName;
    }

    public String getEventName() {
        return eventName;
    }
}
enum KeyEventType {
    KEY_DOWN("keydown"),
    KEY_UP("keyup");

    private final String eventName;

    KeyEventType(String eventName) {
        this.eventName = eventName;
    }

    public String getEventName() {
        return eventName;
    }
} 
interface MouseEvent {
  void onMouseEvent(MouseEventType type, Vec2D position, int buttons, boolean ctrl, boolean alt, boolean shift, boolean meta);
}

interface KeyEvent {
  void onKeyEvent(KeyEventType type, boolean ctrl, boolean alt, boolean shift, boolean meta, String key, String code, int keyCode, Vec2D position, int buttons);
}

class Canvas {
    private static List<MouseEvent> mouseEventListeners = new ArrayList<>();
    private static List<KeyEvent> keyEventListeners = new ArrayList<>();

    public static void addMouseEventListener(MouseEvent listener) {
        mouseEventListeners.add(listener);
    }

    public static void addKeyEventListener(KeyEvent listener) {
        keyEventListeners.add(listener);
    }
    public static void drawImage(Image img, Vec2D position) {
        img.draw( position, 1.0);
    }

    public static void drawImage(Image img, Vec2D position, Vec2D anchor) {
        img.draw( position, 1.0, anchor);
    }

    public static void drawImage(Image img, Vec2D position, double scale) {
        img.draw( position, scale);
    }

    public static void drawImage(Image img, Vec2D position, double scale, Vec2D anchor) {
        img.draw( position, scale, anchor);
    }

    public static void drawImage(Image img, Vec2D position, Int2D size) {
        img.draw(position, size);
    }

    protected static void onMessage(CodeBlocksBaseMessage msg) {
        switch (msg.getCommand()) {
            case "input":
                InputMessage input = (InputMessage) msg.cast();
                String typeString = new String(input.getType());
                int x = input.getX();
                int y = input.getY();     
                int buttons = input.getButtons();          
                System.out.println("Input" + " type: " + typeString + " x: " + x + " y: " + y);
                if (typeString.startsWith("key")) {
                    KeyEventType type = null;
                    for (KeyEventType t : KeyEventType.values()) {
                        if (t.getEventName().equals(typeString)) {
                            type = t;
                            break;
                        }
                    }
                    if (type != null) {
                        KeyEventType finalType = type;
                        String key = new String(input.getKey() != null ? input.getKey() : "");
                        String code = new String(input.getCode() != null ? input.getCode() : "");
                        int keyCode = input.getKeyCode();
                        keyEventListeners.forEach(listener -> listener.onKeyEvent(finalType, input.getCtrl(), input.getAlt(), input.getShift(), input.getMeta(), key, code, keyCode, new Vec2D(x, y), buttons));
                    }
                } else {
                    MouseEventType type = null;
                    for (MouseEventType t : MouseEventType.values()) {
                        if (t.getEventName().equals(typeString)) {
                            type = t;
                            break;
                        }
                    }
                    if (type != null) {
                        MouseEventType finalType = type;
                        mouseEventListeners.forEach(listener -> listener.onMouseEvent(finalType, new Vec2D(x, y), buttons, input.getCtrl(), input.getAlt(), input.getShift(), input.getMeta()));
                    }
                }
                break;
            default:
                System.out.println("Unknown command: " + msg.getCommand() + " with id: " + msg.getId());
        }
    }  

    static {
      CodeBlocks.startReceivingEvents(Canvas::onMessage);
    }
}