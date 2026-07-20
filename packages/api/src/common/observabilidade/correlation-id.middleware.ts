import { Injectable, NestMiddleware } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Request, Response, NextFunction } from 'express'
import { RequestContext } from './request-context'

const HEADER = 'x-correlation-id'

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers[HEADER] as string) || randomUUID()
    res.setHeader(HEADER, correlationId)
    RequestContext.run({ correlationId }, () => next())
  }
}
