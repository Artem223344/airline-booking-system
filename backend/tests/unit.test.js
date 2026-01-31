const { calculateTotal } = require("../utils");

describe("Unit Test: Price Calculation", () => {
  test("should calculate base price correctly for 1 passenger", () => {
    const result = calculateTotal(100, 1, {});
    expect(result.totalPrice).toBe(100);
    expect(result.basePrice).toBe(100);
  });

  test("should add extras correctly", () => {
    const result = calculateTotal(100, 1, { meal: true });
    // 100 (ticket) + 20 (meal) = 120
    expect(result.totalPrice).toBe(120);
    expect(result.extraPrice).toBe(20);
  });

  test("should multiply extras by passengers count", () => {
    const result = calculateTotal(100, 2, { insurance: true });
    // (100 * 2) + (15 * 2) = 200 + 30 = 230
    expect(result.totalPrice).toBe(230);
  });
});
