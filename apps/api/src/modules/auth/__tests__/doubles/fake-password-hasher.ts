import { PasswordHasher } from '../../application/ports/out/password-hasher.port';

export class FakePasswordHasher implements PasswordHasher {
  verify(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(plain === hash.replace('hashed:', ''));
  }

  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }
}
