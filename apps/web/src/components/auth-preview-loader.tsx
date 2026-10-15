"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ProductPreview = dynamic(
  () =>
    import("./auth-product-preview").then(
      (module) => module.AuthProductPreview,
    ),
  { ssr: false },
);

export function AuthPreviewLoader() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <div className="auth2-preview-slot">{desktop && <ProductPreview />}</div>
  );
}
