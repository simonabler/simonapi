import { Controller, Get, Query } from '@nestjs/common';
import { EventQueryService } from '../services/event-query.service';
import { EventsQueryDto } from '../dto/events.query.dto';

@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly service: EventQueryService) {}
  @Get()
  query(@Query() q: EventsQueryDto) { return this.service.query(q); }
}
