import de.fau.tf.lgdv.*;
import de.fau.tf.lgdv.runtime.annotations.*;
import org.teavm.jso.JSProperty;

public class DemoApp  {  

    /**
     * Sends an 'example' command to the JavaScript side.
     * The @JSCommand annotation marks this as a command that will be posted as a message.
     */
    @JSCommand("example")
    static native void postExample(boolean flag, int value);

    /**
     * Sends a synchronous 'query' to the JavaScript side and waits for a response.
     * The @JSQuery annotation marks this as a synchronous request.
     */
    @JSQuery("info")
    static native String getInfo();

    /**
     * Handles the 'hello' event received from JavaScript.
     * The @JSEvent annotation routes messages with command 'hello' to this method.
     */
    @JSEvent("hello")
    static void onHello(String id) {
        System.out.println("Hello received! with id: " + id);
        
        // Example of using @JSQuery to get information synchronously from JavaScript
        String info = getInfo();
        System.out.println("Info from JS: " + info);

        // Reply with an example command
        postExample(false, 456);
    }

    /**
     * Handles the 'example' event received from JavaScript.
     * Parameters are automatically mapped from the JSON payload keys.
     */
    @JSEvent("example")
    static void onExample(boolean flag, int value, String id) {
        System.out.println("Example received with flag: " + flag + " and value: " + value + " with id: " + id);
    }

    public static void main(String[] args) {
        // With @JSEvent annotations, the runtime automatically sets up event routing.
        // No manual registration with CodeBlocks.startReceivingEvents is required.
        System.out.println("DemoApp started. Waiting for events...");
    }
}