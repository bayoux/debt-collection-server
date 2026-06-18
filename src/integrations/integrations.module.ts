import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { IntegrationConfig } from './entities/integration-config.entity';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { NikitaModule } from '../nikita/nikita.module';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationConfig]), ConfigModule, NikitaModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
