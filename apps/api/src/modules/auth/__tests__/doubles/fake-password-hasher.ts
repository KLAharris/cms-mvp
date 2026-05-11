import { PasswordHasher } from '../../application/ports/out/password-hasher.port';

export class FakePasswordHasher implements PasswordHasher {
  async verify(plain: string, hash: string): Promise<boolean> {
    return plain === hash.replace('hashed:', '');
  }

  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
}
