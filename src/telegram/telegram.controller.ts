import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { SendAlertDto, SendMessageDto, SendNotificationDto } from './dto/telegram.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Telegram')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить простое сообщение' })
  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  async send(@Body() dto: SendMessageDto) {
    await this.telegramService.sendMessage(dto.chatId, dto.text);
    return { ok: true };
  }

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить форматированное уведомление' })
  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  async notify(@Body() dto: SendNotificationDto) {
    await this.telegramService.sendNotification(dto.chatId, dto.title, dto.body);
    return { ok: true };
  }

  @Post('alert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить срочное уведомление 🚨' })
  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  async alert(@Body() dto: SendAlertDto) {
    await this.telegramService.sendAlert(dto.chatId, dto.message);
    return { ok: true };
  }
}
