import * as vscode from "vscode";
import { LANGUAGE_IDS, TIMER_ID, DELAY } from './constant';
import { getDeprecatedRanges } from "./hover";

const { window, workspace, commands } = vscode;

const cache = new Map<string, vscode.Range[]>();

let decorationType: vscode.TextEditorDecorationType;

function paintAnnotations(
  editor: vscode.TextEditor,
  ranges: vscode.Range[],
  decorationType: vscode.TextEditorDecorationType
) {
  editor.setDecorations(decorationType, ranges);
}

async function onDidUpdateTextDocument(
  editor: vscode.TextEditor,
  decorationType: vscode.TextEditorDecorationType
) {
  if (editor) {
    if (!LANGUAGE_IDS.includes(editor.document.languageId)) return;
    // console.time('查询')
    const deprecated: vscode.Range[] = await getDeprecatedRanges(editor);
    // console.timeEnd('查询')
    paintAnnotations(editor, deprecated, decorationType);
    cache.set(editor.document.fileName, deprecated);
  }
}



function setDecorationType() {
  const extConfig = workspace.getConfiguration('vscode-deprecated');

  const options: vscode.DecorationRenderOptions = {
    textDecoration: 'line-through',
  };

  const configurable = [
    'textDecoration',
    'fontStyle',
    'fontWeight',
    'color',
    'backgroundColor',
    'after'
  ];

  configurable.forEach((style) => {
    if (extConfig.get(style)) {
      options[style] = extConfig.get(style);
    }
  });

  decorationType = window.createTextEditorDecorationType(options);
}

export function activate(context: vscode.ExtensionContext): void {
  console.log('vscode-deprecated activate.');
  setDecorationType();

  if (window.activeTextEditor) {
    onDidUpdateTextDocument(window.activeTextEditor, decorationType);
  }

  const registerDispose = commands.registerCommand('vscode-deprecated.showDeprecated', () => {
    const {activeTextEditor} = window;
    if (!activeTextEditor) {
      window.showErrorMessage('No activeTextEditor now!');
      return;
    }
    if (activeTextEditor) {
      onDidUpdateTextDocument(activeTextEditor, decorationType)
    }
  });

  const changeConfigDispose = workspace.onDidChangeConfiguration(() => {
    console.log('onDidChangeConfiguration')
    setDecorationType();
  });

  const changeTDDispose = workspace.onDidChangeTextDocument((e) => {
    // console.log('TextDocument改变', e.document === window.activeTextEditor.document); // true
    clearTimeout(TIMER_ID.CHANGE_TEXT_DOCUMENT);
    TIMER_ID.CHANGE_TEXT_DOCUMENT = setTimeout(() => {
      onDidUpdateTextDocument(window.activeTextEditor, decorationType);
    }, DELAY.CHANGE_TEXT_DOCUMENT);
  });

  const openTDDispose = workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
    const { fileName } = document;
    if (cache.has(fileName)) {
      paintAnnotations(window.activeTextEditor, cache.get(fileName), decorationType);
      return;
    }
    onDidUpdateTextDocument(window.activeTextEditor, decorationType);
  });

  const saveTDDispose = workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    onDidUpdateTextDocument(window.activeTextEditor, decorationType);
  });

  const changeATEDispose = window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
    const { fileName } = editor.document;
    if (cache.has(fileName)) {
      paintAnnotations(editor, cache.get(fileName), decorationType);
      return;
    }
    onDidUpdateTextDocument(editor, decorationType);
  });

  window.onDidChangeTextEditorVisibleRanges((e) => {
    clearTimeout(TIMER_ID.CHANGE_VISIBLE_RANGES);
    TIMER_ID.CHANGE_VISIBLE_RANGES = setTimeout(() => {
      onDidUpdateTextDocument(e.textEditor, decorationType);
    }, DELAY.CHANGE_VISIBLE_RANGES);
  })

  context.subscriptions.push(
    registerDispose,
    changeConfigDispose,
    changeTDDispose,
    openTDDispose,
    saveTDDispose,
    changeATEDispose
  );
}

export function deactivate(): void {
  console.log('vscode-deprecated deactivate');
  cache.clear();
}
