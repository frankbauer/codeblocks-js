/**
 * This file is a modified version of the indent.ts file from the CodeMirror project:
 * https://github.com/codemirror/language/blob/main/src/indent.ts
 */
import {NodeProp, SyntaxNode, Tree} from "@lezer/common"
import {EditorState, ChangeSpec} from "@codemirror/state"
import {IndentContext, indentNodeProp, indentString,  syntaxTree, TreeIndentContext} from '@codemirror/language'

const BASE_INDENT = 7

/// Get the indentation, as a column number, at the given position.
/// Will first consult any [indent services](#language.indentService)
/// that are registered, and if none of those return an indentation,
/// this will check the syntax tree for the [indent node
/// prop](#language.indentNodeProp) and use that if found. Returns a
/// number when an indentation could be determined, and null
/// otherwise.
export function getSimpleIndentation(context: IndentContext | EditorState, pos: number, topIndent: ()=>number): number | null {
  if (context instanceof EditorState) context = new IndentContext(context)
// **********************************************************************************
// THIS IS THE ONLY CHANGE WE NEED TO GET THE DEFAULT LANGUAGE INDENTATION
// **********************************************************************************
//   for (let service of context.state.facet(indentService)) {
//     let result = service(context, pos)
//     if (result !== undefined) return result
//   }

  let tree = syntaxTree(context.state)
  return tree.length >= pos ? syntaxIndentation(context, tree, pos, topIndent) : null
}


// Compute the indentation for a given position from the syntax tree.
function syntaxIndentation(cx: IndentContext, ast: Tree, pos: number, topIndent: ()=>number) {
  return indentFrom(ast.resolveInner(pos).enterUnfinishedNodesBefore(pos), pos, cx, topIndent)
}

function ignoreClosed(cx: TreeIndentContext) {
  return cx.pos == cx.options.simulateBreak && cx.options.simulateDoubleBreak
}

function indentStrategy(tree: SyntaxNode, topIndent: ()=>number): ((context: TreeIndentContext) => number | null) | null {
  let strategy = tree.type.prop(indentNodeProp)
  if (strategy) return strategy
  let first = tree.firstChild, close: readonly string[] | undefined
  if (first && (close = first.type.prop(NodeProp.closedBy))) {
    let last = tree.lastChild, closed = last && close.indexOf(last.name) > -1
    return cx => delimitedStrategy(cx, true, 1, undefined, closed && !ignoreClosed(cx) ? last!.from : undefined)
  }
  return tree.parent == null ? topIndent : null
}

function indentFrom(node: SyntaxNode | null, pos: number, base: IndentContext, topIndent: ()=>number) {
  for (; node; node = node.parent) {
    let strategy = indentStrategy(node, topIndent)
    if (strategy) return strategy(TreeIndentContext.create(base, pos, node))
  }
  return null
}


// Check whether a delimited node is aligned (meaning there are
// non-skipped nodes on the same line as the opening delimiter). And
// if so, return the opening token.
function bracketedAligned(context: TreeIndentContext) {
  let tree = context.node
  let openToken = tree.childAfter(tree.from), last = tree.lastChild
  if (!openToken) return null
  let sim = context.options.simulateBreak
  let openLine = context.state.doc.lineAt(openToken.from)
  let lineEnd = sim == null || sim <= openLine.from ? openLine.to : Math.min(openLine.to, sim)
  for (let pos = openToken.to;;) {
    let next = tree.childAfter(pos)
    if (!next || next == last) return null
    if (!next.type.isSkipped)
      return next.from < lineEnd ? openToken : null
    pos = next.to
  }
}

function delimitedStrategy(context: TreeIndentContext, align: boolean, units: number, closing?: string, closedAt?: number) {
  let after = context.textAfter, space = after.match(/^\s*/)![0].length
  let closed = closing && after.slice(space, space + closing.length) == closing || closedAt == context.pos + space
  let aligned = align ? bracketedAligned(context) : null
  if (aligned) return closed ? context.column(aligned.from) : context.column(aligned.to)
  return context.baseIndent + (closed ? 0 : context.unit * units)
}