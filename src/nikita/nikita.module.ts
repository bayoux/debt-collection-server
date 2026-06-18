import { Module } from '@nestjs/common';
import { NikitaService } from './nikita.service';
import { NikitaController } from './nikita.controller';

@Module({
  controllers: [NikitaController],
  providers: [NikitaService],
  exports: [NikitaService],
})
export class NikitaModule {}
