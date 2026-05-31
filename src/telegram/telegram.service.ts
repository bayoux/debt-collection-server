import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(@InjectBot() private readonly bot: Telegraf) {}

  async sendMessage(chatId: string | number, text: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, text);
    } catch (err) {
      this.logger.error(`sendMessage failed for chatId=${chatId}: ${(err as Error).message}`);
      throw err;
    }
  }

  async sendNotification(chatId: string | number, title: string, body: string): Promise<void> {
    const text = `*${title}*\n\n${body}`;
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      this.logger.error(`sendNotification failed for chatId=${chatId}: ${(err as Error).message}`);
      throw err;
    }
  }

  async sendAlert(chatId: string | number, message: string): Promise<void> {
    const text = `🚨 *СРОЧНО*\n\n${message}`;
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      this.logger.error(`sendAlert failed for chatId=${chatId}: ${(err as Error).message}`);
      throw err;
    }
  }
}
