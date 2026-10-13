import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"], credentials: true });
  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 4000), "0.0.0.0");
}

void bootstrap();

