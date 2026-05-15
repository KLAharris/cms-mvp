export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface JobEnqueuer {
  enqueue(queueName: string, payload: JobPayload): Promise<void>;
}

export const MEDIA_VARIANT_QUEUE = 'media-variant-generation';
export const JOB_ENQUEUER = Symbol('JobEnqueuer');
