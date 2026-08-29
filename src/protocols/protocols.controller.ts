import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DeleteReasonDto } from '../common/dto/delete-reason.dto';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { CreateProtocolDto } from './dto/create-protocol.dto';
import { UpdateProtocolDto } from './dto/update-protocol.dto';
import { ProtocolsService } from './protocols.service';

@ApiTags('protocols')
@Controller()
export class ProtocolsController {
  constructor(private readonly protocols: ProtocolsService) {}

  // ---------- Public ----------
  @Public()
  @ApiOperation({ summary: 'List all protocols (public)' })
  @Get('protocols')
  listAll() {
    return this.protocols.findAll();
  }

  @Public()
  @ApiOperation({ summary: 'Get one protocol (public)' })
  @Get('protocols/:id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.protocols.findOne(id);
  }

  // ---------- Admin ----------
  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List all protocols' })
  @Get('admin/protocols')
  listAdmin() {
    return this.protocols.findAll();
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Create protocol' })
  @Post('admin/protocols')
  create(@Body() dto: CreateProtocolDto, @Req() req: { user: JwtPayload }) {
    return this.protocols.create(dto, req.user.sub);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update protocol (slug is immutable)' })
  @Put('admin/protocols/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProtocolDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.protocols.update(id, dto, req.user.sub);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Delete protocol' })
  @Delete('admin/protocols/:id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reasonDto: DeleteReasonDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.protocols.remove(id, reasonDto.reason, req.user.sub);
  }
}
