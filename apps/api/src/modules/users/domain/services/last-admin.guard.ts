/* eslint-disable @typescript-eslint/no-extraneous-class */
import { LastAdminError } from '../../../auth/domain/errors';
import { Role } from '../../../auth/domain/role';
import { User } from '../../../auth/domain/user';

export class LastAdminGuard {
  static assertNotLastAdmin(adminCount: number, targetUser: User): void {
    if (adminCount === 1 && targetUser.role === Role.ADMIN) {
      throw new LastAdminError();
    }
  }
}
