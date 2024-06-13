import ts, {
  addSyntheticLeadingComment,
  createPrinter,
  createSourceFile,
  EmitHint,
  Identifier,
  QualifiedName,
  ScriptKind,
  ScriptTarget,
  StringLiteral,
  SyntaxKind,
} from 'typescript'

import * as fs from 'fs-extra'
import { resolve } from 'path'
import { format } from 'prettier'

function sanitizePetterOptions(options: Record<string, string>) {
  return Object.keys(options)
    .filter(key => !['plugins'].includes(key))
    .reduce((a, b) => ({ ...a, [b]: options[b] }), {})
}

function getPrettierConfig() {
  const prettierConfigs = ['.prettierrc', '.prettierrc.json']
  let index = 0
  let prettierConfigFile = prettierConfigs[index]
  while (prettierConfigFile) {
    try {
      const file = resolve(process.cwd(), prettierConfigFile)
      if (fs.existsSync(file)) {
        return sanitizePetterOptions(JSON.parse(fs.readFileSync(file, 'utf8')))
      }
    } catch (e) {
      console.error(e)
      // do nothing
    }
    prettierConfigFile = prettierConfigs[++index]
  }
  try {
    const packageJSON = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
    return sanitizePetterOptions(packageJSON.prettier)
  } catch (e) {
    // do nothing
  }
  return {
    arrowParens: 'avoid',
    bracketSpacing: true,
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'css',
    jsxBracketSameLine: false,
    jsxSingleQuote: true,
    printWidth: 100,
    proseWrap: 'always',
    requirePragma: false,
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    useTabs: false,
  }
}

function getPrettierOptions() {
  return { ...getPrettierConfig(), parser: 'typescript' }
}

const prettierOptions = getPrettierOptions()

const COMMENT = '__AUTO_GENERATED_EMPTY_LINE__'

const printerOptions: ts.PrinterOptions = {
  newLine: ts.NewLineKind.LineFeed,
  omitTrailingSemicolon: false,
}

export function prettify(code: string) {
  const node = createSourceFile('', code, ScriptTarget.Latest, true, ScriptKind.TSX)
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
          return addSyntheticLeadingComment(node, SyntaxKind.SingleLineCommentTrivia, COMMENT, true)
        default:
          return node
      }
    },
  })
    .printNode(EmitHint.Unspecified, node, node)
    .replace(new RegExp(`\\/\\/${COMMENT}`, 'g'), '')
    .replace(new RegExp(`^function`, 'g'), '\nfunction')
    .replace(new RegExp(`^declare function`, 'g'), '\ndeclare function')
  return format(formattedCode, prettierOptions)
}

export function getEntityName(name: Identifier | QualifiedName | StringLiteral | undefined) {
  if (name === undefined) {
    return undefined
  }
  return (name as Identifier).escapedText as string
}
