import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  BACKEND_PORT: z.string().default('3001').transform(Number),
  DATABASE_FILE_PATH: z.string().default('./data/real-estate.sqlite'),
  MOLIT_SERVICE_KEY: z.string().optional(),
  KREA_API_KEY: z.string().optional(),
  KB_API_KEY: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    console.error('Environment validation failed:', env.error.flatten());
    process.exit(1);
  }

  const data = env.data;
  if (data.MOLIT_SERVICE_KEY) {
    data.MOLIT_SERVICE_KEY = decodeURIComponent(data.MOLIT_SERVICE_KEY);
  }

  return data;
}

export const config = validateEnv();
