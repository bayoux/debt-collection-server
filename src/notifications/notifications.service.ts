import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { IntegrationConfig } from '../integrations/entities/integration-config.entity';
import { DebtCase } from '../debt-cases/entities/debt-case.entity';
import { PtpRecord } from '../ptp/entities/ptp-record.entity';
import { TelegramService } from '../telegram/telegram.service';
import { Chat2DeskService } from '../chat2desk/chat2desk.service';
import {
  BroadcastNotificationDto,
  CreateNotificationTemplateDto,
  SendNotificationDto,
} from './dto/notification.dto';

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  results: { debtCaseId: string; logId: string; status: string }[];
}

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
    @InjectRepository(PtpRecord)
    private readonly ptpRepo: Repository<PtpRecord>,
    private readonly mailerService: MailerService,
    private readonly telegramService: TelegramService,
    private readonly chat2deskService: Chat2DeskService,
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

  // ── Send (single) ─────────────────────────────────────────

  async send(dto: SendNotificationDto): Promise<NotificationLog> {
    const [template, debtCase, ptp] = await Promise.all([
      this.findOneTemplate(dto.templateId),
      this.debtCaseRepo.findOne({ where: { id: dto.debtCaseId }, relations: ['debtor'] }),
      this.ptpRepo.findOne({
        where: { debtCaseId: dto.debtCaseId, status: 'pending' },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const vars: Record<string, string> = {
      ...this.buildAutoVars(debtCase, ptp),
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
    } else if (dto.channel === 'chat2desk' || dto.channel === 'whatsapp') {
      // whatsapp is delivered via Chat2Desk
      await this.sendViaChat2Desk(log, template, debtCase, vars);
    } else {
      await this.sendViaWebhook(log, template, dto, vars);
    }

    return log;
  }

  // ── Broadcast (mass send) ──────────────────────────────────

  async broadcast(dto: BroadcastNotificationDto): Promise<BroadcastResult> {
    const template = await this.findOneTemplate(dto.templateId);

    let debtCases: DebtCase[];
    if (dto.debtCaseIds && dto.debtCaseIds.length > 0) {
      debtCases = await this.debtCaseRepo.find({
        where: { id: In(dto.debtCaseIds) },
        relations: ['debtor'],
      });
    } else {
      debtCases = await this.debtCaseRepo.find({ relations: ['debtor'] });
    }

    const results: BroadcastResult['results'] = [];
    let sent = 0;
    let failed = 0;

    for (const debtCase of debtCases) {
      const ptp = await this.ptpRepo.findOne({
        where: { debtCaseId: debtCase.id, status: 'pending' },
        order: { createdAt: 'DESC' },
      });

      const vars: Record<string, string> = {
        ...this.buildAutoVars(debtCase, ptp),
        ...(dto.variables ?? {}),
      };

      const log = this.logRepo.create({
        debtCaseId: debtCase.id,
        template: { id: dto.templateId } as any,
        channel: dto.channel,
        status: 'queued',
      });
      await this.logRepo.save(log);

      if (dto.channel === 'email') {
        await this.sendEmail(
          log,
          template,
          { channel: dto.channel, debtCaseId: debtCase.id, templateId: dto.templateId, recipientEmail: debtCase.debtor?.email },
          vars,
        );
      } else if (dto.channel === 'telegram') {
        await this.sendViaTelegram(log, template, debtCase, vars);
      } else if (dto.channel === 'chat2desk' || dto.channel === 'whatsapp') {
        await this.sendViaChat2Desk(log, template, debtCase, vars);
      } else {
        await this.sendViaWebhook(
          log,
          template,
          { channel: dto.channel, debtCaseId: debtCase.id, templateId: dto.templateId },
          vars,
        );
      }

      results.push({ debtCaseId: debtCase.id, logId: log.id, status: log.status });
      if (log.status === 'sent') sent++;
      else failed++;
    }

    return { total: debtCases.length, sent, failed, results };
  }

  // ── Private send helpers ───────────────────────────────────

  private buildAutoVars(
    debtCase: DebtCase | null,
    ptp: PtpRecord | null = null,
  ): Record<string, string> {
    const d = debtCase?.debtor;
    return {
      full_name: d?.fullName ?? '',
      phone: d?.phone ?? '',
      email: d?.email ?? '',
      amount: debtCase?.amount != null ? String(debtCase.amount) : '',
      due_date: debtCase?.dueDate ?? '',
      dpd: debtCase?.dpd != null ? String(debtCase.dpd) : '',
      status: debtCase?.status ?? '',
      promise_date: ptp?.promiseDate ?? '',
      promised_amount: ptp?.promisedAmount != null ? String(ptp.promisedAmount) : '',
    };
  }

  private async sendEmail(
    log: NotificationLog,
    template: NotificationTemplate,
    dto: Pick<SendNotificationDto, 'channel' | 'debtCaseId' | 'templateId' | 'recipientEmail' | 'subject'>,
    vars: Record<string, string>,
  ): Promise<void> {
    const html = this.interpolate(template.body, vars);
    const subject = this.interpolate(dto.subject ?? template.subject ?? template.name, vars);

    try {
      await this.mailerService.sendMail({ to: dto.recipientEmail, subject, html });
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

  private async sendViaChat2Desk(
    log: NotificationLog,
    template: NotificationTemplate,
    debtCase: DebtCase | null,
    vars: Record<string, string>,
  ): Promise<void> {
    // Prefer dedicated WhatsApp number, fall back to main phone
    const phone = debtCase?.debtor?.whatsappNumber ?? debtCase?.debtor?.phone;

    if (!phone) {
      log.status = 'failed';
      log.responseRaw = `Debtor has no phone for debt case ${log.debtCaseId}`;
      await this.logRepo.save(log);
      return;
    }

    const text = this.interpolate(template.body, vars);
    const result = await this.chat2deskService.sendMessage(phone, text);

    log.status = result.status;
    log.responseRaw = result.error ?? String(result.messageId ?? '');
    if (result.status === 'sent') log.sentAt = new Date();

    await this.logRepo.save(log);
  }

  private async sendViaWebhook(
    log: NotificationLog,
    template: NotificationTemplate,
    dto: Pick<SendNotificationDto, 'channel' | 'debtCaseId' | 'templateId'>,
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
        body: JSON.stringify({ channel: dto.channel, debt_case_id: dto.debtCaseId, message }),
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
