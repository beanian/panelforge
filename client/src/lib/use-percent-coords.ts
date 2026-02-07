import { type RefObject, useCallback } from 'react';

interface PercentCoordsOptions {
  scale?: number;
  translateX?: number;
  translateY?: number;
}

export function usePercentCoords(
  containerRef: RefObject<HTMLDivElement | null>,
  options?: PercentCoordsOptions,
) {
  const { scale = 1, translateX = 0, translateY = 0 } = options ?? {};

  return useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      // Adjust for zoom/pan: the container rect already reflects CSS transforms,
      // but we need to map to the untransformed coordinate space
      const adjustedX = (clientX - rect.left) / scale - translateX;
      const adjustedY = (clientY - rect.top) / scale - translateY;
      const naturalWidth = rect.width / scale;
      const naturalHeight = rect.height / scale;
      return {
        x: (adjustedX / naturalWidth) * 100,
        y: (adjustedY / naturalHeight) * 100,
      };
    },
    [containerRef, scale, translateX, translateY],
  );
}
