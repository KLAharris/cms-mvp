import { TokenBlocklist } from '../../application/ports/out/token-blocklist.port';

export class FakeTokenBlocklist implements TokenBlocklist {
  private readonly jtis = new Set<string>();

  add(jti: string, expiresAt: Date): Promise<void> {
    void expiresAt;
    this.jtis.add(jti);
    return Promise.resolve();
  }

  has(jti: string): Promise<boolean> {
    return Promise.resolve(this.jtis.has(jti));
  }
}
