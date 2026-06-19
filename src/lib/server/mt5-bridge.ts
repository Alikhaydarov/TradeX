export type Mt5BridgeDeal = {
  id: string;
  positionId?: string;
  symbol: string;
  type: string;
  entryType?: string;
  price: number;
  volume: number;
  profit?: number;
  commission?: number;
  swap?: number;
  time: string;
};

export async function testMt5BridgeLogin() {
  throw new Error("MT5 Python bridge is not enabled yet.");
}

export async function getMt5BridgeDeals() {
  throw new Error("MT5 Python bridge is not enabled yet.");
}
