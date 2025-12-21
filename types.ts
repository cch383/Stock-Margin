
export interface MarginRatio {
  s: number; // Settlement
  m: number; // Maintenance
  i: number; // Initial
}

export interface FutureContract {
  code: string;
  name: string;
  stockCode: string;
  ratio: MarginRatio;
  sharesPerContract: number;
}

export interface CalculationResult {
  settlement: number;
  maintenance: number;
  initial: number;
  contractValue: number;
  leverage: number;
}

export interface RiskAnalysis {
  leverageRisk: string;
  marginCallRisk: string;
  recommendation: string;
}
