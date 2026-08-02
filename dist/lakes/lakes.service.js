"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LakesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const lake_entity_1 = require("./entities/lake.entity");
const observation_entity_1 = require("./entities/observation.entity");
const MAX_PAGE = 100;
let LakesService = class LakesService {
    lakes;
    observations;
    constructor(lakes, observations) {
        this.lakes = lakes;
        this.observations = observations;
    }
    async list(page = 1, pageSize = 50) {
        const take = Math.min(pageSize, MAX_PAGE);
        const [items, total] = await this.lakes.findAndCount({
            order: { name: 'ASC' },
            skip: (page - 1) * take,
            take,
        });
        return { items, total, page, pageSize: take };
    }
    async byId(id) {
        const lake = await this.lakes.findOne({ where: { id } });
        if (!lake)
            throw new common_1.NotFoundException('No such lake');
        return lake;
    }
    async observations_(lakeId, page = 1, pageSize = 100) {
        const take = Math.min(pageSize, 500);
        const [items, total] = await this.observations.findAndCount({
            where: { lakeId },
            order: { capturedAt: 'DESC' },
            skip: (page - 1) * take,
            take,
        });
        return { items, total, page, pageSize: take };
    }
};
exports.LakesService = LakesService;
exports.LakesService = LakesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lake_entity_1.Lake)),
    __param(1, (0, typeorm_1.InjectRepository)(observation_entity_1.Observation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LakesService);
//# sourceMappingURL=lakes.service.js.map