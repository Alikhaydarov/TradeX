"use client";
import { LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PropAccountDialog({open,saving,onOpenChange,onSave}:{open:boolean;saving:boolean;onOpenChange:(v:boolean)=>void;onSave:(f:FormData)=>void|Promise<void>}) {
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Yangi prop account</DialogTitle><DialogDescription>Challenge limitlari va boshlang'ich balansni kiriting.</DialogDescription></DialogHeader><form action={onSave} className="grid gap-4 sm:grid-cols-2">
 {[["Account nomi","name","FTMO 100K #1"],["Prop firma","firm","FTMO, The5ers..."],["Bosqich","phase","Challenge"],["Bozor","marketType","CFD"]].map(([l,n,p])=><div className="space-y-2" key={n}><Label>{l}</Label><Input name={n} placeholder={p} required={n==="name"}/></div>)}
 {[["Account size","accountSize","100000"],["Boshlang'ich balans","initialBalance","100000"],["Profit target","profitTarget","8000"],["Max drawdown","maxDrawdown","10000"],["Kunlik drawdown","dailyDrawdown","5000"]].map(([l,n,v])=><div className="space-y-2" key={n}><Label>{l}</Label><Input name={n} type="number" min="0" step="any" defaultValue={v} required/></div>)}
 <div className="space-y-2"><Label>Boshlangan sana</Label><Input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0,10)} required/></div><input type="hidden" name="status" value="Active"/><Button disabled={saving} className="sm:col-span-2">{saving?<LoaderCircle className="animate-spin"/>:<Plus/>} Account yaratish</Button></form></DialogContent></Dialog>;
}
