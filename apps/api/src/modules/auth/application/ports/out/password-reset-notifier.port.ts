export interface PasswordResetNotifier {
  sendPasswordResetEmail(to: string, token: string): Promise<void>;
}
