import * as ts from 'typescript';
import * as vscode from 'vscode';
import { LANGUAGE_IDS } from './constant';

/**
 * 获取 document 中所有的标识符位置
 * @param document
 */
export function getIdentifierPositions(document: vscode.TextDocument): vscode.Position[] {
  // document.version
  const positions: vscode.Position[] = [];
  const file: string = document.uri.fsPath;
  const program: ts.Program = ts.createProgram([file], { allowJs: true });
  const source: ts.SourceFile = program.getSourceFile(file);

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      positions.push(document.positionAt(node.end));
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);

  return positions;
}

/**
 * 获取处于当前活动 editor 中可见范围的标识符的位置
 */
export function getVisibleIdentifierPositions(editor?: vscode.TextEditor): vscode.Position[] {
  editor = editor || vscode.window.activeTextEditor;
  if (!editor) return [];
  const { languageId } = editor.document;
  if (!LANGUAGE_IDS.includes(languageId)) return [];

  const positions = getIdentifierPositions(editor.document);

  const visiblePositions: vscode.Position[] = [];
  editor.visibleRanges.forEach((range) => {
    const visPos = positions.filter((pos) => !!pos && pos.line >= range.start.line && pos.line <= range.end.line);
    visiblePositions.push(...visPos);
  });

  return visiblePositions;
}
