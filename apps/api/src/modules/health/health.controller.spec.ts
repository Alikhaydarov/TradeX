import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("reports the API as healthy", () => {
    const result = new HealthController().check();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("tradoxy-api");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});

