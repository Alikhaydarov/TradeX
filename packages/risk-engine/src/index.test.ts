import { describe, expect, it } from "vitest";
import { calculatePositionRisk } from "./index";

describe("calculatePositionRisk", () => {
  it("calculates deterministic position size", () => {
    expect(calculatePositionRisk({ balance: 10_000, riskPercent: 1, entryPrice: 100, stopLoss: 98, pointValue: 1 })).toEqual({
      riskAmount: 100,
      stopDistance: 2,
      positionSize: 50
    });
  });

  it("rejects an invalid stop distance", () => {
    expect(() => calculatePositionRisk({ balance: 10_000, riskPercent: 1, entryPrice: 100, stopLoss: 100, pointValue: 1 })).toThrow();
  });
});

