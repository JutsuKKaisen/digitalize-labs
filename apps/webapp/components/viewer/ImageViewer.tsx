"use client";

import React, { useRef, useState, useEffect } from "react";
import { Page, Token, Line } from "@/types";
import { useStore } from "@/lib/store";
import clsx from "clsx";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface ImageViewerProps {
  page: Page;
  imageUrl: string;
  tokens: Token[];
  lines: Line[];
  width: number;
  height: number;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  page,
  imageUrl,
  tokens,
  lines,
  width,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const {
    selectedTokenId,
    selectToken,
    multiSelectedTokenIds,
    toggleMultiSelectToken,
    viewMode,
  } = useStore();

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const s = Math.exp(-e.deltaY * 0.001);
      setScale((prev) => Math.min(Math.max(prev * s, 0.1), 5));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging)
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTokenClick = (e: React.MouseEvent, token: Token) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey) toggleMultiSelectToken(token.id);
    else selectToken(token.id);
  };

  const resetView = () => {
    if (containerRef.current && width > 0) {
      const clientWidth = containerRef.current.clientWidth;
      setScale((clientWidth - 40) / width);
      setOffset({ x: 20, y: 20 });
    }
  };

  useEffect(() => {
    resetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  return (
    <div className="relative w-full h-full bg-muted/50 overflow-hidden select-none flex flex-col transition-colors duration-300">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-background/90 backdrop-blur border border-border rounded-full px-4 py-2 flex gap-4 shadow-lg text-foreground">
        <button
          onClick={() => setScale((s) => s * 1.2)}
          className="hover:text-primary"
        >
          <ZoomIn size={18} />
        </button>
        <span className="text-xs font-mono w-12 text-center my-auto font-medium">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => s / 1.2)}
          className="hover:text-primary"
        >
          <ZoomOut size={18} />
        </button>
        <div className="w-px bg-border h-4 my-auto"></div>
        <button onClick={resetView} className="hover:text-primary">
          <Maximize size={18} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            width: width,
            height: height,
          }}
          className="relative transition-transform duration-75 ease-out shadow-2xl bg-white"
        >
          <img
            src={imageUrl}
            alt={`Page ${page.pageNo}`}
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
          />

          <svg
            className="absolute inset-0 w-full h-full z-10"
            viewBox={`0 0 ${width} ${height}`}
          >
            {tokens.map((token) => {
              const isSelected =
                selectedTokenId === token.id ||
                multiSelectedTokenIds.includes(token.id);
              const isLowConf = token.confidence < 0.85;

              let fill = "transparent";
              let stroke = "transparent";

              if (isSelected) {
                fill = "rgba(59, 130, 246, 0.3)";
                stroke = "#2563eb";
              } else if (isLowConf) {
                fill = "rgba(239, 68, 68, 0.2)";
                stroke = "rgba(239, 68, 68, 0.8)";
              }

              return (
                <g
                  key={token.id}
                  onClick={(e) => handleTokenClick(e as any, token)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <rect
                    x={token.bbox.x}
                    y={token.bbox.y}
                    width={token.bbox.w}
                    height={token.bbox.h}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                    className={clsx(
                      "transition-colors",
                      !isSelected &&
                        "hover:fill-blue-500/20 hover:stroke-blue-500/40",
                    )}
                  />
                  {viewMode === "verified" && (
                    <text
                      x={token.bbox.x}
                      y={token.bbox.y + token.bbox.h}
                      fontSize={Math.max(token.bbox.h * 0.8, 4)}
                      fill={
                        isLowConf ? "rgba(239, 68, 68, 0.9)" : "transparent"
                      }
                      className="select-none font-sans"
                    >
                      {token.textVerified || token.textOcr}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
