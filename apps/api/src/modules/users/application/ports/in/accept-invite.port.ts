export type AcceptInviteCommand = {
  token: string;
  password: string;
};

// Exposed as POST /api/admin/auth/accept-invite (unauthenticated)
// Handled in AuthController, not UsersController
export interface AcceptInviteUseCase {
  execute(cmd: AcceptInviteCommand): Promise<void>;
}
