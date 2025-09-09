"use client";

import { usePathname } from "next/navigation";
import Chatbox from "@/components/Chatbox";

export default function ClientChatboxGate() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <Chatbox />;
}
