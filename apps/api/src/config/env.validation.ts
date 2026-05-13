import { z } from 'zod';

const envSchema = z
  .object({
    EMAIL_PROVIDER: z.enum(['ses', 'smtp', 'resend', 'console']).default('console'),
    EMAIL_FROM: z.string().email().default('no-reply@cms.example.com'),
    EMAIL_FROM_NAME: z.string().default('CMS'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    RESEND_API_KEY: z.string().optional(),
    PUBLIC_URL: z.string().url(),
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
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  return envSchema.parse(config);
}
