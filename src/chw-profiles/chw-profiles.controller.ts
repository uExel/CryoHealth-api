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
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DeleteReasonDto } from '../common/dto/delete-reason.dto';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { ChwProfilesService } from './chw-profiles.service';
import { CreateChwProfileDto } from './dto/create-chw-profile.dto';
import { UpdateChwProfileDto } from './dto/update-chw-profile.dto';

@ApiTags('chw-profiles')
@Controller()
export class ChwProfilesController {
  constructor(private readonly chwProfilesService: ChwProfilesService) {}

  // ---------- Public ----------
  @Public()
  @ApiOperation({ summary: 'List all CHW profiles (public)' })
  @Get('chw-profiles')
  listPublic() {
    return this.chwProfilesService.findAllPublic();
  }

  @Public()
  @ApiOperation({ summary: 'Get one CHW profile (public)' })
  @Get('chw-profiles/:id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.chwProfilesService.findOne(id);
  }

  // ---------- Admin ----------
  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List CHW profiles with pagination total' })
  @Get('admin/chw-profiles')
  listAdmin(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.chwProfilesService.listAdmin(limit || 200);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Create CHW profile' })
  @Post('admin/chw-profiles')
  create(@Body() dto: CreateChwProfileDto, @Req() req: { user: JwtPayload }) {
    return this.chwProfilesService.create(dto, req.user.sub);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update CHW profile' })
  @Put('admin/chw-profiles/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChwProfileDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.chwProfilesService.update(id, dto, req.user.sub);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Delete CHW profile' })
  @Delete('admin/chw-profiles/:id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reasonDto: DeleteReasonDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.chwProfilesService.remove(id, reasonDto.reason, req.user.sub);
  }
}
