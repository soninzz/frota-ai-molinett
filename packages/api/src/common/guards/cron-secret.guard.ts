import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

// Protege os endpoints /cron/* — não são pra usuário nenhum, só pra quem
// dispara os jobs agendados de fora (Vercel Cron Jobs manda esse header
// sozinho quando CRON_SECRET existe como env var; o pinger externo do
// rastreador, que roda a cada 5 min — frequência que o plano Hobby da
// Vercel não permite nativamente — é configurado à mão com o mesmo header).
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const esperado = this.config.get<string>('CRON_SECRET')
    const recebido = (req.headers['authorization'] as string | undefined)?.replace(/^Bearer\s+/i, '')

    if (!esperado || recebido !== esperado) {
      throw new UnauthorizedException('Acesso negado')
    }
    return true
  }
}
