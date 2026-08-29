import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { DeleteReasonDto } from '../common/dto/delete-reason.dto';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseAdminDto } from './dto/update-case-admin.dto';

@ApiBearerAuth()
@ApiTags('cases')
@Controller()
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Roles('chw')
  @Post('cases')
  @ApiOperation({
    summary: 'Sync a CHW case captured on-device (idempotent by clientCaseId)',
  })
  create(@Body() dto: CreateCaseDto, @Req() req: { user: JwtPayload }) {
    return this.cases.create(req.user.sub, dto);
  }

  @Roles('chw')
  @Get('cases')
  @ApiOperation({ summary: "The current CHW's own case history (paginated)" })
  list(
    @Req() req: { user: JwtPayload },
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.cases.listForUser(req.user.sub, page, pageSize);
  }

  // ---------- Admin Endpoints ----------
  @Roles('cryohealth_admin')
  @Get('admin/cases')
  @ApiOperation({ summary: 'Admin: List non-deleted cases with total count' })
  listAdmin(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.cases.listAdmin(limit || 200);
  }

  @Roles('cryohealth_admin')
  @Put('admin/cases/:id')
  @ApiOperation({ summary: 'Admin: Update case fields' })
  updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseAdminDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.cases.updateAdmin(id, dto, req.user.sub);
  }

  @Roles('cryohealth_admin')
  @Delete('admin/cases/:id')
  @ApiOperation({ summary: 'Admin: Soft-delete case' })
  removeAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reasonDto: DeleteReasonDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.cases.removeAdmin(id, reasonDto.reason, req.user.sub);
  }
}
