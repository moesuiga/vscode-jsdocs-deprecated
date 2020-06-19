import * as ts from "typescript";
import * as vscode from "vscode";

const { window, workspace, commands } = vscode;

const JSDOC_DEPRECATED_ANNOTATION: string = "*@deprecated*";

const cache = new Map<string, vscode.Range[]>();

const languageIds = [
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact'
];

let decorationType: vscode.TextEditorDecorationType;

function getIdentifierPositions(document: vscode.TextDocument): vscode.Position[] {
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

async function getHoverAnnotations(
  document: vscode.TextDocument,
  positions: vscode.Position[]
): Promise<vscode.Hover[][]> {
  return Promise.all(
    positions.map(
      (position: vscode.Position): Thenable<vscode.Hover[]> =>
        commands.executeCommand("vscode.executeHoverProvider", document.uri, position)
    )
  );
}

function containsDeprecatedAnnotation(hovers: vscode.Hover[]): boolean {
  return hovers.some((hover: vscode.Hover) =>
    hover.contents.some((content: vscode.MarkdownString) => content.value.includes(JSDOC_DEPRECATED_ANNOTATION))
  );
}

function getDeprecatedRanges(hovers: vscode.Hover[][]): vscode.Range[] {
  return hovers.reduce((ranges: vscode.Range[], hover: vscode.Hover[]) => {
    if (containsDeprecatedAnnotation(hover)) {
      return [...ranges, hover.pop().range as vscode.Range];
    }
    return ranges;
  }, []);
}

function paintAnnotations(
  editor: vscode.TextEditor,
  ranges: vscode.Range[],
  decorationType: vscode.TextEditorDecorationType
) {
  editor.setDecorations(decorationType, ranges);
}

async function onDidUpdateTextDocument(
  document: vscode.TextDocument,
  editor: vscode.TextEditor,
  decorationType: vscode.TextEditorDecorationType
) {
  if (editor) {
    if (!languageIds.includes(editor.document.languageId)) return;

    const positions: vscode.Position[] = getIdentifierPositions(document);
    const annotations: vscode.Hover[][] = await getHoverAnnotations(document, positions);
    const deprecated: vscode.Range[] = getDeprecatedRanges(annotations);

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
  console.log('vscode-deprecated activate.')
  console.time('deprecated');
  setDecorationType();

  if (window.activeTextEditor) {
    onDidUpdateTextDocument(window.activeTextEditor.document, window.activeTextEditor, decorationType)
      .then(() => console.timeEnd('deprecated'));
  }

  const registerDispose = commands.registerCommand('vscode-deprecated.showDeprecated', () => {
    const {activeTextEditor} = window;
    if (!activeTextEditor) {
      window.showErrorMessage('No activeTextEditor now!');
      return;
    }
    if (activeTextEditor) {
      onDidUpdateTextDocument(activeTextEditor.document, activeTextEditor, decorationType)
    }
  });

  const changeConfigDispose = workspace.onDidChangeConfiguration(() => {
    console.log('onDidChangeConfiguration')
    setDecorationType();
  });

  const changeTDDispose = workspace.onDidChangeTextDocument((e) => {
    const { fileName, languageId } = e.document;
    console.log('onDidChangeTextDocument', fileName, languageId)
    if (!languageIds.includes(languageId)) return;
    onDidUpdateTextDocument(e.document, window.activeTextEditor, decorationType);
  });

  const openTDDispose = workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
    const { fileName, languageId } = document;
    console.log('onDidOpenTextDocument', fileName, languageId)
    if (!languageIds.includes(languageId)) return;
    if (cache.has(fileName)) {
      paintAnnotations(window.activeTextEditor, cache.get(fileName), decorationType);
      return;
    }
    onDidUpdateTextDocument(document, window.activeTextEditor, decorationType);
  });

  const saveTDDispose = workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    const { fileName, languageId } = document;
    console.log('onDidSaveTextDocument', fileName, languageId)
    if (!languageIds.includes(languageId)) return;
    onDidUpdateTextDocument(document, window.activeTextEditor, decorationType);
  });

  const changeATEDispose = window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
    const { fileName, languageId } = editor.document;
    console.log('onDidChangeActiveTextEditor', fileName, languageId)
    if (!languageIds.includes(languageId)) return;
    if (cache.has(fileName)) {
      console.log(cache.get(fileName))
      paintAnnotations(editor, cache.get(fileName), decorationType);
      return;
    }
    onDidUpdateTextDocument(editor.document, editor, decorationType);
  });

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
  console.log('deactivate');
  cache.clear();
}
