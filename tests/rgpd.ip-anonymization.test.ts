/**
 * rgpd.ip-anonymization.test.ts — Test IP anonymization compliance
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): IP address anonymization
 * - CNIL Recommendation: Last octet zeroing for IPv4, /64 prefix for IPv6
 * - LOT 8.1: IP Anonymization
 */

import {
  anonymizeIPv4,
  anonymizeIPv6,
  anonymizeIP,
  isAnonymized,
} from "@/infrastructure/pii/anonymizer";

describe("RGPD - IP Address Anonymization", () => {
  describe("IPv4 Anonymization", () => {
    it("anonymizes IPv4 by zeroing last octet", () => {
      expect(anonymizeIPv4("192.168.1.42")).toBe("192.168.1.0");
      expect(anonymizeIPv4("10.0.0.1")).toBe("10.0.0.0");
      expect(anonymizeIPv4("172.16.254.123")).toBe("172.16.254.0");
    });

    it("preserves already anonymized IPv4", () => {
      expect(anonymizeIPv4("192.168.1.0")).toBe("192.168.1.0");
      expect(anonymizeIPv4("10.0.0.0")).toBe("10.0.0.0");
    });

    it("throws on invalid IPv4 format", () => {
      expect(() => anonymizeIPv4("invalid")).toThrow("Invalid IPv4 address");
      expect(() => anonymizeIPv4("999.999.999.999")).toThrow(
        "Invalid IPv4 address"
      );
      expect(() => anonymizeIPv4("192.168.1")).toThrow("Invalid IPv4 address");
    });

    it("handles edge case IPv4 addresses", () => {
      expect(anonymizeIPv4("0.0.0.1")).toBe("0.0.0.0");
      expect(anonymizeIPv4("255.255.255.255")).toBe("255.255.255.0");
    });
  });

  describe("IPv6 Anonymization", () => {
    it("anonymizes IPv6 by zeroing last 64 bits", () => {
      expect(anonymizeIPv6("2001:db8::1")).toBe("2001:db8:0:0::");
      expect(anonymizeIPv6("2001:0db8:0000:0000:0000:0000:0000:0001")).toBe(
        "2001:db8:0:0::"
      );
    });

    it("handles compressed IPv6 notation", () => {
      expect(anonymizeIPv6("2001:db8::1")).toBe("2001:db8:0:0::");
      expect(anonymizeIPv6("fe80::1")).toBe("fe80:0:0:0::");
    });

    it("preserves already anonymized IPv6", () => {
      expect(anonymizeIPv6("2001:db8::")).toBe("2001:db8:0:0::");
      expect(anonymizeIPv6("fe80::")).toBe("fe80:0:0:0::");
    });

    it("throws on invalid IPv6 format", () => {
      expect(() => anonymizeIPv6("invalid")).toThrow("Invalid IPv6 address");
      expect(() => anonymizeIPv6("gggg::1")).toThrow("Invalid IPv6 address");
    });

    it("handles full IPv6 addresses", () => {
      expect(
        anonymizeIPv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334")
      ).toBe("2001:db8:85a3:0::");
    });
  });

  describe("Auto-detection (anonymizeIP)", () => {
    it("auto-detects and anonymizes IPv4", () => {
      expect(anonymizeIP("192.168.1.42")).toBe("192.168.1.0");
      expect(anonymizeIP("10.0.0.1")).toBe("10.0.0.0");
    });

    it("auto-detects and anonymizes IPv6", () => {
      expect(anonymizeIP("2001:db8::1")).toBe("2001:db8:0:0::");
      expect(anonymizeIP("fe80::1")).toBe("fe80:0:0:0::");
    });

    it("throws on invalid IP address", () => {
      expect(() => anonymizeIP("invalid")).toThrow("Invalid IP address");
      expect(() => anonymizeIP("not-an-ip")).toThrow("Invalid IP address");
    });
  });

  describe("Anonymization Detection", () => {
    it("detects anonymized IPv4 addresses", () => {
      expect(isAnonymized("192.168.1.0")).toBe(true);
      expect(isAnonymized("10.0.0.0")).toBe(true);
      expect(isAnonymized("192.168.1.42")).toBe(false);
    });

    it("detects anonymized IPv6 addresses", () => {
      expect(isAnonymized("2001:db8::")).toBe(true);
      expect(isAnonymized("fe80::")).toBe(true);
      expect(isAnonymized("2001:db8::1")).toBe(false);
    });

    it("handles invalid IP addresses gracefully", () => {
      expect(isAnonymized("invalid")).toBe(false);
      expect(isAnonymized("not-an-ip")).toBe(false);
    });
  });
});
