import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'
import { Perfil } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { AuditoriaService } from '../common/auditoria/auditoria.service'

// Gera uma senha temporária legível (sem caracteres ambíguos tipo 0/O, 1/l).
function gerarSenhaTemporaria(): string {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(12)
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('')
}

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
  ) {}

  async listar() {
    return this.prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, perfil: true, whatsappNumero: true, ativo: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' },
    })
  }

  async criar(dto: { nome: string; email: string; perfil: Perfil; whatsappNumero?: string }, usuarioId: string) {
    const existente = await this.prisma.usuario.findUnique({ where: { email: dto.email } })
    if (existente) throw new BadRequestException('Já existe um usuário com esse e-mail')

    const senha = gerarSenhaTemporaria()
    const senhaHash = await bcrypt.hash(senha, 10)

    const criado = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        perfil: dto.perfil,
        whatsappNumero: dto.whatsappNumero,
        senhaHash,
      },
    })

    await this.auditoria.registrar({
      usuarioId,
      entidade: 'Usuario',
      registroId: criado.id,
      acao: 'CRIAR',
      depois: { nome: criado.nome, email: criado.email, perfil: criado.perfil },
    })

    // Senha só é retornada nessa resposta — não fica recuperável depois
    // (mesmo padrão de "mostrar uma vez" de token/chave de API).
    return {
      id: criado.id,
      nome: criado.nome,
      email: criado.email,
      perfil: criado.perfil,
      senhaTemporaria: senha,
    }
  }

  async alternarAtivo(id: string, ativo: boolean, usuarioId: string) {
    const alvo = await this.prisma.usuario.findUnique({ where: { id } })
    if (!alvo) throw new NotFoundException('Usuário não encontrado')
    if (alvo.id === usuarioId && !ativo) {
      throw new BadRequestException('Você não pode desativar sua própria conta')
    }

    const atualizado = await this.prisma.usuario.update({ where: { id }, data: { ativo } })

    await this.auditoria.registrar({
      usuarioId,
      entidade: 'Usuario',
      registroId: id,
      acao: ativo ? 'REATIVAR' : 'DESATIVAR',
      antes: { ativo: alvo.ativo },
      depois: { ativo: atualizado.ativo },
    })

    return atualizado
  }

  async resetarSenha(id: string, usuarioId: string) {
    const alvo = await this.prisma.usuario.findUnique({ where: { id } })
    if (!alvo) throw new NotFoundException('Usuário não encontrado')

    const senha = gerarSenhaTemporaria()
    const senhaHash = await bcrypt.hash(senha, 10)
    await this.prisma.usuario.update({ where: { id }, data: { senhaHash } })

    await this.auditoria.registrar({
      usuarioId,
      entidade: 'Usuario',
      registroId: id,
      acao: 'RESETAR_SENHA',
    })

    return { id: alvo.id, email: alvo.email, senhaTemporaria: senha }
  }
}
