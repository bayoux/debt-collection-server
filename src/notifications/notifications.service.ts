import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationLog } from './entities/notification-log.entity';
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
  ) {}

  // ── Templates ─────────────────────────────────────────────

  async createTemplate(dto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = this.templateRepo.create({
      name: dto.name,
      channel: dto.channel as any,
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
    await this.findOneTemplate(dto.templateId);
    const log = this.logRepo.create({
      debtCaseId: dto.debtCaseId,
      template: { id: dto.templateId } as any,
      channel: dto.channel,
      status: 'queued',
    });
    return this.logRepo.save(log);
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
