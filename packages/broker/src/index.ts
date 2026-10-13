export interface BrokerAccountSnapshot {
  externalId: string;
  brokerName: string;
  currency: string;
  balance: number;
  equity: number;
  capturedAt: Date;
}

export interface BrokerTrade {
  externalId: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  profit: number;
  openedAt: Date;
  closedAt?: Date;
}

export interface BrokerProvider {
  readonly id: string;
  testConnection(): Promise<boolean>;
  getAccountSnapshot(): Promise<BrokerAccountSnapshot>;
  listTrades(since?: Date): Promise<BrokerTrade[]>;
}

export class MockBrokerProvider implements BrokerProvider {
  readonly id = "mock";

  async testConnection() { return true; }
  async getAccountSnapshot(): Promise<BrokerAccountSnapshot> {
    return { externalId: "demo-001", brokerName: "Tradoxy Demo", currency: "USD", balance: 100_000, equity: 101_240, capturedAt: new Date() };
  }
  async listTrades(): Promise<BrokerTrade[]> { return []; }
}

