import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledTask } from './entities/scheduled-task.entity';
import { CreateScheduledTaskDto } from './dto/scheduled-task.dto';

@Injectable()
export class SchedulerService {
  constructor(
    @InjectRepository(ScheduledTask)
    private readonly repo: Repository<ScheduledTask>,
  ) {}

  async create(dto: CreateScheduledTaskDto): Promise<ScheduledTask> {
    const task = this.repo.create({
      debtCaseId: dto.debtCaseId,
      template: { id: dto.templateId } as any,
      channel: dto.channel,
      scheduledAt: new Date(dto.scheduledAt),
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
}
