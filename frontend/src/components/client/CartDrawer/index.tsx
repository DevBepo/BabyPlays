"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { SidebarCart } from "@/components/client/SidebarCart";
import { useCart } from "@/hooks/useCart";

export function CartDrawer() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const { closeCart, isCartOpen } = useCart();
  const routeChanged = previousPathname.current !== pathname;
  const isOverlayRoute = pathname !== "/" && !pathname.startsWith("/admin");
  const shouldShowDrawer = isOverlayRoute && isCartOpen && !routeChanged;

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      closeCart();
    }
  }, [closeCart, pathname]);

  useEffect(() => {
    if (!shouldShowDrawer) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCart, shouldShowDrawer]);

  if (!shouldShowDrawer) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Fechar carrinho"
        onClick={closeCart}
        className="fixed inset-0 z-50 cursor-default bg-[#2C1615]/25 backdrop-blur-[1px]"
      />
      <SidebarCart variant="drawer" />
    </>
  );
}
