"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);

    // Futuramente ligar aqui o POST /api/token/ do Django
    console.log("A autenticar usuário...");

    setTimeout(() => {
      setLoading(false);
      // Após o login com sucesso, redireciona para a raiz do painel
      router.push("/admin");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
      
      {/* Esta div segura TODA a largura da página, incluindo Cabeçalho, Card e Rodapé */}
      <div className="w-full max-w-sm">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-600/20">
            <span className="text-white font-bold text-2xl">BP</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">BabyPlays Admin</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Insira as suas credenciais para entrar no painel de Admin.
          </p>
        </div>

        {/* Formulário de Autenticação */}
        <Card padding="lg">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            
            <Input 
              label="E-mail" 
              type="email" 
              placeholder="admin@babyplays.com.br" 
              required 
            />
            
            <Input 
              label="Palavra-passe" 
              type="password" 
              placeholder="••••••••" 
              required 
            />

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full mt-2" 
              loading={loading}
            >
              Entrar no sistema
            </Button>
            
          </form>
        </Card>

        {/* Rodapé simples */}
        <p className="text-center text-xs text-zinc-400 mt-8">
          &copy; {new Date().getFullYear()} BabyPlays. Todos os direitos reservados.
        </p>

      </div>
    </div>
  );
}