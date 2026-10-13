export interface PositionRiskInput {
  balance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  pointValue: number;
}

export interface PositionRiskResult {
  riskAmount: number;
  stopDistance: number;
  positionSize: number;
}

export function calculatePositionRisk(input: PositionRiskInput): PositionRiskResult {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError("Risk inputs must be finite positive numbers");
  }
  if (input.riskPercent > 100) throw new RangeError("Risk percent cannot exceed 100");

  const riskAmount = input.balance * (input.riskPercent / 100);
  const stopDistance = Math.abs(input.entryPrice - input.stopLoss);
  if (stopDistance === 0) throw new RangeError("Entry price and stop loss must differ");

  return {
    riskAmount,
    stopDistance,
    positionSize: riskAmount / (stopDistance * input.pointValue)
  };
}

