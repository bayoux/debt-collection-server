import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { IntegrationConfig } from './entities/integration-config.entity';
import { CreateIntegrationConfigDto } from './dto/integration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Integrations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить конфигурацию канала' })
  @ApiCreatedResponse({ type: IntegrationConfig })
  create(@Body() dto: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Список конфигураций каналов' })
  @ApiOkResponse({ type: [IntegrationConfig] })
  findAll(): Promise<IntegrationConfig[]> {
    return this.service.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить конфигурацию' })
  @ApiOkResponse({ type: IntegrationConfig })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIntegrationConfigDto,
  ): Promise<IntegrationConfig> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить конфигурацию' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Тест соединения с каналом' })
  @ApiOkResponse({
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string', example: 'Connection to WhatsApp Ch2D OK' },
      },
    },
  })
  testConnection(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.service.testConnection(id);
  }
}
