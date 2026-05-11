import { Controller, Get } from '@nestjs/common';

type HealthResponse = {
  status: 'ok';
  uptime: number;
  version: string;
};

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.0.0',
    };
  }
}
