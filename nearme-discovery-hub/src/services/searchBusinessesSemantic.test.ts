import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";
import { searchBusinessesSemantic } from "@/services/api";
import { apiClient } from "@/lib/api_client";

vi.mock("@/lib/api_client", () => ({ apiClient: { get: vi.fn() } }));
const get = vi.mocked(apiClient.get);

const apiBusiness = {
  _id: "b1",
  owner_id: "o1",
  name: "Café Aroha",
  category: "Cafe",
  description: "Work-friendly cafe",
  address: "10 MP Nagar",
  city: "Bhopal",
  location: { lat: 23.2, lng: 77.4 },
  contact_number: "+917554001122",
  timings: [],
  images: ["https://example.com/cover.jpg"],
  services: ["Wi-Fi"],
  is_verified: true,
  is_active: true,
  verification_status: "approved",
  rating: 4.2,
  review_count: 6,
  followers: 10,
  created_at: "2026-04-23T11:54:05",
  similarity_score: 0.75,
};

const ok = (data: unknown) => ({ data: { success: true, message: "Success", data } }) as AxiosResponse;

describe("searchBusinessesSemantic", () => {
  beforeEach(() => get.mockReset());

  it("maps businesses and passes the query, signal and a long timeout", async () => {
    get.mockResolvedValueOnce(ok({ businesses: [apiBusiness], degraded_to_keyword_search: false }));
    const controller = new AbortController();

    const result = await searchBusinessesSemantic("quiet cafe", { signal: controller.signal });

    expect(result.degraded).toBe(false);
    expect(result.businesses).toHaveLength(1);
    expect(result.businesses[0]).toMatchObject({ _id: "b1", name: "Café Aroha", coverImage: "https://example.com/cover.jpg" });
    expect(get).toHaveBeenCalledWith(
      "/businesses/search/semantic",
      expect.objectContaining({ params: { q: "quiet cafe", limit: undefined }, signal: controller.signal, timeout: 60_000 })
    );
  });

  it("reports degraded results from the server's keyword fallback", async () => {
    get.mockResolvedValueOnce(ok({ businesses: [], degraded_to_keyword_search: true }));
    const result = await searchBusinessesSemantic("quiet cafe");
    expect(result).toEqual({ businesses: [], degraded: true });
  });

  it("falls back to keyword search when the endpoint doesn't exist (404)", async () => {
    const notFound = new AxiosError("Not Found", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404, statusText: "Not Found", data: {}, headers: {}, config: {} as never,
    });
    get
      .mockRejectedValueOnce(notFound)
      .mockResolvedValueOnce(ok({ businesses: [apiBusiness], total: 1, has_more: false }));

    const result = await searchBusinessesSemantic("cafe");

    expect(result.degraded).toBe(true);
    expect(result.businesses.map((b) => b._id)).toEqual(["b1"]);
    expect(get).toHaveBeenLastCalledWith("/businesses/", { params: { search: "cafe", limit: 12 } });
  });

  it("rethrows other errors so the page can show its error state", async () => {
    const serverError = new AxiosError("Server Error", "ERR_BAD_RESPONSE", undefined, undefined, {
      status: 500, statusText: "Internal Server Error", data: {}, headers: {}, config: {} as never,
    });
    get.mockRejectedValueOnce(serverError);
    await expect(searchBusinessesSemantic("cafe")).rejects.toBe(serverError);
  });
});
