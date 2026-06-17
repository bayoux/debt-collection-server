import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Chat2DeskService } from './chat2desk.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class Chat2DeskSendDto {
  @ApiProperty({ example: '+996700123456', description: 'Номер телефона в международном формате' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Добрый день! Напоминаем о задолженности.' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

@ApiTags('Chat2Desk')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('chat2desk')
export class Chat2DeskController {
  constructor(private readonly chat2deskService: Chat2DeskService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Отправить WhatsApp-сообщение напрямую',
    description:
      'Прямая отправка без шаблона. Для рассылки по шаблону используйте POST /notifications/broadcast с channel=chat2desk.',
  })
  @ApiOkResponse({
    schema: {
      properties: {
        status: { type: 'string', enum: ['sent', 'failed'] },
        message_id: { type: 'integer', nullable: true },
        error: { type: 'string', nullable: true },
      },
    },
  })
  async send(@Body() dto: Chat2DeskSendDto) {
    const result = await this.chat2deskService.sendMessage(dto.phone, dto.text);
    return { status: result.status, message_id: result.messageId ?? null, error: result.error ?? null };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Проверить соединение с Chat2Desk API' })
  @ApiOkResponse({
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string', example: 'Chat2Desk connection OK' },
      },
    },
  })
  test() {
    return this.chat2deskService.testConnection();
  }
}
