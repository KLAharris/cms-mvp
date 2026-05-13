import { PasswordHasher } from '../../application/ports/out/password-hasher.port';

export class FakePasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }
}
