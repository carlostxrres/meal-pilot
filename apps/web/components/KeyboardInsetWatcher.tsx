"use client";

import { useEffect } from "react";

/**
 * En iOS Safari (y algunos navegadores Android), un elemento
 * position:fixed;bottom:0 se ancla al viewport de layout, no al visual: al
 * abrirse el teclado el visual viewport encoge pero el fixed no se entera,
 * así que queda anclado "detrás" del teclado (tapado). Este watcher expone
 * el hueco real del teclado como --keyboard-inset para que .dialog-content
 * pueda compensarlo con `bottom: var(--keyboard-inset)`.
 */
export function KeyboardInsetWatcher() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const inset = Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop);
      document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return null;
}
