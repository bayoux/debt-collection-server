import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledTask } from './entities/scheduled-task.entity';
import { CreateScheduledTaskDto } from './dto/scheduled-task.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(ScheduledTask)
    private readonly repo: Repository<ScheduledTask>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateScheduledTaskDto): Promise<ScheduledTask> {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }
    const task = this.repo.create({
      debtCaseId: dto.debtCaseId,
      template: { id: dto.templateId } as any,
      channel: dto.channel,
      scheduledAt,
      taskStatus: 'pending',
    });
    return this.repo.save(task);
  }

  async findAll(
    page = 1,
    pageSize = 20,
    taskStatus?: string,
  ): Promise<{ data: ScheduledTask[]; total: number }> {
    const where: any = taskStatus ? { taskStatus } : {};
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { scheduledAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<ScheduledTask> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`ScheduledTask ${id} not found`);
    return task;
  }

  async cancel(id: string): Promise<ScheduledTask> {
    const task = await this.findOne(id);
    if (task.taskStatus !== 'pending')
      throw new BadRequestException(`Cannot cancel task in status "${task.taskStatus}"`);
    task.taskStatus = 'cancelled';
    return this.repo.save(task);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runPendingTasks(): Promise<void> {
    const due = await this.repo.find({
      where: { taskStatus: 'pending', scheduledAt: LessThanOrEqual(new Date()) },
      relations: ['template'],
    });

    if (!due.length) return;

    this.logger.log(`Running ${due.length} scheduled task(s)`);

    for (const task of due) {
      try {
        const log = await this.notificationsService.send({
          debtCaseId: task.debtCaseId,
          templateId: task.template?.id,
          channel: task.channel,
        });
        task.taskStatus = log.status === 'failed' ? 'failed' : 'sent';
      } catch (err) {
        this.logger.error(`Scheduled task ${task.id} failed: ${(err as Error).message}`);
        task.taskStatus = 'failed';
      }
      await this.repo.save(task);
    }
  }
}
