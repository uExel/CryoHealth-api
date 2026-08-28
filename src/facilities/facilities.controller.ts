import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { JwtPayload } from '../common/types/jwt-payload.type';
import { DeleteReasonDto } from '../common/dto/delete-reason.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilitiesService } from './facilities.service';

@ApiTags('facilities')
@Controller()
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Public()
  @Get('facilities')
  @ApiOperation({ summary: 'List all facilities with coordinates (Public)' })
  listPublic() {
    return this.facilitiesService.findAllPublic();
  }

  @ApiBearerAuth()
  @Roles('cryohealth_admin')
  @Get('admin/facilities')
  @ApiOperation({ summary: 'List facilities with full details for admin (Admin only)' })
  listAdmin(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.facilitiesService.findAllAdmin(limit ?? 200);
  }

  @Public()
  @Get('facilities/:id')
  @ApiOperation({ summary: 'Get facility by ID (Public)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.facilitiesService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles('cryohealth_admin')
  @Post('admin/facilities')
  @ApiOperation({ summary: 'Create a new facility (Admin only)' })
  create(@Body() dto: CreateFacilityDto, @Req() req: { user: JwtPayload }) {
    return this.facilitiesService.create(dto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles('cryohealth_admin')
  @Put('admin/facilities/:id')
  @ApiOperation({ summary: 'Update an existing facility (Admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilityDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.facilitiesService.update(id, dto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles('cryohealth_admin')
  @Delete('admin/facilities/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a facility (Admin only)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteReasonDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.facilitiesService.remove(id, dto.reason, req.user.sub);
  }
}
