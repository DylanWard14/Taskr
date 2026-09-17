import { describe, expect, it } from "vitest";
import { app } from "./index.js";

describe("CORS", () => {
  it("allows the configured client origin on a preflight request", async () => {
    const res = await app.request("/auth/signup", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-headers")).toContain("Authorization");
  });

  it("echoes the allowed origin on a real request", async () => {
    const res = await app.request("/health", {
      headers: { Origin: "http://localhost:5173" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });
});
