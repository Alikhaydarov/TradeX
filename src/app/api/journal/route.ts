import { authenticateRequest,badRequest,serverError,unauthorized } from "@/lib/backend/auth";
export const runtime="nodejs";
interface JournalPayload { propAccountId?:string; symbol?:string; side?:"Long"|"Short"; entry?:number; exit?:number; quantity?:number; fees?:number; note?:string; tradedAt?:string; setup?:string; emotion?:string; riskAmount?:number; imageUrl?:string|null; tags?:string[]; }

export async function GET(request:Request){
 const auth=await authenticateRequest(request); if(!auth)return unauthorized();
 const accountId=new URL(request.url).searchParams.get("accountId");
 let query=auth.supabase.from("journal_entries").select("*").eq("user_id",auth.user.id).order("traded_at",{ascending:false}).order("created_at",{ascending:false});
 if(accountId)query=query.eq("prop_account_id",accountId);
 const {data,error}=await query; if(error)return serverError(error.message); return Response.json({entries:data});
}

export async function POST(request:Request){
 const auth=await authenticateRequest(request); if(!auth)return unauthorized();
 const body=(await request.json()) as JournalPayload; if(!body.propAccountId)return badRequest("Prop accountni tanlang.");
 const {data:account,error:accountError}=await auth.supabase.from("prop_accounts").select("*").eq("id",body.propAccountId).eq("user_id",auth.user.id).single();
 if(accountError||!account)return badRequest("Prop account topilmadi.");
 const symbol=body.symbol?.trim().toUpperCase(),side=body.side,entry=Number(body.entry),exit=Number(body.exit),quantity=Number(body.quantity||1),fees=Number(body.fees||0),risk=Number(body.riskAmount||0);
 if(!symbol||!side||![entry,exit,quantity,fees,risk].every(Number.isFinite)||entry<=0||exit<=0||quantity<=0||fees<0||risk<0)return badRequest("Trade ma'lumotlarini tekshiring.");
 const gross=side==="Long"?(exit-entry)*quantity:(entry-exit)*quantity,pnl=Number((gross-fees).toFixed(2)),resultR=risk?Number((pnl/risk).toFixed(2)):0;
 const {data,error}=await auth.supabase.from("journal_entries").insert({user_id:auth.user.id,prop_account_id:account.id,symbol,side,entry_price:entry,exit_price:exit,quantity,fees,pnl,note:body.note?.trim().slice(0,500)||"",traded_at:body.tradedAt||new Date().toISOString().slice(0,10),account_name:account.name,market_type:account.market_type,setup:body.setup?.trim().slice(0,80)||"",emotion:body.emotion?.trim().slice(0,30)||"Neutral",risk_amount:risk,result_r:resultR,account_size:account.account_size,profit_target:account.profit_target,max_drawdown:account.max_drawdown,image_url:body.imageUrl?.trim().slice(0,1000)||null,tags:(body.tags||[]).map(t=>t.trim().slice(0,24)).filter(Boolean).slice(0,8)}).select().single();
 if(error)return serverError(error.message); return Response.json({entry:data},{status:201});
}
