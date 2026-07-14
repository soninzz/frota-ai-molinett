import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const origensExtras = (process.env.CORS_EXTRA_ORIGINS ?? '').split(',').filter(Boolean)
  app.enableCors({
    origin: [
      /^https:\/\/molinett(-[\w-]+)?\.vercel\.app$/,
      /^https:\/\/([\w-]+\.)?frotaai\.com$/,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      ...origensExtras,
    ],
    credentials: true,
  })

  await app.listen(3000)
}
bootstrap()