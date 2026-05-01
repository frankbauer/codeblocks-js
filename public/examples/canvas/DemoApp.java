import de.fau.tf.lgdv.*;
import org.teavm.jso.JSProperty;
import de.fau.tf.lgdv.runtime.RemoteObject;
import de.fau.tf.lgdv.json.*;

class Canvas {
     public void drawImage(Image img, int x, int y) {
        img.draw(this, x, y, 1.0);
    }

    public void drawImage(Image img, int x, int y, double scale) {
        img.draw(this, x, y, scale);
    }

    public void drawImage(Image img, int x, int y, int width, int height) {
        img.draw(this, x, y, width, height);
    }
}

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

    public void draw(Canvas canvas, int x, int y, int width, int height) {
        this.sendCommand("draw", new JsonObject()
            .put("x", x)
            .put("y", y)
            .put("width", width)
            .put("height", height)
        );
    }

    public void draw(Canvas canvas, int x, int y, double scale) {
        this.sendCommand("draw", new JsonObject()
            .put("x", x)
            .put("y", y)
            .put("scale", scale)
        );
    }
}

interface MyExampleMessage extends CodeBlocksBaseMessage {
    @JSProperty
    boolean getFlag();

    @JSProperty
    void setFlag(boolean value);

    @JSProperty
    int getValue();

    @JSProperty
    void setValue(int value);
}

public class DemoApp  {  
    static void postExampleCommand(boolean flag, int value) {
        MyExampleMessage reply = CodeBlocks.createJSObject();
        reply.setCommand("example");
        reply.setFlag(flag);
        reply.setValue(value);
        CodeBlocks.postMessage(reply);
    }

    protected static void onMessage(CodeBlocksBaseMessage msg) {
        switch (msg.getCommand()) {
            case "hello":
                System.out.println("Hello received!"  + " with id: " + msg.getId());
                postExampleCommand(false, 456);
                break;
            case "example":
                MyExampleMessage exampleMsg = (MyExampleMessage) msg.cast();
                System.out.println("Example received with flag: " + exampleMsg.getFlag() + " and value: " + exampleMsg.getValue() + " with id: " + msg.getId());
                break;
            default:
                System.out.println("Unknown command: " + msg.getCommand() + " with id: " + msg.getId());
        }
    }  

    static void onReady(Image img) {
        System.out.println("Image is ready with dimensions: " + img.getWidth() + "x" + img.getHeight());
         Canvas canvas = new Canvas();
         canvas.drawImage(img, 10, 20, 0.5);
         // CodeBlocks.exit(0);
    }

    static void onFailed(Image img, String message) {
        System.err.println("Failed to load image: " + img.src + " with message: " + message);
    }

    public static void main(String[] args) {
        CodeBlocks.startReceivingEvents(DemoApp::onMessage);
       
        Image img = new Image("/common/scene/floatingworld/img/Player1.png", DemoApp::onReady, DemoApp::onFailed);        
        new Canvas().drawImage(img, 100, 42, 1.2);
    }
}