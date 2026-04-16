"use client";

import TapDetector from "@/components/TapDetector";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TapDetector />
    </>
  );
}
