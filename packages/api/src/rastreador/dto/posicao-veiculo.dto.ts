export interface PosicaoVeiculo {
  veiculoIdExterno: string   // ID do veículo no sistema do Assemilsat
  placa: string
  latitude: number
  longitude: number
  velocidade: number
  motorLigado: boolean
  timestamp: Date
}