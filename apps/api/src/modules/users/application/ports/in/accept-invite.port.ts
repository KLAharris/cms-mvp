export type AcceptInviteCommand = {
  token: string;
  password: string;
};

export interface AcceptInviteUseCase {
  execute(cmd: AcceptInviteCommand): Promise<void>;
}
