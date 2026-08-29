import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { GlaciersService } from './glaciers.service';
import { CreateGlacierDto } from './dto/create-glacier.dto';
import { UpdateGlacierDto } from './dto/update-glacier.dto';
import { DeleteReasonDto } from '../common/dto/delete-reason.dto';

@ApiTags('glaciers')
@Controller()
export class GlaciersController {
  constructor(private readonly glaciersService: GlaciersService) {}

  // ---------- Public ----------
  @Public()
  @ApiOperation({ summary: 'List all glaciers (public)' })
  @Get('glaciers')
  async listPublic() {
    return this.glaciersService.findAll();
  }

  @Public()
  @ApiOperation({ summary: 'Get one glacier (public)' })
  @Get('glaciers/:id')
  async getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const glacier = await this.glaciersService.findOne(id);
    if (!glacier) throw new NotFoundException('Glacier not found');
    return glacier;
  }

  @Public()
  @ApiOperation({ summary: 'List glacier observations (public)' })
  @Get('glaciers/:id/observations')
  async listObservations(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.glaciersService.findObservations(id);
  }

  // ---------- Admin (protected by global JwtAuthGuard + RolesGuard) ----------
  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List all glaciers' })
  @Get('admin/glaciers')
  async listAdmin() {
    return this.glaciersService.findAll();
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Create glacier' })
  @Post('admin/glaciers')
  async create(
    @Body() dto: CreateGlacierDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.glaciersService.create(dto, req.user.sub);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update glacier' })
  @Put('admin/glaciers/:id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGlacierDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.glaciersService.update(id, dto, req.user.sub);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: Delete glacier (blocked if observations exist)',
  })
  @Delete('admin/glaciers/:id')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() reasonDto: DeleteReasonDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.glaciersService.remove(id, reasonDto.reason, req.user.sub);
  }
}
