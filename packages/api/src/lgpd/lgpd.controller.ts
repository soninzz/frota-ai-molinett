import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

// Transparência (LGPD art. 9º) — política pública, sem autenticação de
// propósito: o titular precisa conseguir ler isso ANTES de logar.
@Controller('lgpd')
export class LgpdController {
  constructor(private config: ConfigService) {}

  @Get('politica')
  politica() {
    return {
      controlador: 'Transportes Molinett',
      encarregado: {
        // [A PREENCHER PELO CLIENTE] LGPD art. 41 exige encarregado com
        // contato público — não posso nomear alguém sem a Molinett indicar.
        nome: this.config.get<string>('DPO_NOME') || null,
        email: this.config.get<string>('DPO_EMAIL') || null,
        status: this.config.get<string>('DPO_EMAIL')
          ? 'configurado'
          : '[A VALIDAR] Molinett ainda não indicou o encarregado (DPO_NOME/DPO_EMAIL no .env)',
      },
      baseLegalPorTipoDeDado: {
        cadastroFuncionarios: 'Execução de contrato de trabalho (LGPD art. 7º, V)',
        cpfCnpjFiscal: 'Cumprimento de obrigação legal/regulatória (LGPD art. 7º, II)',
        gpsMotoristas: 'Legítimo interesse do controlador, com teste de balanceamento — LIA (LGPD art. 7º, IX)',
        vozTranscricao: 'Consentimento específico e destacado (LGPD art. 11, I) — dado sensível',
      },
      direitosDoTitular: {
        acesso: 'GET /auth/me/dados — resposta imediata (prazo legal: 15 dias)',
        correcao: 'PATCH /auth/me/dados',
        eliminacao: 'DELETE /auth/me/dados (anonimização, respeitando obrigação legal de retenção)',
        portabilidade: 'O export de /auth/me/dados já é em JSON, formato estruturado e legível por máquina',
      },
      prazoNotificacaoIncidente: '3 dias úteis à ANPD e aos titulares afetados (Res. CD/ANPD 15/2024)',
      retencao: 'Enquanto durar a obrigação legal (trabalhista/fiscal) ou o vínculo contratual, o que for maior',
    }
  }
}
