const { calculateTotal } = require("../utils");

describe("Unit Test: Price Calculation (Логіка цін)", () => {

    // --- БАЗОВІ ТЕСТИ ---

    test("should calculate base price correctly for 1 passenger", () => {
        const result = calculateTotal(100, 1, {});
        expect(result.totalPrice).toBe(100);
        expect(result.basePrice).toBe(100);
        expect(result.extraPrice).toBe(0);
    });

    test("should multiply price by number of passengers", () => {
        const result = calculateTotal(100, 3, {}); // 3 пасажири по $100
        expect(result.totalPrice).toBe(300);
        expect(result.basePrice).toBe(300);
    });

    test("should add price for Meal correctly", () => {
        // Їжа коштує $20
        const extras = { meal: true };
        const result = calculateTotal(100, 1, extras);
        
        expect(result.extraPrice).toBe(20);
        expect(result.totalPrice).toBe(120); // 100 + 20
    });

    test("should calculate complex case (2 passengers + Insurance + Upgrade)", () => {
        // Страховка (15) + Апгрейд (50) = 65 на одного
        // Для двох: 65 * 2 = 130
        const extras = { insurance: true, upgrade: true };
        
        const result = calculateTotal(100, 2, extras);
        
        // База: 100 * 2 = 200
        expect(result.basePrice).toBe(200);
        // Додатково: 130
        expect(result.extraPrice).toBe(130);
        // Разом: 330
        expect(result.totalPrice).toBe(330);
    });

    // --- НОВІ ТЕСТИ (EDGE CASES) ---

    test("should calculate correct total when ALL extras are selected", () => {
        // Meal(20) + Insurance(15) + Upgrade(50) = 85
        const extras = { meal: true, insurance: true, upgrade: true };
        
        const result = calculateTotal(100, 1, extras);
        
        expect(result.extraPrice).toBe(85);
        expect(result.totalPrice).toBe(185); // 100 + 85
    });

    test("should return 0 if passengers count is 0", () => {
        // Навіть якщо обрані послуги, 0 людей = $0
        const result = calculateTotal(100, 0, { meal: true });
        
        expect(result.totalPrice).toBe(0);
        expect(result.basePrice).toBe(0);
        expect(result.extraPrice).toBe(0);
    });

    test("should handle missing extras object (use defaults)", () => {
        // Викликаємо функцію без третього параметра
        const result = calculateTotal(100, 1); 
        
        expect(result.totalPrice).toBe(100);
        expect(result.extraPrice).toBe(0);
    });
});