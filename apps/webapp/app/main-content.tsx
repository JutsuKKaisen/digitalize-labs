"use client";

import React from "react";
import clsx from "clsx";
import { useStore } from "../lib/store"; // chỉnh đúng path theo project của bạn

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useStore(); // hook chạy ở client => OK

  return (
    <div
      className={clsx(
        "flex min-h-screen transition-colors duration-300",
        theme,
      )}
    >
      {children}
    </div>
  );
}
