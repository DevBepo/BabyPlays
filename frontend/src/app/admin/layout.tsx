import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReactNode } from "react";

export const metadata = {
  title: "Painel Admin - BabyPlays",
  description: "Gestão de catálogo, pedidos e entregas.",
};

export default function LayoutAdministrativo({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}