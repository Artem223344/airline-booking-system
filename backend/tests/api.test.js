const request = require("supertest");
const app = require("../server");

describe("GET /api/flights", () => {
  it("should return 200 OK and a list of flights", async () => {
    const res = await request(app).get("/api/flights");

    expect(res.statusCode).toEqual(200);

    expect(Array.isArray(res.body)).toBeTruthy();

    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("from");
      expect(res.body[0]).toHaveProperty("to");
      expect(res.body[0]).toHaveProperty("price");
    }
  });
});
