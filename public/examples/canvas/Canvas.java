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

class Color implements JsonObjectable {
    public final int r, g, b;
    public final double a;

    public Color(int r, int g, int b) {
        this(r, g, b, 1.0);
    }

    public Color(int r, int g, int b, double a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = (a < 0) ? 0 : (a > 1 ? 1 : a);
    }

    public String toRgbaString() {
        return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    }

    @Override
    public JsonElement toJsonElement() {
        return JsonElement.from(toRgbaString());
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

    @JSCommand
    public static native void setTickMode(boolean enabled);

    @JSCommand
    public static native void clear();

    public static void clear(Color color) {
        CodeBlocks.postMessage("clear", color.toRgbaString());
    }

    public static void setInputEventEnabled(MouseEventType type, boolean enabled) {
        CodeBlocks.postMessage(enabled ? "enableInputEvent" : "disableInputEvent", type.getEventName());
    }

    public static void setInputEventEnabled(KeyEventType type, boolean enabled) {
        CodeBlocks.postMessage(enabled ? "enableInputEvent" : "disableInputEvent", type.getEventName());
    }

    @JSCommand
    public static native void setStrokeStyle(String style);
    public static void setStrokeStyle(Color color) { setStrokeStyle(color.toRgbaString()); }

    @JSCommand
    public static native void setFillStyle(String style);
    public static void setFillStyle(Color color) { setFillStyle(color.toRgbaString()); }

    @JSCommand
    public static native void setLineWidth(double width);

    @JSCommand
    public static native void setFont(String font);

    @JSCommand
    public static native void setTextAlign(String align);

    @JSCommand
    public static native void beginPath();

    @JSCommand
    public static native void closePath();

    @JSCommand
    public static native void stroke();

    @JSCommand
    public static native void fill();

    @JSCommand
    public static native void moveTo(double x, double y);

    @JSCommand
    public static native void lineTo(double x, double y);

    @JSCommand
    public static native void fillRect(double x, double y, double w, double h);

    @JSCommand
    public static native void strokeRect(double x, double y, double w, double h);

    @JSCommand
    public static native void clearRect(double x, double y, double w, double h);

    @JSCommand
    public static native void arc(double x, double y, double radius, double startAngle, double endAngle, boolean anticlockwise);

    @JSCommand
    public static native void fillText(String text, double x, double y);

    @JSCommand
    public static native void strokeText(String text, double x, double y);

    @JSCommand
    public static native void save();

    @JSCommand
    public static native void restore();

    @JSCommand
    public static native void translate(double x, double y);

    @JSCommand
    public static native void rotate(double angle);

    @JSCommand
    public static native void scale(double x, double y);

    public static void line(double x1, double y1, double x2, double y2) {
        beginPath();
        moveTo(x1, y1);
        lineTo(x2, y2);
        stroke();
    }

    public static void rectangle(double x1, double y1, double x2, double y2, boolean fill) {
        double x = Math.min(x1, x2);
        double y = Math.min(y1, y2);
        double w = Math.abs(x2 - x1);
        double h = Math.abs(y2 - y1);
        if (fill) fillRect(x, y, w, h);
        else strokeRect(x, y, w, h);
    }

    public static void circle(double x, double y, double radius, boolean fill) {
        beginPath();
        arc(x, y, radius, 0, Math.PI * 2, false);
        if (fill) fill();
        else stroke();
    }

    public static void circle(double x1, double y1, double x2, double y2, boolean fill) {
        double dx = x2 - x1;
        double dy = y2 - y1;
        double radius = Math.sqrt(dx * dx + dy * dy);
        circle(x1, y1, radius, fill);
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
