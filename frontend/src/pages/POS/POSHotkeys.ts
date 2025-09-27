import { useEffect } from "react";

type HotkeyHandlers = {
  onSearch: () => void;
  onAddItem: () => void;
  onDiscount: () => void;
  onFinish: () => void;
  onCancel?: () => void;
};

export const usePOSHotkeys = ({ onSearch, onAddItem, onDiscount, onFinish, onCancel }: HotkeyHandlers) => {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      switch (event.key) {
        case "F2":
          event.preventDefault();
          onSearch();
          break;
        case "F4":
          event.preventDefault();
          onDiscount();
          break;
        case "F8":
          if (onCancel) {
            event.preventDefault();
            onCancel();
          }
          break;
        case "F10":
          event.preventDefault();
          onFinish();
          break;
        case "Enter":
          if (event.ctrlKey) {
            event.preventDefault();
            onAddItem();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onSearch, onAddItem, onDiscount, onFinish, onCancel]);
};
