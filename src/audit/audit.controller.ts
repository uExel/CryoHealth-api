import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('audit')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Admin audit log with filters, pagination, and CSV export' })
  async getAuditLog(@Query() query: AuditQueryDto, @Res() res: Response) {
    const result = await this.auditService.getAuditLog(query);

    if (result.isCsv) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.csvString);
    }

    return res.status(200).json(result);
  }
}
