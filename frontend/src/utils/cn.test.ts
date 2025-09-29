import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn util", () => {
  it("combina classes removendo falsy e conflitos", () => {
    const result = cn("px-2", null, undefined, "bg-blue-500", "px-4");

    expect(result).toBe("bg-blue-500 px-4");
  });

  it("retorna string vazia quando nao ha classes validas", () => {
    expect(cn()).toBe("");
  });
});
