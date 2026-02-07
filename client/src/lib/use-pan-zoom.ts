import { useState, useCallback, useRef, useEffect } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_SENSITIVITY = 0.002;

interface PanZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

export function usePanZoom() {
  const [state, setState] = useState<PanZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const panningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  const spaceHeldRef = useRef(false);

  // Store the container element in state so the wheel effect re-runs when it's set
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);

  // Track Space key for space+drag panning
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat) {
        spaceHeldRef.current = true;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const clampTranslate = useCallback(
    (tx: number, ty: number, scale: number, container: HTMLElement) => {
      if (scale <= 1) return { translateX: 0, translateY: 0 };
      const rect = container.getBoundingClientRect();
      const maxTx = (rect.width * (scale - 1)) / scale;
      const maxTy = (rect.height * (scale - 1)) / scale;
      return {
        translateX: Math.max(-maxTx, Math.min(0, tx)),
        translateY: Math.max(-maxTy, Math.min(0, ty)),
      };
    },
    [],
  );

  // Native (non-passive) wheel listener — only zooms when Ctrl/Cmd is held,
  // normal scroll passes through to the page.
  useEffect(() => {
    if (!containerEl) return;

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();

      const rect = containerEl!.getBoundingClientRect();
      const { scale, translateX, translateY } = stateRef.current;

      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * (1 + delta)));

      if (newScale === scale) return;

      const factor = newScale / scale;
      const newTx = cursorX / scale - cursorX / newScale + translateX * factor;
      const newTy = cursorY / scale - cursorY / newScale + translateY * factor;

      const clamped = clampTranslate(newTx, newTy, newScale, containerEl!);

      setState({ scale: newScale, ...clamped });
    }

    containerEl.addEventListener('wheel', onWheel, { passive: false });
    return () => containerEl.removeEventListener('wheel', onWheel);
  }, [containerEl, clampTranslate]);

  // Ref callback for the consumer to attach to the container element
  const setContainerRef = useCallback((el: HTMLElement | null) => {
    setContainerEl(el);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isMiddle = e.button === 1;
      const isSpaceLeft = e.button === 0 && spaceHeldRef.current;

      if (!isMiddle && !isSpaceLeft) return;
      if (stateRef.current.scale <= 1) return;

      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      panningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panningRef.current) return;
      const { scale, translateX, translateY } = stateRef.current;
      const dx = (e.clientX - panStartRef.current.x) / scale;
      const dy = (e.clientY - panStartRef.current.y) / scale;
      panStartRef.current = { x: e.clientX, y: e.clientY };

      const container = e.currentTarget as HTMLElement;
      const clamped = clampTranslate(translateX + dx, translateY + dy, scale, container);

      setState((prev) => ({ ...prev, ...clamped }));
    },
    [clampTranslate],
  );

  const handlePointerUp = useCallback(() => {
    panningRef.current = false;
  }, []);

  const resetView = useCallback(() => {
    setState({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  // Zoom to fit a percentage-based rectangle in the viewport
  const zoomToRect = useCallback(
    (
      pctRect: { x: number; y: number; width: number; height: number },
      innerEl: HTMLElement,
    ) => {
      if (!containerEl) return;

      // Natural (unscaled) content dimensions
      const contentW = innerEl.offsetWidth;
      const contentH = innerEl.offsetHeight;

      // Viewport dimensions
      const viewRect = containerEl.getBoundingClientRect();
      const viewW = viewRect.width;
      const viewH = viewRect.height;

      // Section in natural pixels
      const secW = (pctRect.width / 100) * contentW;
      const secH = (pctRect.height / 100) * contentH;
      const secCenterX = ((pctRect.x + pctRect.width / 2) / 100) * contentW;
      const secCenterY = ((pctRect.y + pctRect.height / 2) / 100) * contentH;

      // Scale to fit section with ~40% margin, minimum 1.5x for a useful zoom
      const PADDING = 1.4;
      const MIN_ZOOM = 1.5;
      const newScale = Math.max(
        MIN_ZOOM,
        Math.min(MAX_SCALE, Math.min(viewW / (secW * PADDING), viewH / (secH * PADDING))),
      );

      // Translate to center: the inner element is flex-centered in the viewport,
      // so CSS transforms don't affect layout. The flex offset is (viewW - contentW)/2.
      // Screen position of natural point (px,py) = flexOffset + (px + tx) * S
      // Setting screen pos to viewport center and solving:
      //   (viewW - contentW)/2 + (secCenterX + tx) * S = viewW / 2
      //   (secCenterX + tx) * S = contentW / 2
      //   tx = contentW / (2 * S) - secCenterX
      const tx = contentW / (2 * newScale) - secCenterX;
      const ty = contentH / (2 * newScale) - secCenterY;

      const clamped = clampTranslate(tx, ty, newScale, containerEl);
      setState({ scale: newScale, ...clamped });
    },
    [containerEl, clampTranslate],
  );

  let cursor = 'default';
  if (panningRef.current) cursor = 'grabbing';
  else if (spaceHeldRef.current && state.scale > 1) cursor = 'grab';

  const containerProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onDoubleClick: resetView,
  };

  const style: React.CSSProperties = {
    transform: `scale(${state.scale}) translate(${state.translateX}px, ${state.translateY}px)`,
    transformOrigin: '0 0',
    cursor,
  };

  return {
    scale: state.scale,
    translateX: state.translateX,
    translateY: state.translateY,
    containerProps,
    style,
    setContainerRef,
    resetView,
    zoomToRect,
  };
}
