import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import express, { Request, Response } from 'express'
import { AppModule } from '../src/app.module'

// Entrada serverless (Vercel). O Nest sobe uma vez por instância (cold start)
// e fica cacheado; cada request seguinte reaproveita o app.
// Atenção: crons do @nestjs/schedule NÃO rodam em serverless — o scheduler
// do rastreador e os resumos diários precisam de um processo persistente
// (Railway/VM) ou de Vercel Cron chamando endpoints dedicados.
const server = express()
let bootPromise: Promise<void> | null = null

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  })
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'https://molinett.vercel.app',
      'https://molinett.frotaai.com',
    ],
    credentials: true,
  })
  await app.init()
}

export default async function handler(req: Request, res: Response) {
  if (!bootPromise) bootPromise = bootstrap()
  await bootPromise
  server(req, res)
}
