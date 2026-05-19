import { UnhandledEmailJobTypeError } from './errors/unhandled-email-job-type.error';

export type PasswordResetEmailJob = {
  type: 'password-reset';
  to: string;
  resetLink: string;
};

export type InviteEmailJob = {
  type: 'invite';
  to: string;
  inviteLink: string;
  role: string;
};

export type EmailJob = PasswordResetEmailJob | InviteEmailJob;

export function assertNeverEmailJob(job: never): never {
  throw new UnhandledEmailJobTypeError(getJobType(job));
}

function getJobType(job: unknown): string {
  if (
    typeof job === 'object' &&
    job !== null &&
    'type' in job &&
    typeof job.type === 'string'
  ) {
    return job.type;
  }

  return 'unknown';
}
