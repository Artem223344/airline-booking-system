const request = require("supertest");
const app = require("../server");

describe("Integration: Error Handling", () => {
  it("should return 404 when booking non-existent flight", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send({
        flightId: 999999, // Такого ID не існує
        userEmail: "test@test.com",
        name: "Tester",
        email: "test@test.com",
        seats: [1],
      });

    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 if validation fails (missing fields)", async () => {
    const res = await request(app).post("/api/bookings").send({
      // Не відправляємо flightId та seats
      name: "Tester",
    });

    expect(res.statusCode).toEqual(400);
  });
});
