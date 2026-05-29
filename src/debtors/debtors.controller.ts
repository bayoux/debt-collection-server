import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DebtorsService } from './debtors.service';
import { Debtor } from './entities/debtor.entity';
import { CreateDebtorDto, UpdateDebtorDto } from './dto/debtor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Debtors')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('debtors')
export class DebtorsController {
  constructor(private readonly service: DebtorsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать должника' })
  @ApiCreatedResponse({ type: Debtor })
  create(@Body() dto: CreateDebtorDto): Promise<Debtor> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Список должников' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'page_size', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('page_size') pageSize = 20,
    @Query('search') search?: string,
  ) {
    const { data, total } = await this.service.findAll(+page, +pageSize, search);
    return { count: total, results: data };
  }

  @Post('import')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Массовый импорт из CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async import(@UploadedFile() file: any) {
    const csvContent = file.buffer.toString('utf-8');
    const count = await this.service.bulkImport(csvContent);
    return {
      task_id: `import-${Date.now()}`,
      message: `Import queued. ${count} rows detected.`,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить должника' })
  @ApiOkResponse({ type: Debtor })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Debtor> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить данные должника' })
  @ApiOkResponse({ type: Debtor })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDebtorDto,
  ): Promise<Debtor> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить должника' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
