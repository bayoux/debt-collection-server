import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Debtor } from './entities/debtor.entity';
import { CreateDebtorDto, UpdateDebtorDto } from './dto/debtor.dto';

@Injectable()
export class DebtorsService {
  constructor(
    @InjectRepository(Debtor) private readonly repo: Repository<Debtor>,
  ) {}

  async create(dto: CreateDebtorDto): Promise<Debtor> {
    const debtor = this.repo.create({
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      whatsappNumber: dto.whatsappNumber,
      telegramId: dto.telegramId,
    });
    return this.repo.save(debtor);
  }

  async findAll(
    page = 1,
    pageSize = 20,
    search?: string,
  ): Promise<{ data: Debtor[]; total: number }> {
    const where = search
      ? [
          { fullName: ILike(`%${search}%`) },
          { phone: ILike(`%${search}%`) },
        ]
      : undefined;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Debtor> {
    const debtor = await this.repo.findOne({ where: { id } });
    if (!debtor) throw new NotFoundException(`Debtor ${id} not found`);
    return debtor;
  }

  async update(id: string, dto: UpdateDebtorDto): Promise<Debtor> {
    const debtor = await this.findOne(id);
    Object.assign(debtor, dto);
    return this.repo.save(debtor);
  }

  async remove(id: string): Promise<void> {
    const debtor = await this.findOne(id);
    await this.repo.remove(debtor);
  }

  async bulkImport(csvContent: string): Promise<number> {
    const lines = csvContent.trim().split('\n').slice(1); // skip header
    let count = 0;
    for (const line of lines) {
      const [fullName, phone, email, whatsappNumber, telegramId] = line
        .split(',')
        .map((v) => v?.trim());
      if (!fullName || !phone) continue;
      const exists = await this.repo.findOne({ where: { phone } });
      if (!exists) {
        await this.repo.save(
          this.repo.create({ fullName, phone, email, whatsappNumber, telegramId }),
        );
        count++;
      }
    }
    return count;
  }
}
