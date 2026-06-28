import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { VerifyEmail } from "./verify-email";

describe("VerifyEmail", () => {
  it("renders the verify link and name", async () => {
    const html = await render(
      <VerifyEmail url="https://x.test/verify?t=abc" name="Sam" />,
    );
    expect(html).toContain("https://x.test/verify?t=abc");
    expect(html).toContain("Sam");
  });
});
