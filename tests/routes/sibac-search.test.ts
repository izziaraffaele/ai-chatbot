import { expect, test } from "../fixtures";

// Regex pattern for recordId validation
const SIBAC_SHARED_PREFIX_REGEX = /^sibac-shared:/;

test.describe("/api/sibac/search", () => {
  test("returns empty results when no files indexed", async ({ adaContext }) => {
    const response = await adaContext.request.get("/api/sibac/search");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
    expect(data).toHaveProperty("nextCursor");
  });

  test("accepts search query parameter", async ({ adaContext }) => {
    const response = await adaContext.request.get(
      "/api/sibac/search?q=test+file"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });

  test("accepts extension filter", async ({ adaContext }) => {
    const response = await adaContext.request.get("/api/sibac/search?ext=xml");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
  });

  test("accepts ext=all to search all extensions", async ({ adaContext }) => {
    const response = await adaContext.request.get("/api/sibac/search?ext=all");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
  });

  test("respects limit parameter", async ({ adaContext }) => {
    const response = await adaContext.request.get("/api/sibac/search?limit=10");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
    // Items should not exceed limit (though may be less if fewer results)
    expect(data.items.length).toBeLessThanOrEqual(10);
  });

  test("enforces maximum limit", async ({ adaContext }) => {
    // Request with limit > 200 should be capped
    const response = await adaContext.request.get(
      "/api/sibac/search?limit=500"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
    // Even with 500 requested, should be capped at 200
    expect(data.items.length).toBeLessThanOrEqual(200);
  });

  test("handles invalid limit gracefully", async ({ adaContext }) => {
    const response = await adaContext.request.get(
      "/api/sibac/search?limit=invalid"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
  });

  test("accepts cursor for pagination", async ({ adaContext }) => {
    // First request to get potential cursor
    const firstResponse = await adaContext.request.get(
      "/api/sibac/search?limit=5"
    );
    expect(firstResponse.status()).toBe(200);

    const firstData = await firstResponse.json();
    expect(firstData).toHaveProperty("nextCursor");

    // If there's a cursor, make second request
    if (firstData.nextCursor) {
      const secondResponse = await adaContext.request.get(
        `/api/sibac/search?limit=5&cursor=${firstData.nextCursor}`
      );
      expect(secondResponse.status()).toBe(200);

      const secondData = await secondResponse.json();
      expect(secondData).toHaveProperty("items");
    }
  });

  test("handles invalid cursor gracefully", async ({ adaContext }) => {
    const response = await adaContext.request.get(
      "/api/sibac/search?cursor=invalid_base64"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
  });

  test("returns correct item structure", async ({ adaContext }) => {
    const response = await adaContext.request.get("/api/sibac/search");
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Check response structure
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("nextCursor");

    // If there are items, verify structure (file metadata only)
    if (data.items.length > 0) {
      const item = data.items[0];
      expect(item).toHaveProperty("path");
      expect(item).toHaveProperty("recordId");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("ext");
      expect(item).toHaveProperty("size");
      expect(item).toHaveProperty("mtime");

      // recordId should have sibac-shared: prefix
      expect(item.recordId).toMatch(SIBAC_SHARED_PREFIX_REGEX);

      // Should NOT have invoice data fields (privacy)
      expect(item).not.toHaveProperty("supplier");
      expect(item).not.toHaveProperty("supplierVatId");
      expect(item).not.toHaveProperty("invoiceNumber");
      expect(item).not.toHaveProperty("fatturaValida");
    }
  });

  test("combines search query with extension filter", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.get(
      "/api/sibac/search?q=test&ext=xml&limit=20"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
  });
});
