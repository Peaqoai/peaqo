"use client";
import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@peaqo/trpc";

// explicit annotation: without it the inferred type isn't portable once the
// router tree grows (TS2742)
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
