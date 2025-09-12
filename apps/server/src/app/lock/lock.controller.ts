import { Body, Controller, Post } from '@nestjs/common';
import { LockService } from './services/lock.service';
import { LockEntityDB } from './entities/lock.entity';

@Controller('lock')
export class LockController {
  constructor(private readonly lockService: LockService) {}

  @Post('open')
  async open(@Body() body: { lock: LockEntityDB }) {
    // In der echten App: Lock anhand ID laden, Link/Token prüfen, Audit schreiben.
    return this.lockService.open(body.lock);
  }
}
