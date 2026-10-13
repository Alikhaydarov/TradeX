export default function Loading() { return <div className="space-y-4 animate-pulse"><div className="h-20 rounded-lg bg-[#101827]"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-32 rounded-lg bg-[#101827]"/>)}</div><div className="h-[360px] rounded-lg bg-[#101827]"/></div>; }

