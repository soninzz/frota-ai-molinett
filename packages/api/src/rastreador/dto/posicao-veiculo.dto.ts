export interface PosicaoVeiculo {
  veiculoIdExterno: string   // ID do veículo no sistema de origem
  placa: string
  latitude: number
  longitude: number
  velocidade: number
  motorLigado: boolean
  timestamp: Date
  fonte: 'assemilsat' | 'megasat'
}