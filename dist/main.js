"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.enableShutdownHooks();
    const config = app.get(config_1.ConfigService);
    const doc = swagger_1.SwaggerModule.createDocument(app, new swagger_1.DocumentBuilder()
        .setTitle('CryoHealth API')
        .setDescription('GLOF monitoring + CHW health platform. /lakes, /alerts, /observations are the public Open Data API.')
        .setVersion('0.1')
        .addBearerAuth()
        .build());
    swagger_1.SwaggerModule.setup('docs', app, doc);
    await app.listen(config.get('port', 3000));
}
void bootstrap();
//# sourceMappingURL=main.js.map