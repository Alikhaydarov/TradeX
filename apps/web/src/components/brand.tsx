import Image from "next/image";

export function Brand({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <div className="tradoxy-brand">
      <span className="tradoxy-mark" aria-hidden="true">
        <Image src="/tradoxy-mark.svg" alt="" width={21} height={21} />
      </span>
      <span className="tradoxy-wordmark">
        <strong>Tradoxy</strong>
        {subtitle && <small>Trading workspace</small>}
      </span>
    </div>
  );
}
