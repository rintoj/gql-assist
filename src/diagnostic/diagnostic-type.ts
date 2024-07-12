import { Range } from '../position'

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export class Diagnostic {
  constructor(
    public fileName: string,
    public range: Range,
    public message: string,
    public severity?: DiagnosticSeverity,
    public code?: string,
  ) {}
}
