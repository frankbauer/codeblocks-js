class Image extends RemoteObject {
    public interface OnReady { void onReady(Image img); }
    public interface OnFailed { void onFailed(Image img, String message); }

    public final String src;
    private final OnReady onReadyCallback;
    private final OnFailed onFailedCallback;
    private int width;
    private int height;

    public Image(String src) { this(src, null, null); }
    public Image(String src, OnReady onReadyCallback) { this(src, onReadyCallback, null); }
    public Image(String src, OnReady onReadyCallback, OnFailed onFailedCallback) {
        super("IMAGE");
        this.src = src;
        this.onReadyCallback = onReadyCallback;
        this.onFailedCallback = onFailedCallback;
        this.sendNew();
        this.waitForReady();
    }

    public boolean isReady() { return this.didReceiveReady(); }

    @Override
    protected void onCreated(JsonElement json) {
        super.onCreated(json);

        this.width = json.getObject().getInt("width", -1);
        this.height = json.getObject().getInt("height", -1);        
        if (this.onReadyCallback != null) this.onReadyCallback.onReady(this);
    }

    private void waitForReady() {
        super.waitForCreated();
    }

    public int getWidth() { return width; }
    public int getHeight() { return height; }

    @Override
    protected void addAttributes(JsonObject json){ json.put("src", src); }

    @JSEvent("load-error")
    public void onLoadError(JsonElement json) {
        if (this.onFailedCallback != null) {
            this.onFailedCallback.onFailed(this, "Failed to load");
        }
    }

    // native methods have no code → Use the new params attribute for explicit names
    @JSCommand(params = {"position", "size"})                 
    public native void draw(Vec2D position, Int2D size);

    @JSCommand
    public void draw(Vec2D position, double scale){}

    @JSCommand
    public void draw(Vec2D position, double scale, Vec2D anchor){}
}
