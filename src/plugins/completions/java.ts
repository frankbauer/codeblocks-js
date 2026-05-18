import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { createCompletionResult } from './shared'
import { CompletionItem, CompletionOptions } from './types'

const javaKeywords: CompletionItem[] = [
    {
        label: 'public',
        type: 'keyword',
        info: 'Access modifier that makes an element accessible from any class',
    },
    {
        label: 'private',
        type: 'keyword',
        info: 'Access modifier that makes an element accessible only within its class',
    },
    {
        label: 'protected',
        type: 'keyword',
        info: 'Access modifier that makes an element accessible within package and by subclasses',
    },
    { label: 'class', type: 'keyword', info: 'Declares a class' },
    { label: 'interface', type: 'keyword', info: 'Declares an interface' },
    { label: 'extends', type: 'keyword', info: 'Indicates inheritance from a superclass' },
    { label: 'implements', type: 'keyword', info: 'Indicates implementation of interfaces' },
    { label: 'static', type: 'keyword', info: 'Declares a member that belongs to the type itself' },
    {
        label: 'final',
        type: 'keyword',
        info: 'Declares an element that cannot be changed or inherited from',
    },
    { label: 'abstract', type: 'keyword', info: 'Declares an abstract class or method' },
]

const javaTypes: CompletionItem[] = [
    { label: 'void', type: 'type', info: 'Represents no return value' },
    { label: 'int', type: 'type', info: '32-bit integer' },
    { label: 'long', type: 'type', info: '64-bit integer' },
    { label: 'double', type: 'type', info: '64-bit floating point' },
    { label: 'float', type: 'type', info: '32-bit floating point' },
    { label: 'boolean', type: 'type', info: 'true or false value' },
    { label: 'char', type: 'type', info: '16-bit Unicode character' },
    { label: 'String', type: 'type', info: 'Text string' },
    { label: 'byte', type: 'type', info: '8-bit integer' },
    { label: 'short', type: 'type', info: '16-bit integer' },
    { label: 'Integer', type: 'type', info: 'Wrapper class for int' },
    { label: 'Long', type: 'type', info: 'Wrapper class for long' },
    { label: 'Double', type: 'type', info: 'Wrapper class for double' },
    { label: 'Float', type: 'type', info: 'Wrapper class for float' },
    { label: 'Boolean', type: 'type', info: 'Wrapper class for boolean' },
    { label: 'Character', type: 'type', info: 'Wrapper class for char' },
]

const javaSnippets: CompletionItem[] = [
    {
        label: 'main',
        type: 'snippet',
        detail: 'public static void main(String[] args)',
        info: 'Main method - the entry point of a Java program',
    },
    {
        label: 'sout',
        type: 'snippet',
        detail: 'System.out.println();',
        info: 'Print to standard output',
    },
    {
        label: 'fori',
        type: 'snippet',
        detail: 'for (int i = 0; i < length; i++){ }',
        info: 'For loop using a variable i',
    },
    {
        label: 'forj',
        type: 'snippet',
        detail: 'for (int j = 0; j < length; j++){ }',
        info: 'For loop using a variable j',
    },
    {
        label: 'if',
        type: 'snippet',
        detail: 'if () { }',
        info: 'If statement',
    },
    {
        label: 'while',
        type: 'snippet',
        detail: 'while () { }',
        info: 'While loop',
    },
]

const javaCollections: CompletionItem[] = [
    { label: 'Math', type: 'class', info: 'Utility class for common mathematical operations' },
    { label: 'List<T>', type: 'interface', info: 'Ordered collection interface' },
    { label: 'Map<K, V>', type: 'interface', info: 'Key-value mapping interface' },
    { label: 'Set<T>', type: 'interface', info: 'Collection of unique elements' },
    { label: 'Queue<T>', type: 'interface', info: 'FIFO collection interface' },
    {
        label: 'ArrayList<T>',
        type: 'class',
        info: 'Resizable array implementation',
    },
    { label: 'HashMap<K, V>', type: 'class', info: 'Hash table implementation of Map interface' },
    { label: 'LinkedList<T>', type: 'class', info: 'Doubly-linked list implementation' },
    { label: 'HashSet<T>', type: 'class', info: 'Hash table implementation of Set interface' },
    { label: 'StringBuilder', type: 'class', info: 'Mutable sequence of characters' },
    { label: 'StringBuffer', type: 'class', info: 'Thread-safe mutable sequence of characters' },
    { label: 'Collections', type: 'class', info: 'Utility methods for working with collections' },
    { label: 'Arrays', type: 'class', info: 'Utility methods for array operations' },
]

