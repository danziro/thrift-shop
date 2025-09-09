"use client";

import React from "react";

// Reusable skeleton table row for loading states
// Usage example:
// <SkeletonTableRow columns={["text","image","text","text","text","text","badge","actions"]} />
// - text: generic text line
// - image: square/thumb placeholder
// - badge: pill placeholder
// - actions: two small buttons placeholder

type ColumnKind = "text" | "image" | "badge" | "actions";

export function SkeletonTableRow({ columns }: { columns: ColumnKind[] }) {
  return (
    <tr className="border-t animate-pulse">
      {columns.map((kind, idx) => (
        <td key={idx} className="px-3 py-3">
          {kind === "text" && (
            <div className="h-3 w-[min(10rem,60vw)] bg-gray-200 rounded" />
          )}
          {kind === "image" && (
            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-200" />
          )}
          {kind === "badge" && (
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          )}
          {kind === "actions" && (
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-gray-200 rounded-lg" />
              <div className="h-8 w-16 bg-gray-200 rounded-lg" />
            </div>
          )}
        </td>
      ))}
    </tr>
  );
}

export default SkeletonTableRow;
