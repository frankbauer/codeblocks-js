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

interface TickMessage extends CodeBlocksBaseMessage {
    @JSProperty
    double getTime();
    @JSProperty
    double getDelta();
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

interface TickEvent {
    void onTick(double time, double delta);
}

class Canvas {
    @JSQuery
    protected static native JsonElement getScreenSize();

    public static Int2D getScreenDimensions() {
        JsonElement el = getScreenSize();
        if (el != null && el.isObject()) {
            JsonObject obj = el.getObject();
            return new Int2D(obj.getInt("width", 0), obj.getInt("height", 0));
        }
        return new Int2D(0, 0);
    }

    private static List<MouseEvent> mouseEventListeners = new ArrayList<>();
    private static List<KeyEvent> keyEventListeners = new ArrayList<>();
    private static List<TickEvent> tickEventListeners = new ArrayList<>();

    public static void addMouseEventListener(MouseEvent listener) {
        mouseEventListeners.add(listener);
    }

    public static void addKeyEventListener(KeyEvent listener) {
        keyEventListeners.add(listener);
    }

    public static void addTickEventListener(TickEvent listener) {
        tickEventListeners.add(listener);
    }

    public static void enableTicks() {
        CodeBlocks.postMessage("enableTicks", -1);
    }

    public static void disableTicks() {
        CodeBlocks.postMessage("disableTicks", -1);
    }

    public static void setInputEventEnabled(MouseEventType type, boolean enabled) {
        CodeBlocks.postMessage(enabled ? "enableInputEvent" : "disableInputEvent", type.getEventName());
    }

    public static void setInputEventEnabled(KeyEventType type, boolean enabled) {
        CodeBlocks.postMessage(enabled ? "enableInputEvent" : "disableInputEvent", type.getEventName());
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

    @JSEvent("tick")
    private static void onTick(TickMessage msg) {
        double time = msg.getTime();
        double delta = msg.getDelta();
        tickEventListeners.forEach(listener -> listener.onTick(time, delta));
    }

    @JSEvent("input")
    private static void onInput(InputMessage msg) {
        String typeString = new String(msg.getType());
        int x = msg.getX();
        int y = msg.getY();
        int buttons = msg.getButtons();
        System.out.println("Input type: " + typeString + " x: " + x + " y: " + y);
        if (typeString.startsWith("key")) {
            KeyEventType type = null;
            for (KeyEventType t : KeyEventType.values()) {
                if (t.getEventName().equals(typeString)) { type = t; break; }
            }
            if (type != null) {
                KeyEventType finalType = type;
                String key = new String(msg.getKey() != null ? msg.getKey() : "");
                String code = new String(msg.getCode() != null ? msg.getCode() : "");
                int keyCode = msg.getKeyCode();
                keyEventListeners.forEach(l -> l.onKeyEvent(finalType, msg.getCtrl(), msg.getAlt(), msg.getShift(), msg.getMeta(), key, code, keyCode, new Vec2D(x, y), buttons));
            }
        } else {
            MouseEventType type = null;
            for (MouseEventType t : MouseEventType.values()) {
                if (t.getEventName().equals(typeString)) { type = t; break; }
            }
            if (type != null) {
                MouseEventType finalType = type;
                mouseEventListeners.forEach(l -> l.onMouseEvent(finalType, new Vec2D(x, y), buttons, msg.getCtrl(), msg.getAlt(), msg.getShift(), msg.getMeta()));
            }
        }
    }
}
