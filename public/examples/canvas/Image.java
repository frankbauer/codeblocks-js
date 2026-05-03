class Image extends RemoteObject {
    public interface OnReady { void onReady(Image img); }
    public interface OnFailed { void onFailed(Image img, String message); }

    public final String src;
    private final OnReady onReadyCallback;
    private final OnFailed onFailedCallback;
    private boolean ready = false;
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
    }

    public boolean isReady() { return ready; }

    public void waitForReady() {
        JsonElement e = super.waitForCreated();
        if (e != null) {
            this.width = e.getObject().getInt("width", -1);
            this.height = e.getObject().getInt("height", -1);
            this.ready = true;
            if (this.onReadyCallback != null) this.onReadyCallback.onReady(this);
        }
    }

    public int getWidth() { return width; }
    public int getHeight() { return height; }

    @Override
    protected void addAttributes(JsonObject json){ json.put("src", src); }

    // @JSEvent("ready")
    // public void onReadyEvent(JsonElement json) {
    //     this.width = json.getObject().getInt("width", -1);
    //     this.height = json.getObject().getInt("height", -1);
    //     this.ready = true;  
    //     if (this.onReadyCallback != null) this.onReadyCallback.onReady(this);
    // }

    @JSEvent("load-error")
    public void onLoadError(JsonElement json) {
        if (this.onFailedCallback != null) {
            this.onFailedCallback.onFailed(this, "Failed to load");
        }
    }

    // native methods have no code → Use the new params attribute for explicit names
    @JSCommand(params = {"position", "size"})                 
    public native void draw(Vec2D position, Int2D size);

    @JSCommand(params = {"position", "scale"})                                                                  
    public  void draw(Vec2D position, double scale){}

    @JSCommand
    public  void draw(Vec2D position, double scale, Vec2D anchor){}
}
