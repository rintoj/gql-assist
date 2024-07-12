import { Range } from './range'

export class Location {
  constructor(
    public path: string,
    public range: Range,
  ) {}

  clone() {
    return new Location(this.path, this.range.clone())
  }
}
