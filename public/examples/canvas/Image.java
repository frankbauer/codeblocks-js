class Image extends RemoteObject {
    public interface OnReady {
        void onReady(Image img);
    }
    public interface OnFailed {
        void onFailed(Image img, String message);
    }

    public final String src;
    private final OnReady onReadyCallback;
    private final OnFailed onFailedCallback;
    private boolean ready = false;
    private int width;
    private int height;

    public Image(String src) {
        this(src, null, null);
    }
    
    public Image(String src, OnReady onReadyCallback) {
        this(src, onReadyCallback, null);
    }

    public Image(String src, OnReady onReadyCallback, OnFailed onFailedCallback) {
        super("IMAGE");
        this.src = src;
        this.onReadyCallback = onReadyCallback;
        this.onFailedCallback = onFailedCallback;
        this.sendNew();
    }

    public boolean isReady() {
        return ready;
    }
    public int getWidth() {
        return width;
    }
    public int getHeight() {
        return height;
    }

    @Override
    protected void addAttributes(JsonObject json){
        json.put("src", src);
    }

    @Override
    public void handleEvent(String cmd, JsonElement json){
        if (cmd.equals("ready")){
            if (json == null || !json.isObject()){
                if (this.onFailedCallback != null) {
                    this.onFailedCallback.onFailed(this, "Received ready event without data");
                } else {
                    System.err.println("Received ready event without data: " + src);                   
                }           
                return;
            }
            
            this.width = json.getObject().getInt("width", -1);
            this.height = json.getObject().getInt("height", -1);

            if (this.width == -1 || this.height == -1){
                System.err.println("Received ready event without valid dimensions for image: " + src);    
                if (this.onFailedCallback != null) {
                    this.onFailedCallback.onFailed(this, "Received ready event with invalid dimensions");
                } else {
                    System.err.println("Received ready event with invalid dimensions for image: " + src + " width: " + this.width + " height: " + this.height);
                }        
                return;
            }

            this.ready = true;  
            if (this.onReadyCallback != null) {
                this.onReadyCallback.onReady(this);
            }    
        } else if (cmd.equals("load-error")){            
            if (this.onFailedCallback != null) {
                this.onFailedCallback.onFailed(this, "Invalid image source or failed to load");
            } else {
                System.err.println("Failed to load image: " + src);
            }
        } else {
               System.out.print("Unknown command: " + cmd);
        }
    }

    public void draw(Vec2D position, Int2D size) {
        this.sendCommand("draw", new JsonObject()
            .put("x", position.x)
            .put("y", position.y)
            .put("width", size.x)
            .put("height", size.y)
        );
    }
    
    public void draw(Vec2D position, double scale) {
        this.sendCommand("draw", new JsonObject()
            .put("x", position.x)
            .put("y", position.y)
            .put("scale", scale)
        );
    }

    public void draw(Vec2D position, double scale, Vec2D anchor) {
        this.sendCommand("draw", new JsonObject()
            .put("x", position.x)
            .put("y", position.y)
            .put("scale", scale)
            .put("ax", anchor.x)
            .put("ay", anchor.y)
        );
    }
}