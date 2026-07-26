"use client";

import { useEffect, useRef, useState } from "react";

export function SliceRushGame() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let destroy: (() => void) | undefined;

    const syncViewport = () => {
      const viewport = window.visualViewport;
      document.documentElement.style.setProperty(
        "--viewport-width",
        `${Math.round(viewport?.width ?? window.innerWidth)}px`,
      );
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${Math.round(viewport?.height ?? window.innerHeight)}px`,
      );
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);

    void import("../src/game/createGame").then(({ createSliceRushGame }) => {
      if (disposed || !hostRef.current) return;
      const game = createSliceRushGame(hostRef.current);
      destroy = () => game.destroy(true);
      setLoading(false);
    });

    return () => {
      disposed = true;
      destroy?.();
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="game-host"
      aria-label="Monster Pizza fractions arcade game"
    >
      {loading ? <div className="game-loading">WAKING THE MONSTER OVEN…</div> : null}
    </div>
  );
}
