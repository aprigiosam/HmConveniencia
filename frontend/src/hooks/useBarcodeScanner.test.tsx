import { describe, expect, it, vi } from "vitest";
import React, { useState } from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

import { useBarcodeScanner } from "./useBarcodeScanner";

const TestComponent = ({ onScan }: { onScan: (code: string) => void }) => {
  const [enabled] = useState(true);
  useBarcodeScanner({ enabled, onScan, timeout: 50, minLength: 3 });
  return null;
};

describe("useBarcodeScanner", () => {
  it("dispara callback quando entrada rápida termina com Enter", () => {
    const handler = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<TestComponent onScan={handler} />);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "3" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("123");

    act(() => {
      root.unmount();
    });
  });
});
