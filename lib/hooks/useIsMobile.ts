import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 1023.98px)";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** True below the `lg` breakpoint (phones, small tablets and the Android app);
 *  null during server rendering, before the screen size is known. */
export function useIsMobile(): boolean | null {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => null);
}
