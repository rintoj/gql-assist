import { Range } from '../diff/token'

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export class Diagnostic {
  constructor(
    public readonly fileName: string,
    public readonly range: Range,
    public readonly message: string,
    public readonly severity?: DiagnosticSeverity,
    public readonly code?: string,
  ) {}
}
