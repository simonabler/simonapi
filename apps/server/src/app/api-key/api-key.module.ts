import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyAdminController } from './api-key-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity])],
  providers: [ApiKeyService, ApiKeyGuard],
  controllers: [ApiKeyAdminController],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
