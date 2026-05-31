import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { IntegrationConfig } from '../integrations/entities/integration-config.entity';
import { DebtCase } from '../debt-cases/entities/debt-case.entity';
import { TelegramService } from '../telegram/telegram.service';
import {
  CreateNotificationTemplateDto,
  SendNotificationDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @InjectRepository(IntegrationConfig)
    private readonly integrationRepo: Repository<IntegrationConfig>,
    @InjectRepository(DebtCase)
    private readonly debtCaseRepo: Repository<DebtCase>,
    private readonly mailerService: MailerService,
    private readonly telegramService: TelegramService,
  ) {}

  // ── Templates ─────────────────────────────────────────────

  async createTemplate(dto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = this.templateRepo.create({
      name: dto.name,
      channel: dto.channel as any,
      subject: dto.subject,
      body: dto.body,
      language: dto.language ?? 'ru',
    });
    return this.templateRepo.save(template);
  }

  async findTemplates(channel?: string): Promise<NotificationTemplate[]> {
    const where: any = channel ? { channel } : {};
    return this.templateRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOneTemplate(id: string): Promise<NotificationTemplate> {
    const t = await this.templateRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`NotificationTemplate ${id} not found`);
    return t;
  }

  async updateTemplate(
    id: string,
    dto: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    const t = await this.findOneTemplate(id);
    Object.assign(t, dto);
    return this.templateRepo.save(t);
  }

  async removeTemplate(id: string): Promise<void> {
    const t = await this.findOneTemplate(id);
    await this.templateRepo.remove(t);
  }

  // ── Send ──────────────────────────────────────────────────

  async send(dto: SendNotificationDto): Promise<NotificationLog> {
    const [template, debtCase] = await Promise.all([
      this.findOneTemplate(dto.templateId),
      this.debtCaseRepo.findOne({ where: { id: dto.debtCaseId }, relations: ['debtor'] }),
    ]);

    // Build variables: auto-fill from debt case, then override with request variables
    const vars: Record<string, string> = {
      ...this.buildAutoVars(debtCase),
      ...(dto.variables ?? {}),
    };

    const log = this.logRepo.create({
      debtCaseId: dto.debtCaseId,
      template: { id: dto.templateId } as any,
      channel: dto.channel,
      status: 'queued',
    });
    await this.logRepo.save(log);

    if (dto.channel === 'email') {
      await this.sendEmail(log, template, dto, vars);
    } else if (dto.channel === 'telegram') {
      await this.sendViaTelegram(log, template, debtCase, vars);
    } else {
      await this.sendViaWebhook(log, template, dto, vars);
    }

    return log;
  }

  private buildAutoVars(debtCase: DebtCase | null): Record<string, string> {
    if (!debtCase) return {};
    const d = debtCase.debtor;
    return {
      full_name: d?.fullName ?? '',
      phone: d?.phone ?? '',
      email: d?.email ?? '',
      amount: debtCase.amount != null ? String(debtCase.amount) : '',
      due_date: debtCase.dueDate ?? '',
      dpd: debtCase.dpd != null ? String(debtCase.dpd) : '',
      status: debtCase.status ?? '',
    };
  }

  private async sendEmail(
    log: NotificationLog,
    template: NotificationTemplate,
    dto: SendNotificationDto,
    vars: Record<string, string>,
  ): Promise<void> {
    const html = this.interpolate(template.body, vars);
    const subject = this.interpolate(dto.subject ?? template.subject ?? template.name, vars);

    try {
      await this.mailerService.sendMail({
        to: dto.recipientEmail,
        subject,
        html,
      });

      log.status = 'sent';
      log.sentAt = new Date();
    } catch (err) {
      log.status = 'failed';
      log.responseRaw = (err as Error).message;
    }

    await this.logRepo.save(log);
  }

  private async sendViaTelegram(
    log: NotificationLog,
    template: NotificationTemplate,
    debtCase: DebtCase | null,
    vars: Record<string, string>,
  ): Promise<void> {
    const chatId = debtCase?.debtor?.telegramId;

    if (!chatId) {
      log.status = 'failed';
      log.responseRaw = `Debtor has no telegramId set for debt case ${log.debtCaseId}`;
      await this.logRepo.save(log);
      return;
    }

    const text = this.interpolate(template.body, vars);

    try {
      await this.telegramService.sendMessage(chatId, text);
      log.status = 'sent';
      log.sentAt = new Date();
    } catch (err) {
      log.status = 'failed';
      log.responseRaw = (err as Error).message;
    }

    await this.logRepo.save(log);
  }

  private async sendViaWebhook(
    log: NotificationLog,
    template: NotificationTemplate,
    dto: SendNotificationDto,
    vars: Record<string, string>,
  ): Promise<void> {
    const integration = await this.integrationRepo.findOne({
      where: { channel: dto.channel, isActive: true },
      select: ['id', 'channel', 'provider', 'apiKey', 'webhookUrl', 'isActive'],
    });

    if (!integration) {
      log.status = 'failed';
      log.responseRaw = `No active integration configured for channel: ${dto.channel}`;
      await this.logRepo.save(log);
      return;
    }

    if (!integration.webhookUrl) {
      log.status = 'failed';
      log.responseRaw = `Integration "${integration.provider}" has no webhook URL configured`;
      await this.logRepo.save(log);
      return;
    }

    const message = this.interpolate(template.body, vars);

    try {
      const res = await fetch(integration.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${integration.apiKey}`,
        },
        body: JSON.stringify({
          channel: dto.channel,
          debt_case_id: dto.debtCaseId,
          message,
        }),
      });

      log.responseRaw = String(res.status);

      if (res.ok) {
        log.status = 'sent';
        log.sentAt = new Date();
      } else {
        const text = await res.text().catch(() => '');
        log.status = 'failed';
        log.responseRaw = `HTTP ${res.status}: ${text}`;
      }
    } catch (err) {
      log.status = 'failed';
      log.responseRaw = (err as Error).message;
    }

    await this.logRepo.save(log);
  }

  // Replaces {{key}} placeholders with values; unknown keys stay as-is
  private interpolate(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  // ── Logs ──────────────────────────────────────────────────

  async findLogs(
    page = 1,
    pageSize = 20,
    filters: { debtCaseId?: string; channel?: string; status?: string } = {},
  ): Promise<{ data: NotificationLog[]; total: number }> {
    const qb = this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.template', 'template')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.debtCaseId)
      qb.andWhere('log.debt_case_id = :debtCaseId', { debtCaseId: filters.debtCaseId });
    if (filters.channel) qb.andWhere('log.channel = :channel', { channel: filters.channel });
    if (filters.status) qb.andWhere('log.status = :status', { status: filters.status });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
