import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';

@ApiBearerAuth()
@ApiTags('cases')
@Roles('chw')
@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Post()
  @ApiOperation({
    summary: 'Sync a CHW case captured on-device (idempotent by clientCaseId)',
  })
  create(@Body() dto: CreateCaseDto, @Req() req: { user: JwtPayload }) {
    return this.cases.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: "The current CHW's own case history (paginated)" })
  list(
    @Req() req: { user: JwtPayload },
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.cases.listForUser(req.user.sub, page, pageSize);
  }
}
