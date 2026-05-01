import de.fau.tf.lgdv.*;
import org.teavm.jso.JSProperty;

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

    public static void main(String[] args) {
        CodeBlocks.startReceivingEvents(DemoApp::onMessage);
    }
}