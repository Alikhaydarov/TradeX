"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { MarketPanel } from "./market-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthLanding({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="grid min-h-[100dvh] bg-background text-foreground lg:grid-cols-[minmax(0,560px)_1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#D4AF37]">
                <span className="text-sm font-bold text-[#0A0E14]">T</span>
              </div>
              <span className="text-lg font-semibold tracking-tight">TradeWay</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
              <ShieldCheck size={12} /> Secure
            </span>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Kirish</TabsTrigger>
              <TabsTrigger value="signup">Ro&apos;yxatdan o&apos;tish</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-8">
              <div className="mb-6 space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">Qaytganingizdan xursandmiz</h2>
                <p className="text-sm text-muted-foreground">Hisobingiz va statistikangizni ko&apos;rish uchun kiring</p>
              </div>

              <GoogleButton label="Google orqali kirish" onClick={onLogin} />
              <DividerWithText text="yoki email bilan" />

              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onLogin(); }}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="ism@misol.com" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Parol</Label>
                    <button type="button" onClick={onLogin} className="text-xs font-medium text-[#D4AF37] hover:underline">
                      Parolni unutdingizmi?
                    </button>
                  </div>
                  <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" />
                </div>

                <Button type="submit" className="w-full bg-[#D4AF37] font-medium text-[#0A0E14] hover:bg-[#E8C158]">
                  Kirish
                  <ArrowRight size={15} />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-8">
              <div className="mb-6 space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">Jurnalingizni boshlang</h2>
                <p className="text-sm text-muted-foreground">Bepul rejada 1 ta savdo hisobi bilan boshlang</p>
              </div>

              <GoogleButton label="Google orqali davom etish" onClick={onLogin} />
              <DividerWithText text="yoki email bilan" />

              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onLogin(); }}>
                <div className="space-y-2">
                  <Label htmlFor="name">To&apos;liq ism</Label>
                  <Input id="name" placeholder="Ism Familiya" autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="ism@misol.com" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Parol</Label>
                  <Input id="signup-password" type="password" placeholder="Kamida 8 ta belgi" autoComplete="new-password" />
                </div>

                <Button type="submit" className="w-full bg-[#D4AF37] font-medium text-[#0A0E14] hover:bg-[#E8C158]">
                  Get started
                  <ArrowRight size={15} />
                </Button>

                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Davom etish orqali siz Foydalanish shartlari va Maxfiylik siyosatiga rozilik bildirasiz.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MarketPanel />
    </div>
  );
}

function DividerWithText({ text }: { text: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <Separator className="shrink" />
      <span className="shrink-0 text-xs text-muted-foreground">{text}</span>
      <Separator className="shrink" />
    </div>
  );
}

function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="w-full gap-2">
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.87c2.27-2.09 3.55-5.17 3.55-8.75z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A11.996 11.996 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1z" />
        <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75z" />
      </svg>
      {label}
    </Button>
  );
}
