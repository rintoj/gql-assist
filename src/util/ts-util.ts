import { readFileSync } from "fs";
import { basename } from "path";
import {
  addSyntheticLeadingComment,
  createPrinter,
  createSourceFile,
  EmitHint,
  Identifier,
  ModifierLike,
  NewLineKind,
  Node,
  NodeArray,
  PrinterOptions,
  QualifiedName,
  QuestionToken,
  ScriptKind,
  ScriptTarget,
  SourceFile,
  Statement,
  StringLiteral,
  SyntaxKind,
} from "typescript";

import { format } from "prettier";

export function readAndParseTSFile(filePath: string) {
  return parseTSFile(filePath, readFileSync(filePath, "utf8"));
}

export function parseTSFile(filePath: string, content = "") {
  return createSourceFile(
    basename(filePath),
    content,
    ScriptTarget.Latest,
    false,
    ScriptKind.TSX,
  );
}

export function parseTS(content = "") {
  return createSourceFile(
    "",
    content,
    ScriptTarget.Latest,
    false,
    ScriptKind.TSX,
  );
}

export function toTSStatements(content = "") {
  return parseTS(content).statements as any as Statement[];
}

export function parseTSExpression(content = "") {
  const {
    statements: [statement],
  }: any = createSourceFile(
    "",
    content,
    ScriptTarget.Latest,
    false,
    ScriptKind.TSX,
  );
  return statement?.expression || statement;
}

export function filterNodeByKind<K extends Node>(
  sourceFile: SourceFile,
  kind: SyntaxKind,
) {
  const nodes: K[] = [];
  sourceFile.forEachChild((node) => {
    if (node.kind === kind) {
      nodes.push(node as K);
    }
  });
  return nodes;
}

export function isPrivate(modifiers?: NodeArray<ModifierLike>) {
  return (
    modifiers?.find(
      (modifier) =>
        [SyntaxKind.PrivateKeyword, SyntaxKind.ProtectedKeyword].indexOf(
          modifier.kind,
        ) >= 0,
    ) != undefined
  );
}

export function isNullable(token: QuestionToken | undefined) {
  if (token == undefined) {
    return false;
  }
  return token.kind === SyntaxKind.QuestionToken;
}

export function getEntityName(
  name: Identifier | QualifiedName | StringLiteral | undefined,
) {
  if (name === undefined) {
    return undefined;
  }
  return (name as Identifier).escapedText as string;
}

const COMMENT = "__AUTO_GENERATED_EMPTY_LINE__";
const printerOptions: PrinterOptions = {
  newLine: NewLineKind.LineFeed,
  omitTrailingSemicolon: false,
};
export function printTS(
  node: Node | undefined,
  sourceFile: SourceFile = parseTSFile("./test.ts", ""),
) {
  if (node == undefined) return "";
  return createPrinter(printerOptions, {}).printNode(
    EmitHint.Unspecified,
    node,
    sourceFile,
  );
}

export function prettify(code: string) {
  const node = createSourceFile(
    "",
    code,
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  );
  const formattedCode = createPrinter(printerOptions, {
    substituteNode(hint, node) {
      switch (node.kind) {
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.Decorator:
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.EnumDeclaration:
        case SyntaxKind.ExportKeyword:
        case SyntaxKind.MethodDeclaration:
          return addSyntheticLeadingComment(
            node,
            SyntaxKind.SingleLineCommentTrivia,
            COMMENT,
            true,
          );
        default:
          return node;
      }
    },
  })
    .printNode(EmitHint.Unspecified, node, node)
    .replace(new RegExp(`\\/\\/${COMMENT}`, "g"), "")
    .replace(new RegExp(`^function`, "g"), "\nfunction")
    .replace(new RegExp(`^declare function`, "g"), "\ndeclare function");
  return format(formattedCode, {
    arrowParens: "avoid",
    bracketSpacing: true,
    endOfLine: "lf",
    htmlWhitespaceSensitivity: "css",
    bracketSameLine: false,
    jsxSingleQuote: true,
    printWidth: 100,
    proseWrap: "always",
    requirePragma: false,
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: "all",
    useTabs: false,
    parser: "typescript",
  } as any);
}
