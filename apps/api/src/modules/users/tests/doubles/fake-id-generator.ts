import { IdGenerator } from '../../application/ports/out/id-generator.port';

export class FakeIdGenerator implements IdGenerator {
  private index = 0;

  constructor(private readonly ids = ['test-id-0001']) {}

  generate(): string {
    const id = this.ids[this.index] ?? this.ids.at(-1) ?? 'test-id-0001';
    this.index += 1;
    return id;
  }
}
