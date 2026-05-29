import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PtpRecord } from './entities/ptp-record.entity';
import { CreatePtpDto, UpdatePtpStatusDto } from './dto/ptp.dto';

@Injectable()
export class PtpService {
  constructor(
    @InjectRepository(PtpRecord) private readonly repo: Repository<PtpRecord>,
  ) {}

  async create(dto: CreatePtpDto, agentId: string): Promise<PtpRecord> {
    const record = this.repo.create({
      debtCaseId: dto.debtCaseId,
      agent: { id: agentId } as any,
      promiseDate: dto.promiseDate,
      promisedAmount: dto.promisedAmount,
      status: 'pending',
    });
    return this.repo.save(record);
  }

  async findAll(
    page = 1,
    pageSize = 20,
    filters: { status?: string; debtCaseId?: string } = {},
  ): Promise<{ data: PtpRecord[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.agent', 'agent')
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    if (filters.debtCaseId)
      qb.andWhere('p.debt_case_id = :debtCaseId', { debtCaseId: filters.debtCaseId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<PtpRecord> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`PtpRecord ${id} not found`);
    return record;
  }

  async updateStatus(id: string, dto: UpdatePtpStatusDto): Promise<PtpRecord> {
    const record = await this.findOne(id);
    record.status = dto.status;
    if (dto.note !== undefined) record.note = dto.note;
    return this.repo.save(record);
  }
}
