import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SkipAnomalyGuard } from './metrics/anomaly.guard';

@ApiTags('root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health/Info Root Endpoint' })
  @ApiOkResponse({
    schema: {
      properties: { message: { type: 'string', example: 'Hello API' } },
    },
  })
  getData() {
    return this.appService.getData();
  }

  @SkipAnomalyGuard()
  @Get('healthz')
  health() {
    return 'ok';
  }
}