const javaAPI: CompletionItem[] = [
    {
        label: 'System.out.println()',
        type: 'api',
        info: 'Prints to standard output',
    },
    {
        label: 'System.out.print()',
        type: 'api',
        info: 'Prints to standard output without a newline',
    },
    { label: 'Math.abs(x)', type: 'api', info: 'Returns the absolute value of a number' },
    { label: 'Math.max(v0, v1)', type: 'api', info: 'Returns the larger of two numbers' },
    { label: 'Math.min(v0, v1)', type: 'api', info: 'Returns the smaller of two numbers' },
    {
        label: 'Math.pow(x, e)',
        type: 'api',
        info: 'Returns the value of the first argument raised to the power of the second argument',
    },
    { label: 'Math.sqrt(x)', type: 'api', info: 'Returns the square root of a number' },
    {
        label: 'Math.random()',
        type: 'api',
        info: 'Returns a random number between 0.0 and 1.0 (excluded)',
    },
]

const javaRuntimeClasses: CompletionItem[] = [
    { label: 'de.fau.tf.lgdv.CodeBlocks', type: 'class', info: 'CodeBlocks runtime API' },
    { label: 'de.fau.tf.lgdv.CodeBlocksBaseMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.CodeBlocksDoubleArrayMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.CodeBlocksDoubleMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.CodeBlocksEventFunction', type: 'class' },
    { label: 'de.fau.tf.lgdv.CodeBlocksIntArrayMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.CodeBlocksIntMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.CodeBlocksQueryMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.CodeBlocksStringArrayMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.CodeBlocksStringMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.JSON', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.Canvas', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.Color', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.Image', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.KeyEvent', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.KeyEventType', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.KeyInfo', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.Layer', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.ModifiersInfo', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.MouseEvent', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.MouseEventType', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.MouseInfo', type: 'class' },
    { label: 'de.fau.tf.lgdv.graphics.TickEvent', type: 'class' },
    { label: 'de.fau.tf.lgdv.json.ISOTimestampConverter', type: 'class' },
    { label: 'de.fau.tf.lgdv.json.JsonArray', type: 'class' },
    { label: 'de.fau.tf.lgdv.json.JsonElement', type: 'class' },
    { label: 'de.fau.tf.lgdv.json.JsonObject', type: 'class' },
    { label: 'de.fau.tf.lgdv.json.JsonObjectable', type: 'class' },
    { label: 'de.fau.tf.lgdv.json.JsonParser', type: 'class' },
    { label: 'de.fau.tf.lgdv.json.JsonSerializer', type: 'class' },
    { label: 'de.fau.tf.lgdv.json.Version', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Cone', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Geometry', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Helper', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Int2D', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Line2D', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Plane', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Ray', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Size', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Sphere', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Vec2D', type: 'class' },
    { label: 'de.fau.tf.lgdv.math.Vec3D', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.AnimatedSprite', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.AnimatedSpriteEventHandler', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.EventHandler', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.Figure', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.FigureEventHandler', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.GameEventHandler', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.MapGame', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.RPCIDMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.RPCNewAnimationMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.RPCNewMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.RPCSpeedMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.RPCTileMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.phaser.Sprite', type: 'class' },
    { label: 'de.fau.tf.lgdv.runtime.CommandBuffer', type: 'class' },
    { label: 'de.fau.tf.lgdv.runtime.NewRemoteObjectMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.runtime.ObjectReplyMessage', type: 'class' },
    { label: 'de.fau.tf.lgdv.runtime.RemoteObject', type: 'class' },
    { label: 'de.fau.tf.lgdv.runtime.annotations.JSCommand', type: 'class' },
    { label: 'de.fau.tf.lgdv.runtime.annotations.JSEvent', type: 'class' },
    { label: 'de.fau.tf.lgdv.runtime.annotations.JSQuery', type: 'class' },
]

const javaBaseCompletions = [
    ...javaKeywords,
    ...javaTypes,
    ...javaSnippets,
    ...javaCollections,
    ...javaAPI,
]

export function createJavaCompletions(
    context: CompletionContext,
    options?: CompletionOptions
): CompletionResult | null {
    const allCompletions = options?.includeRuntime
        ? [...javaBaseCompletions, ...javaRuntimeClasses]
        : javaBaseCompletions
    return createCompletionResult(context, allCompletions)
}
