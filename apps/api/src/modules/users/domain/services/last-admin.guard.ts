/* eslint-disable @typescript-eslint/no-extraneous-class */
import { LastAdminError } from '../errors';
import { Role } from '../role';

export type User = {
  role: Role;
};

export class LastAdminGuard {
  static assertNotLastAdmin(adminCount: number, targetUser: User): void {
    if (adminCount === 1 && targetUser.role === Role.ADMIN) {
      throw new LastAdminError();
    }
  }
}
