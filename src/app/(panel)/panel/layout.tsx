import type { Metadata } from "next";
import PanelProvider from "@/components/panel/PanelProvider";

export const metadata: Metadata = {
  title: "Panel · Policlínico Redondela",
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelProvider>{children}</PanelProvider>;
}
