/**
 * Security Tests for HTML Sanitizer
 *
 * These tests verify that the sanitizer correctly prevents XSS attacks.
 * CRITICAL: These tests MUST pass before any release.
 *
 * Reference: .claude/rules/security.md - "Sanitization"
 * OWASP: A03:2021 - Injection (XSS)
 */

import { describe, it, expect } from "@jest/globals";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

describe("sanitizeHtml - XSS Prevention", () => {
  describe("Script tag removal", () => {
    it("should remove simple script tags", () => {
      const malicious = '<script>alert("XSS")</script><p>Safe content</p>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<script");
      expect(result).not.toContain("</script");
      expect(result).not.toContain("alert");
      expect(result).toContain("<p>Safe content</p>");
    });

    it("should remove script tags with attributes", () => {
      const malicious = '<script src="evil.js"></script><p>Safe</p>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<script");
      expect(result).not.toContain("evil.js");
      expect(result).toContain("<p>Safe</p>");
    });

    it("should remove script tags with type attribute", () => {
      const malicious = '<script type="text/javascript">alert(1)</script>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
    });

    it("should remove inline script with newlines", () => {
      const malicious = `<script>
        var x = 1;
        alert(x);
      </script><p>Text</p>`;
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<script");
      expect(result).not.toContain("var x");
      expect(result).toContain("<p>Text</p>");
    });

    it("should remove multiple script tags", () => {
      const malicious = '<script>a()</script><p>Text</p><script>b()</script>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<script");
      expect(result).toContain("<p>Text</p>");
    });
  });

  describe("Event handler removal", () => {
    it("should remove onclick handler", () => {
      const malicious = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("onclick");
      expect(result).not.toContain("alert");
      expect(result).toContain("<div>Click me</div>");
    });

    it("should remove onmouseover handler", () => {
      const malicious = '<a onmouseover="evil()">Hover</a>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("onmouseover");
      expect(result).not.toContain("evil");
    });

    it("should remove onerror handler on img (img not allowed)", () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(malicious);

      // img tag is not in allowed list, so entire tag is removed
      expect(result).not.toContain("<img");
      expect(result).not.toContain("onerror");
    });

    it("should remove onload handler", () => {
      const malicious = '<body onload="evil()">Content</body>';
      const result = sanitizeHtml(malicious);

      // body tag is not allowed
      expect(result).not.toContain("onload");
      expect(result).not.toContain("evil");
    });

    it("should remove onfocus handler", () => {
      const malicious = '<input onfocus="alert(1)" autofocus>';
      const result = sanitizeHtml(malicious);

      // input tag is not allowed
      expect(result).not.toContain("onfocus");
    });

    it("should remove all on* event handlers", () => {
      const handlers = [
        "onclick", "ondblclick", "onmousedown", "onmouseup",
        "onmouseover", "onmouseout", "onmousemove",
        "onkeydown", "onkeyup", "onkeypress",
        "onfocus", "onblur", "onchange", "onsubmit",
        "onload", "onerror", "onunload",
      ];

      for (const handler of handlers) {
        const malicious = `<div ${handler}="evil()">Test</div>`;
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain(handler);
      }
    });
  });

  describe("JavaScript URL blocking", () => {
    it("should block javascript: URLs in href", () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("javascript:");
      // The link should be sanitized (href removed or modified)
    });

    it("should block javascript: URLs with encoding", () => {
      const malicious = '<a href="javascript&#58;alert(1)">Click</a>';
      const result = sanitizeHtml(malicious);

      // Should not execute javascript regardless of encoding
      expect(result).not.toContain("javascript");
    });

    it("should block javascript: with uppercase", () => {
      const malicious = '<a href="JAVASCRIPT:alert(1)">Click</a>';
      const result = sanitizeHtml(malicious);

      expect(result.toLowerCase()).not.toContain("javascript:");
    });

    it("should block javascript: with spaces", () => {
      const malicious = '<a href="  javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(malicious);

      // URL parsing handles this
      expect(result).not.toContain("alert");
    });
  });

  describe("Data URL blocking", () => {
    it("should block data: URLs", () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("data:");
    });

    it("should block data: URLs with base64", () => {
      const malicious = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Link</a>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("data:");
      expect(result).not.toContain("base64");
    });
  });

  describe("Style tag removal", () => {
    it("should remove style tags", () => {
      const malicious = '<style>body { background: url("javascript:alert(1)") }</style><p>Text</p>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<style");
      expect(result).not.toContain("</style");
      expect(result).toContain("<p>Text</p>");
    });

    it("should remove style tags with type attribute", () => {
      const malicious = '<style type="text/css">.evil { color: red }</style>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<style");
    });
  });

  describe("HTML comment removal", () => {
    it("should remove HTML comments", () => {
      const malicious = '<!-- <script>alert(1)</script> --><p>Safe</p>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<!--");
      expect(result).not.toContain("-->");
      expect(result).toContain("<p>Safe</p>");
    });

    it("should remove conditional comments", () => {
      const malicious = '<!--[if IE]><script>alert(1)</script><![endif]--><p>Text</p>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<!--");
      expect(result).toContain("<p>Text</p>");
    });
  });

  describe("Disallowed tags", () => {
    it("should remove iframe tags", () => {
      const malicious = '<iframe src="evil.html"></iframe><p>Safe</p>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<iframe");
      expect(result).not.toContain("</iframe");
      expect(result).toContain("<p>Safe</p>");
    });

    it("should remove object tags", () => {
      const malicious = '<object data="evil.swf"></object>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<object");
    });

    it("should remove embed tags", () => {
      const malicious = '<embed src="evil.swf">';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<embed");
    });

    it("should remove form tags", () => {
      const malicious = '<form action="evil"><input></form>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<form");
      expect(result).not.toContain("<input");
    });

    it("should remove input tags", () => {
      const malicious = '<input type="hidden" value="secret">';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<input");
    });

    it("should remove button tags", () => {
      const malicious = '<button onclick="evil()">Click</button>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<button");
    });

    it("should remove meta tags", () => {
      const malicious = '<meta http-equiv="refresh" content="0;url=evil">';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<meta");
    });

    it("should remove link tags", () => {
      const malicious = '<link rel="stylesheet" href="evil.css">';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<link");
    });

    it("should remove base tags", () => {
      const malicious = '<base href="https://evil.com/">';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<base");
    });

    it("should remove svg tags", () => {
      const malicious = '<svg onload="alert(1)"><circle></circle></svg>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<svg");
    });

    it("should remove math tags", () => {
      const malicious = '<math><mtext></mtext></math>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("<math");
    });
  });

  describe("Safe content preservation", () => {
    it("should preserve allowed tags", () => {
      const safe = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p>';
      const result = sanitizeHtml(safe);

      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
    });

    it("should preserve lists", () => {
      const safe = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(safe);

      expect(result).toContain("<ul>");
      expect(result).toContain("<li>Item 1</li>");
    });

    it("should preserve tables", () => {
      const safe = '<table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>';
      const result = sanitizeHtml(safe);

      expect(result).toContain("<table>");
      expect(result).toContain("<th>Header</th>");
      expect(result).toContain("<td>Data</td>");
    });

    it("should preserve safe links with href", () => {
      const safe = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(safe);

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('rel="noopener noreferrer"'); // Security attribute added
    });

    it("should preserve relative URLs", () => {
      const safe = '<a href="/page">Internal Link</a>';
      const result = sanitizeHtml(safe);

      expect(result).toContain('href="/page"');
    });

    it("should preserve anchor links", () => {
      const safe = '<a href="#section">Anchor</a>';
      const result = sanitizeHtml(safe);

      expect(result).toContain('href="#section"');
    });

    it("should preserve mailto links", () => {
      const safe = '<a href="mailto:test@example.com">Email</a>';
      const result = sanitizeHtml(safe);

      expect(result).toContain('href="mailto:test@example.com"');
    });

    it("should preserve code blocks", () => {
      const safe = '<pre><code>const x = 1;</code></pre>';
      const result = sanitizeHtml(safe);

      expect(result).toContain("<pre>");
      expect(result).toContain("<code>");
    });

    it("should preserve blockquotes", () => {
      const safe = '<blockquote>Quote text</blockquote>';
      const result = sanitizeHtml(safe);

      expect(result).toContain("<blockquote>Quote text</blockquote>");
    });
  });

  describe("Attribute sanitization", () => {
    it("should preserve safe attributes", () => {
      const safe = '<p id="intro" class="text-lg">Text</p>';
      const result = sanitizeHtml(safe);

      expect(result).toContain('id="intro"');
      expect(result).toContain('class="text-lg"');
    });

    it("should escape attribute values", () => {
      const safe = '<p title="&quot;quoted&quot;">Text</p>';
      const result = sanitizeHtml(safe);

      // Should be properly escaped
      expect(result).not.toContain('title=""quoted""');
    });

    it("should add rel=noopener to external links", () => {
      const safe = '<a href="https://external.com">External</a>';
      const result = sanitizeHtml(safe);

      expect(result).toContain('rel="noopener noreferrer"');
    });

    it("should remove style attribute", () => {
      const malicious = '<p style="background:url(javascript:alert(1))">Text</p>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain("style=");
      expect(result).toContain("<p>Text</p>");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("should handle plain text", () => {
      const text = "Just plain text without HTML";
      expect(sanitizeHtml(text)).toBe(text);
    });

    it("should handle text with < and > characters", () => {
      const text = "1 < 2 and 3 > 2";
      const result = sanitizeHtml(text);
      // Should preserve the text (not valid HTML tags)
      expect(result).toContain("1 < 2");
    });

    it("should handle malformed tags", () => {
      const malformed = '<script<script>>alert(1)</script>';
      const result = sanitizeHtml(malformed);

      expect(result).not.toContain("alert");
    });

    it("should handle null bytes", () => {
      const malicious = '<scr\0ipt>alert(1)</script>';
      const result = sanitizeHtml(malicious);

      // Null bytes should not bypass protection
      expect(result).not.toContain("alert(1)");
    });
  });
});
