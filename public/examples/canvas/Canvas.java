class MouseInfo implements JsonObjectable {
    public final Vec2D position;
    public final int buttons;
    
    public MouseInfo(JsonObject obj) {
        JsonElement pElement = obj.get("p");
        this.position = new Vec2D(pElement.getObject());
        this.buttons = obj.getInt("b", 0);        
    }

    @Override
    public JsonElement toJsonElement() {
        JsonObject obj = new JsonObject();
        obj.put("p", position.toJsonElement());
        obj.put("b", buttons);
        return obj.toJsonElement();
    }
}

class ModifiersInfo implements JsonObjectable {
    public final boolean ctrl;
    public final boolean alt;
    public final boolean shift;
    public final boolean meta;

    public ModifiersInfo(JsonObject obj) {
        this.ctrl = obj.getBoolean("ctrl", false);
        this.alt = obj.getBoolean("alt", false);
        this.shift = obj.getBoolean("shift", false);
        this.meta = obj.getBoolean("meta", false);
    }

    @Override
    public JsonElement toJsonElement() {
        JsonObject obj = new JsonObject();
        obj.put("ctrl", ctrl);
        obj.put("alt", alt);
        obj.put("shift", shift);
        obj.put("meta", meta);
        return obj.toJsonElement();
    }
}

class KeyInfo implements JsonObjectable {
    public final String key;
    public final String code;
    public final int keyCode;

    public KeyInfo(JsonObject obj) {
        if (obj==null) {
            this.key = "";
            this.code = "";
            this.keyCode = 0;         
        } else {
            this.key = obj.getString("key", "");
            this.code = obj.getString("code", "");
            this.keyCode = obj.getInt("keyCode", 0);
        }
    }

    @Override
    public JsonElement toJsonElement() {
        JsonObject obj = new JsonObject();
        obj.put("key", key);
        obj.put("code", code);
        obj.put("keyCode", keyCode);
        return obj.toJsonElement();
    }
}   

enum MouseEventType  implements JsonObjectable{
    MOUSE_MOVE("mousemove"),
    MOUSE_DOWN("mousedown"),
    MOUSE_UP("mouseup"),
    CLICK("click"),
    MOUSE_ENTER("mouseenter"),
    MOUSE_LEAVE("mouseleave"),
    UNKNOWN("unknown");

    private final String eventName;

    MouseEventType(String eventName) {
        this.eventName = eventName;
    }

    public String getEventName() {
        return eventName;
    }

    @Override
    public JsonElement toJsonElement(){
        return JsonElement.from(eventName);
    }

    public static MouseEventType fromJsonElement(JsonElement el) {
        return fromString(el.getString(""));
    }

    public static MouseEventType fromString(String s) {
        for (MouseEventType v : values()) {
            if (v.eventName.equals(s)) return v;
        }
        return UNKNOWN;
    }

}
enum KeyEventType implements JsonObjectable{
    KEY_DOWN("keydown"),
    KEY_UP("keyup"),
    UNKNOWN("unknown");

    private final String eventName;

    KeyEventType(String eventName) {
        this.eventName = eventName;
    }

    public String getEventName() {
        return eventName;
    }

    @Override
    public JsonElement toJsonElement(){
        return JsonElement.from(eventName);
    }

    public static KeyEventType fromJsonElement(JsonElement el) {
        return fromString(el.getString(""));
    }

    public static KeyEventType fromString(String s) {
        for (KeyEventType v : values()) {
            if (v.eventName.equals(s)) return v;
        }
        return UNKNOWN;
    }
}
interface MouseEvent {
  void onMouseEvent(MouseEventType type, MouseInfo mouse, ModifiersInfo modifiers);
}

interface KeyEvent {
  void onKeyEvent(KeyEventType type, KeyInfo key, ModifiersInfo modifiers, MouseInfo mouse);
}

interface TickEvent {
    void onTick(double time, double delta);
}

class Canvas {
    @JSQuery
    private static native JsonElement getScreenSize();

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

    @JSCommand
    public static native void enableTicks();

    @JSCommand
    public static native void disableTicks();

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
    private static void onTick(double time, double delta) {
        tickEventListeners.forEach(listener -> listener.onTick(time, delta));
    }

    @JSEvent("input")
    private static void onInput(String t, MouseInfo m, ModifiersInfo d, KeyInfo k) {
        if (t.startsWith("key")) {
            KeyEventType type = KeyEventType.fromString(t);            
            if (type != null && type != KeyEventType.UNKNOWN) {
                KeyEventType finalType = type;
                String key = new String(k.key);
                String code = new String(k.code);
                int keyCode = k.keyCode;
                keyEventListeners.forEach(l -> l.onKeyEvent(finalType, k, d, m));
            }
        } else {
            MouseEventType type = MouseEventType.fromString(t);
            if (type != null && type != MouseEventType.UNKNOWN) {
                MouseEventType finalType = type;
                mouseEventListeners.forEach(l -> l.onMouseEvent(finalType, m, d));
            }
        }
    }
}
