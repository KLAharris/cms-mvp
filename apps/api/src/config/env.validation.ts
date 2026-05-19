import { z } from 'zod';

const envSchema = z
  .object({
    EMAIL_PROVIDER: z.enum(['ses', 'smtp', 'resend', 'console']).default('console'),
    EMAIL_FROM: z.string().email().default('no-reply@cms.example.com'),
    EMAIL_FROM_NAME: z.string().default('CMS'),
    FRONTEND_BASE_URL: z.string().url().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_ADDRESS: z.string().optional(),
    PUBLIC_URL: z.string().url(),
    OBJECT_STORAGE_ENDPOINT: z.string().url(),
    OBJECT_STORAGE_REGION: z.string().min(1),
    OBJECT_STORAGE_BUCKET: z.string().min(1),
    OBJECT_STORAGE_ACCESS_KEY: z.string().min(1),
    OBJECT_STORAGE_SECRET_KEY: z.string().min(1),
    OBJECT_STORAGE_PUBLIC_URL: z.string().url(),
    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(20971520),
    PRESIGN_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    WORKER_SCHEDULED_PUBLISH_INTERVAL_SEC: z.coerce
      .number()
      .int()
      .min(10)
      .default(30),
  })
  .superRefine((data, ctx) => {
    if (['ses', 'smtp'].includes(data.EMAIL_PROVIDER)) {
      const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'] as const;

      for (const key of required) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} is required when EMAIL_PROVIDER=${data.EMAIL_PROVIDER}`,
            path: [key],
          });
        }
      }
    }

    if (data.EMAIL_PROVIDER === 'resend' && !data.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RESEND_API_KEY is required when EMAIL_PROVIDER=resend',
        path: ['RESEND_API_KEY'],
      });
    }

    if (data.EMAIL_PROVIDER === 'resend' && !data.RESEND_FROM_ADDRESS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RESEND_FROM_ADDRESS is required when EMAIL_PROVIDER=resend',
        path: ['RESEND_FROM_ADDRESS'],
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  return envSchema.parse(config);
}
