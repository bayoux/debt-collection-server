import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig } from './entities/integration-config.entity';
import { CreateIntegrationConfigDto } from './dto/integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(IntegrationConfig)
    private readonly repo: Repository<IntegrationConfig>,
  ) {}

  async create(dto: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    const config = this.repo.create({
      channel: dto.channel,
      provider: dto.provider,
      apiKey: dto.apiKey,
      webhookUrl: dto.webhookUrl,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(config);
  }

  async findAll(): Promise<IntegrationConfig[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<IntegrationConfig> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`IntegrationConfig ${id} not found`);
    return config;
  }

  async update(id: string, dto: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    const config = await this.findOne(id);
    Object.assign(config, dto);
    return this.repo.save(config);
  }

  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.repo.remove(config);
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({
      where: { id },
      select: ['id', 'channel', 'provider', 'apiKey', 'webhookUrl', 'isActive'],
    });
    if (!config) throw new NotFoundException(`IntegrationConfig ${id} not found`);

    // Stub: in production, perform real connectivity check using config.apiKey
    return {
      success: config.isActive,
      message: config.isActive
        ? `Connection to ${config.provider} (${config.channel}) OK`
        : `Integration is disabled`,
    };
  }
}
