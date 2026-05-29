import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebtCase } from './entities/debt-case.entity';
import { DpdSnapshot } from './entities/dpd-snapshot.entity';
import { CreateDebtCaseDto, UpdateDebtCaseDto } from './dto/debt-case.dto';

@Injectable()
export class DebtCasesService {
  constructor(
    @InjectRepository(DebtCase) private readonly caseRepo: Repository<DebtCase>,
    @InjectRepository(DpdSnapshot) private readonly dpdRepo: Repository<DpdSnapshot>,
  ) {}

  async create(dto: CreateDebtCaseDto): Promise<DebtCase> {
    const due = new Date(dto.dueDate);
    const dpd = Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000));

    const c = this.caseRepo.create({
      debtor: { id: dto.debtorId } as any,
      assignedAgent: dto.assignedAgentId ? ({ id: dto.assignedAgentId } as any) : null,
      amount: dto.amount,
      dueDate: dto.dueDate,
      dpd,
    });
    const saved = await this.caseRepo.save(c);
    await this.snapshotDpd(saved.id, dpd);
    return this.findOne(saved.id);
  }

  async findAll(
    page = 1,
    pageSize = 20,
    filters: {
      status?: string;
      dpdMin?: number;
      dpdMax?: number;
      assignedAgentId?: string;
    } = {},
  ): Promise<{ data: DebtCase[]; total: number }> {
    const qb = this.caseRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.debtor', 'debtor')
      .leftJoinAndSelect('c.assignedAgent', 'agent')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.status) qb.andWhere('c.status = :status', { status: filters.status });
    if (filters.dpdMin !== undefined) qb.andWhere('c.dpd >= :dpdMin', { dpdMin: filters.dpdMin });
    if (filters.dpdMax !== undefined) qb.andWhere('c.dpd <= :dpdMax', { dpdMax: filters.dpdMax });
    if (filters.assignedAgentId)
      qb.andWhere('agent.id = :agentId', { agentId: filters.assignedAgentId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<DebtCase> {
    const c = await this.caseRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`DebtCase ${id} not found`);
    return c;
  }

  async update(id: string, dto: UpdateDebtCaseDto): Promise<DebtCase> {
    const c = await this.findOne(id);
    if (dto.status !== undefined) c.status = dto.status;
    if (dto.assignedAgentId !== undefined)
      c.assignedAgent = dto.assignedAgentId ? ({ id: dto.assignedAgentId } as any) : null;
    return this.caseRepo.save(c);
  }

  async getDpdHistory(id: string): Promise<DpdSnapshot[]> {
    await this.findOne(id);
    return this.dpdRepo.find({
      where: { debtCaseId: id },
      order: { snapshotDate: 'DESC' },
    });
  }

  private async snapshotDpd(debtCaseId: string, dpdValue: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.dpdRepo.findOne({
      where: { debtCaseId, snapshotDate: today },
    });
    if (!existing) {
      await this.dpdRepo.save(this.dpdRepo.create({ debtCaseId, dpdValue, snapshotDate: today }));
    }
  }
}
