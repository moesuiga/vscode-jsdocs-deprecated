import * as vscode from 'vscode';
import { JSDOC_DEPRECATED_ANNOTATION } from './constant';
import { getVisibleIdentifierPositions } from './identifier';

/**
 * 获取给定位置内的标识符的 hover providers
 * @param editor
 * @param positions
 */
function getHoverAnnotations(
  editor: vscode.TextEditor,
  positions: vscode.Position[]
): Promise<vscode.Hover[][]> {
  return Promise.all(
    positions.map(
      (position: vscode.Position): Thenable<vscode.Hover[]> =>
        vscode.commands.executeCommand("vscode.executeHoverProvider", editor.document.uri, position)
    )
  );
}

/**
 * 判断 hover 中的 jsdoc 内容是否包含 `deprecated` 标注
 * @param hovers
 */
function containsDeprecatedAnnotation(hovers: vscode.Hover[]): boolean {
  return hovers.some((hover: vscode.Hover) =>
    hover.contents.some((content: vscode.MarkdownString, index) => {
      // index === 0 时, content.value 是标识符的类型部分
      // 如果一个常量字符串包含 `*@deprecated*` 就可能会被误判
      // 比如这里的 JSDOC_DEPRECATED_ANNOTATION
      return index > 0 && content.value.includes(JSDOC_DEPRECATED_ANNOTATION);
    })
  );
}

/**
 * 获取 deprecated 标识符的 Ranges
 * @param editor
 */
export async function getDeprecatedRanges(editor: vscode.TextEditor): Promise<vscode.Range[]> {
  const positions = getVisibleIdentifierPositions(editor);
  const hovers = await getHoverAnnotations(editor, positions);
  return hovers.reduce((ranges: vscode.Range[], hover: vscode.Hover[]) => {
    if (containsDeprecatedAnnotation(hover)) {
      return [...ranges, hover.pop().range as vscode.Range];
    }
    return ranges;
  }, []);
}
