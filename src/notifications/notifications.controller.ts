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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationTemplate } from './entities/notification-template.entity';
import {
  BroadcastNotificationDto,
  CreateNotificationTemplateDto,
  SendNotificationDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const CHANNELS_ENUM = ['whatsapp', 'sms', 'telegram', 'email', 'chat2desk'] as const;

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // ── Templates ─────────────────────────────────────────────

  @Post('notification-templates')
  @ApiOperation({ summary: 'Создать шаблон' })
  @ApiCreatedResponse({ type: NotificationTemplate })
  createTemplate(@Body() dto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    return this.service.createTemplate(dto);
  }

  @Get('notification-templates')
  @ApiOperation({ summary: 'Список шаблонов' })
  @ApiQuery({ name: 'channel', required: false, enum: CHANNELS_ENUM })
  @ApiOkResponse({ type: [NotificationTemplate] })
  findTemplates(@Query('channel') channel?: string): Promise<NotificationTemplate[]> {
    return this.service.findTemplates(channel);
  }

  @Get('notification-templates/:id')
  @ApiOperation({ summary: 'Получить шаблон' })
  @ApiOkResponse({ type: NotificationTemplate })
  findOneTemplate(@Param('id', ParseUUIDPipe) id: string): Promise<NotificationTemplate> {
    return this.service.findOneTemplate(id);
  }

  @Patch('notification-templates/:id')
  @ApiOperation({ summary: 'Обновить шаблон' })
  @ApiOkResponse({ type: NotificationTemplate })
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    return this.service.updateTemplate(id, dto);
  }

  @Delete('notification-templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить шаблон' })
  @ApiNoContentResponse()
  removeTemplate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.removeTemplate(id);
  }

  // ── Send (single) ─────────────────────────────────────────

  @Post('notifications/send')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ручная отправка одного уведомления' })
  async send(@Body() dto: SendNotificationDto) {
    const log = await this.service.send(dto);
    return { log_id: log.id, status: log.status };
  }

  // ── Broadcast (mass send) ──────────────────────────────────

  @Post('notifications/broadcast')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Массовая рассылка по шаблону',
    description:
      'Отправляет уведомление по выбранному каналу всем переданным долговым делам. ' +
      'Если debtCaseIds не указан — рассылка по всем делам в системе.',
  })
  @ApiOkResponse({
    schema: {
      properties: {
        total: { type: 'integer', example: 42 },
        sent: { type: 'integer', example: 40 },
        failed: { type: 'integer', example: 2 },
        results: {
          type: 'array',
          items: {
            properties: {
              debtCaseId: { type: 'string', format: 'uuid' },
              logId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['sent', 'failed', 'queued'] },
            },
          },
        },
      },
    },
  })
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.service.broadcast(dto);
  }

  // ── Logs ──────────────────────────────────────────────────

  @Get('notifications/logs')
  @ApiOperation({ summary: 'Лог отправленных уведомлений' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'page_size', required: false, type: Number })
  @ApiQuery({ name: 'debt_case_id', required: false, type: String })
  @ApiQuery({ name: 'channel', required: false, enum: CHANNELS_ENUM })
  @ApiQuery({ name: 'status', required: false, enum: ['queued', 'sent', 'delivered', 'failed'] })
  async findLogs(
    @Query('page') page = 1,
    @Query('page_size') pageSize = 20,
    @Query('debt_case_id') debtCaseId?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
  ) {
    const { data, total } = await this.service.findLogs(+page, +pageSize, {
      debtCaseId,
      channel,
      status,
    });
    return { count: total, results: data };
  }
}
