import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { DeleteReasonDto } from '../common/dto/delete-reason.dto';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { DistrictsService } from './districts.service';

@ApiTags('districts')
@Controller('districts')
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all districts (Public)' })
  list() {
    return this.districtsService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a district by ID (Public)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.districtsService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles('cryohealth_admin')
  @Post()
  create(@Body() dto: CreateDistrictDto, @Req() req: { user: JwtPayload }) {
    return this.districtsService.create(dto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles('cryohealth_admin')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistrictDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.districtsService.update(id, dto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles('cryohealth_admin')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteReasonDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.districtsService.remove(id, dto.reason, req.user.sub);
  }
}
