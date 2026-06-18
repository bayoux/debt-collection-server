import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { NikitaService } from './nikita.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class NikitaSendDto {
  @ApiProperty({ example: '996700123456', description: 'Номер телефона (цифры, без +)' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Добрый день! Напоминаем о задолженности.' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

@ApiTags('Nikita')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('nikita')
export class NikitaController {
  constructor(private readonly nikitaService: NikitaService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Отправить SMS напрямую через Nikita SMSPro',
    description:
      'Прямая отправка без шаблона. Для рассылки по шаблону используйте POST /notifications/broadcast с channel=sms.',
  })
  @ApiOkResponse({
    schema: {
      properties: {
        status: { type: 'string', enum: ['sent', 'failed'] },
        message_id: { type: 'string', nullable: true },
        error: { type: 'string', nullable: true },
      },
    },
  })
  async send(@Body() dto: NikitaSendDto) {
    const result = await this.nikitaService.sendMessage(dto.phone, dto.text);
    return { status: result.status, message_id: result.messageId ?? null, error: result.error ?? null };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Проверить соединение с Nikita SMSPro (баланс)' })
  @ApiOkResponse({
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string', example: 'Nikita SMSPro OK — balance: 500.00 KGS (sender: Debt Collection)' },
      },
    },
  })
  test() {
    return this.nikitaService.testConnection();
  }
}
