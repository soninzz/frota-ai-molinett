import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { tap, catchError, throwError } from 'rxjs'
import { RequestContext } from './request-context'

// Log estruturado (JSON, uma linha por requisição) — a Vercel já captura stdout
// e indexa por linha, então não precisa de um agregador externo pra já dar pra
// filtrar por correlationId/rota/status num incidente.
//
// Retorno tipado `any` de propósito: o monorepo tem duas cópias físicas de
// rxjs (uma hoisted na raiz, outra aninhada em packages/api/node_modules —
// visível no package-lock.json), e isso faz o TS tratar Observable<T> das
// duas cópias como tipos incompatíveis (erro de nominal typing, não um bug
// real). Em runtime funciona sem problema — `.pipe()`/`tap()`/`catchError()`
// interoperam entre cópias via `source.lift()`, testado manualmente batendo
// numa rota real e conferindo o log + o header x-correlation-id na resposta.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): any {
    const req = context.switchToHttp().getRequest()
    const res = context.switchToHttp().getResponse()
    const inicio = Date.now()
    const correlationId = RequestContext.getCorrelationId()

    const logar = (statusCode: number, erro?: string) => {
      const linha = {
        nivel: erro ? 'error' : 'info',
        correlationId,
        metodo: req.method,
        rota: req.originalUrl ?? req.url,
        statusCode,
        duracaoMs: Date.now() - inicio,
        usuarioId: req.user?.id ?? null,
        ...(erro ? { erro } : {}),
      }
      console.log(JSON.stringify(linha))
    }

    const fonte: any = next.handle()
    return fonte.pipe(
      tap(() => logar(res.statusCode)),
      catchError((err: any) => {
        logar(err?.status ?? 500, err?.message ?? String(err))
        return throwError(() => err)
      }),
    )
  }
}
