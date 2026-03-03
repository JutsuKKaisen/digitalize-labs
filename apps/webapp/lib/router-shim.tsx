'use client';

import React from 'react';
import NextLink from 'next/link';
import { useRouter as nextUseRouter, usePathname as nextUsePathname, useSearchParams as nextUseSearchParams } from 'next/navigation';

export const Link = NextLink;
export const useRouter = nextUseRouter;
export const usePathname = nextUsePathname;
export const useSearchParams = nextUseSearchParams;

export const RouterProvider = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};
