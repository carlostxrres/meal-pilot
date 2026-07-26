"use client";

import { useRef, useState } from "react";

const THRESHOLD = 88;
const MAX_DRAG = 132;

export interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  onTrigger: () => void;
}

/**
 * Fila con gestos de pulgar estilo iOS/Android: arrastrar desde la
 * izquierda hacia la derecha revela `leftAction` (ej. vaciar), arrastrar
 * desde la derecha hacia la izquierda revela `rightAction` (ej. editar).
 * Un tap normal (sin desplazamiento horizontal significativo) no dispara
 * nada y deja pasar el click a los controles internos de `children`.
 */
export function SwipeableRow({
  children,
  leftAction,
  rightAction,
}: {
  children: React.ReactNode;
  leftAction: SwipeAction;
  rightAction: SwipeAction;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const activePointerId = useRef<number | null>(null);

  function clamp(delta: number): number {
    return Math.sign(delta) * Math.min(Math.abs(delta), MAX_DRAG);
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    activePointerId.current = e.pointerId;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (activePointerId.current !== e.pointerId) return;
    setDragX(clamp(e.clientX - startX.current));
  }

  function endDrag(e: React.PointerEvent) {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    setDragging(false);
    if (dragX > THRESHOLD) leftAction.onTrigger();
    else if (dragX < -THRESHOLD) rightAction.onTrigger();
    setDragX(0);
  }

  const progress = Math.max(-1, Math.min(1, dragX / THRESHOLD));

  return (
    <div className="swipe-row">
      <div
        className="swipe-row-action swipe-row-action-left"
        style={{ opacity: Math.max(0, progress) }}
        data-armed={progress >= 1}
      >
        {leftAction.icon}
        <span>{leftAction.label}</span>
      </div>
      <div
        className="swipe-row-action swipe-row-action-right"
        style={{ opacity: Math.max(0, -progress) }}
        data-armed={progress <= -1}
      >
        {rightAction.icon}
        <span>{rightAction.label}</span>
      </div>
      <div
        className="swipe-row-content"
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragging ? "none" : "transform 0.2s ease-out",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
    </div>
  );
}
