/* eslint-disable @typescript-eslint/no-extraneous-class */
import { LastAdminError } from '../errors';
import { Role } from '../role';
import { User } from '../user';

export class LastAdminGuard {
  static assertNotLastAdmin(adminCount: number, targetUser: User): void {
    if (adminCount === 1 && targetUser.role === Role.ADMIN) {
      throw new LastAdminError();
    }
  }
}
