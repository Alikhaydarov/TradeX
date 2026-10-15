import Image from "next/image";

export function WorkspaceLoader({
  fullscreen = false,
  label = "Loading Tradoxy",
}: {
  fullscreen?: boolean;
  label?: string;
}) {
  return (
    <div
      className={`workspace-loader${fullscreen ? " workspace-loader-fullscreen" : ""}`}
      role="status"
      aria-label={label}
    >
      <span className="workspace-loader-mark">
        <Image src="/tradoxy-mark.svg" alt="" width={24} height={24} priority />
      </span>
      <span className="workspace-loader-ring" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
