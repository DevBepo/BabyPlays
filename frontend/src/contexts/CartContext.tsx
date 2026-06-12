"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { obterCarrinhoAtual } from "@/services/cart";
import type { Carrinho } from "@/services/cart";

type CartContextValue = {
  carrinho: Carrinho | null;
  cartLoading: boolean;
  cartLoaded: boolean;
  cartError: string | null;
  isCartOpen: boolean;
  refreshCart: () => Promise<Carrinho>;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => Promise<void>;
};

export const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: ReactNode;
};

export function CartProvider({ children }: CartProviderProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [carrinho, setCarrinho] = useState<Carrinho | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    setCartLoading(true);
    setCartError(null);

    try {
      const dados = await obterCarrinhoAtual();
      setCarrinho(dados);
      setCartLoaded(true);
      return dados;
    } catch (error) {
      setCartLoaded(true);
      setCartError("Nao foi possivel carregar o carrinho agora.");
      throw error;
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshCart().catch((error) => {
        console.error("Erro ao procurar o carrinho:", error);
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshCart]);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const toggleCart = useCallback(async () => {
    if (!isCartOpen) {
      await refreshCart();
    }

    setIsCartOpen((current) => !current);
  }, [isCartOpen, refreshCart]);

  const value = useMemo<CartContextValue>(
    () => ({
      carrinho,
      cartLoading,
      cartLoaded,
      cartError,
      isCartOpen,
      refreshCart,
      openCart,
      closeCart,
      toggleCart,
    }),
    [
      carrinho,
      cartError,
      cartLoaded,
      cartLoading,
      closeCart,
      isCartOpen,
      openCart,
      refreshCart,
      toggleCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
