import { SettingsNavigation } from "@/components/settings-navigation";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl py-1 sm:py-3">
      <h1 className="mb-5 text-xl font-semibold">Settings</h1>
      <div className="grid min-w-0 gap-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
        <SettingsNavigation />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
