import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Update, Start, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Debtor } from '../debtors/entities/debtor.entity';

@Update()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    @InjectRepository(Debtor)
    private readonly debtorRepo: Repository<Debtor>,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    const numericId = String(from.id);
    const username = from.username ? `@${from.username}` : null;

    // Try to find a debtor whose telegramId matches the numeric ID (already linked)
    // or the @username (set manually by admin)
    const debtor = await this.debtorRepo
      .createQueryBuilder('d')
      .where('d.telegramId = :numericId', { numericId })
      .orWhere(username ? 'd.telegramId = :username' : '1=0', { username })
      .getOne();

    if (debtor && debtor.telegramId !== numericId) {
      debtor.telegramId = numericId;
      await this.debtorRepo.save(debtor);
      this.logger.log(
        `Updated debtor ${debtor.id} telegramId: ${debtor.telegramId} → ${numericId}`,
      );
      await ctx.reply(
        `Привет, ${from.first_name}! ✅ Ваш аккаунт подтверждён. Теперь вы будете получать уведомления здесь.`,
      );
    } else if (debtor) {
      await ctx.reply(`Привет, ${from.first_name}! Вы уже подключены к системе уведомлений.`);
    } else {
      this.logger.warn(
        `/start from unknown user: id=${from.id}, username=${from.username ?? '—'}`,
      );
      await ctx.reply(
        `Привет, ${from.first_name}! Ваш аккаунт не найден в системе. Обратитесь к менеджеру.`,
      );
    }
  }
}
