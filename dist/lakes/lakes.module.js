"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LakesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const lake_entity_1 = require("./entities/lake.entity");
const observation_entity_1 = require("./entities/observation.entity");
const lakes_controller_1 = require("./lakes.controller");
const lakes_service_1 = require("./lakes.service");
let LakesModule = class LakesModule {
};
exports.LakesModule = LakesModule;
exports.LakesModule = LakesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([lake_entity_1.Lake, observation_entity_1.Observation])],
        controllers: [lakes_controller_1.LakesController],
        providers: [lakes_service_1.LakesService],
    })
], LakesModule);
//# sourceMappingURL=lakes.module.js.map