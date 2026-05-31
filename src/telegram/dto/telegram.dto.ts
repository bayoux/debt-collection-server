import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: '123456789', description: 'Telegram chat_id или @username' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ example: 'Задолженность по делу #123 погашена.' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class SendNotificationDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ example: 'Обновление по делу' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Должник Иван Иванов оплатил 5000 сом.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}

export class SendAlertDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ example: 'DPD > 90 дней: 12 новых дел требуют немедленного внимания!' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
