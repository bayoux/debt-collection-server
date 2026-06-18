import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DebtCase } from './entities/debt-case.entity';
import { DpdSnapshot } from './entities/dpd-snapshot.entity';
import { Debtor } from '../debtors/entities/debtor.entity';
import {
  CreateDebtCaseDto,
  ImportDebtCaseResultDto,
  ImportDebtCaseRowDto,
  UpdateDebtCaseDto,
} from './dto/debt-case.dto';

@Injectable()
export class DebtCasesService {
  constructor(
    @InjectRepository(DebtCase) private readonly caseRepo: Repository<DebtCase>,
    @InjectRepository(DpdSnapshot) private readonly dpdRepo: Repository<DpdSnapshot>,
    @InjectRepository(Debtor) private readonly debtorRepo: Repository<Debtor>,
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

  async remove(id: string): Promise<void> {
    const c = await this.findOne(id);
    await this.caseRepo.remove(c);
  }

  async getDpdHistory(id: string): Promise<DpdSnapshot[]> {
    await this.findOne(id);
    return this.dpdRepo.find({
      where: { debtCaseId: id },
      order: { snapshotDate: 'DESC' },
    });
  }

  async bulkImport(fileBuffer: Buffer, mimeType: string): Promise<ImportDebtCaseResultDto> {
    const rows = this.parseFile(fileBuffer, mimeType);

    let imported = 0;
    let skipped = 0;
    const errors: ImportDebtCaseResultDto['errors'] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // 1-based + header row

      const raw = rows[i];
      const dto = plainToInstance(ImportDebtCaseRowDto, {
        fullName: raw.fullName ?? raw['full_name'],
        phone: raw.phone,
        email: raw.email || undefined,
        whatsappNumber: (raw.whatsappNumber ?? raw['whatsapp_number']) || undefined,
        telegramId: (raw.telegramId ?? raw['telegram_id']) || undefined,
        amount: raw.amount !== undefined ? Number(raw.amount) : undefined,
        dueDate: raw.dueDate ?? raw['due_date'],
        assignedAgentId: (raw.assignedAgentId ?? raw['assigned_agent_id']) || undefined,
      });

      const validationErrors = await validate(dto, { whitelist: true });
      if (validationErrors.length > 0) {
        for (const e of validationErrors) {
          errors.push({
            row: rowNumber,
            field: e.property,
            message: Object.values(e.constraints ?? {}).join('; '),
          });
        }
        skipped++;
        continue;
      }

      try {
        // Upsert debtor by phone (find existing or create new)
        let debtor = await this.debtorRepo.findOne({ where: { phone: dto.phone } });
        if (!debtor) {
          debtor = await this.debtorRepo.save(
            this.debtorRepo.create({
              fullName: dto.fullName,
              phone: dto.phone,
              email: dto.email ?? null,
              whatsappNumber: dto.whatsappNumber ?? null,
              telegramId: dto.telegramId ?? null,
            }),
          );
        }

        // Create debt case linked to debtor
        const due = new Date(dto.dueDate);
        const dpd = Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000));
        const c = this.caseRepo.create({
          debtor: { id: debtor.id } as any,
          assignedAgent: dto.assignedAgentId ? ({ id: dto.assignedAgentId } as any) : null,
          amount: dto.amount,
          dueDate: dto.dueDate,
          dpd,
        });
        const saved = await this.caseRepo.save(c);
        await this.snapshotDpd(saved.id, dpd);
        imported++;
      } catch (err) {
        errors.push({ row: rowNumber, field: 'general', message: (err as Error).message });
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  private parseFile(buffer: Buffer, mimeType: string): Record<string, any>[] {
    const isExcel =
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel';

    const workbook = XLSX.read(buffer, { type: 'buffer', raw: !isExcel });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    if (rows.length === 0) {
      throw new BadRequestException('File is empty or has no data rows');
    }
    return rows;
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
