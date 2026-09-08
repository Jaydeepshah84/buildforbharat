"use client";

interface SkeletonProps {
  className?: string;
  /** Convenience: rounded-full pill shimmer. */
  circle?: boolean;
}

/** Shimmer placeholder for progressive/lazy loading states. */
export default function Skeleton({ className = "", circle = false }: SkeletonProps) {
  return <div className={`skeleton ${circle ? "rounded-full" : ""} ${className}`} aria-hidden="true" />;
}
