"use client";

import { useEffect } from "react";

const TRADOX_LOGO = "data:image/webp;base64,UklGRr4CAABXRUJQVlA4ILICAACQDgCdASpAAEAAPmEokEakIiGhKBv8AIAMCWkAzgO0zBWzNPIxqCq3SYJsnGbJtXd0PbVoeIlMbVJPS156Bpf/NCafr4+JmvtYWbn+Wyp2LbPOrrwC4hUfFVA0o+CSgpt2YseykXSaWOTMYCEQXEmWpEnXOFIaP1qYs7MclADVMi76Iirl0/+vjSkF9aBotxx29afbl4tmoc7p6pTUf9jTctAOMIirUfPzX5SiKbxGsvSgHkmJX0aSp54dqWQG6wT4gcBdk/HJs3bOljiIxD24vKwBdwuQTDCC7kINCHUv8KVp8TEyn1G669EWVT73Gh1zJEiJkznyEL5IkWVwXtRyvOCnO9rToZgTEQ0LozWwUfFSoB5v+2B3V8kVZOVQDDAFry8NxQPOMJQJ2zoNn1LNT02Y6EnSrUEaPhvf7NxPyVH0GLFg+SYry+lA8y7aLa7xJzSfYVEYd5+YK9e/MbWKbf3sjJpjyUoKpDXFWKtl7BMd5ePqf07PNRoToKocoQ+nmNjOaRZImz8elUNF+bgII2EbSOv0jXe4MAenTSjYGCszlkOYBuX0FVxBCLcmjEFXNMU/WWI9zZxOStyUqHLB3h6pJqtL3viDhaOIuWSnsDTnLgRherUrPYutu59xfEscFBYINMdovfZ6dXKNZwv2uT74BwWKcdgwieIUYjgttEBNSoVCC8Up12F7aBtVIwFNjiRjQDxOtIA39uGw3bLRz9rsfZj3r1XXjamQbRCNcG1cQwZEzwcNGxKninrPzL5mzfXzMtCFGVPsQbT0ZscVM1tpQnEER5rs7eHY8LCOrVMsuS1B+vknYDVnpGvC29QVz0WtvWK4khVqw3Ynv2L6YBpry2t4XCBIbrxHtiNH5UdA20+N/ODkl4V1ImGUkpoH/1GPNyijKc1rlkf4B0WAAAA=";

function syncBrand() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="TradeWay home"], button[aria-label="Tradox home"]',
    ),
  );

  candidates.forEach((button) => {
    button.setAttribute("aria-label", "Tradox home");

    const logo = button.querySelector<HTMLElement>(":scope > span:first-child");
    if (logo && logo.dataset.tradoxLogo !== "true") {
      logo.dataset.tradoxLogo = "true";
      logo.textContent = "";
      logo.className = "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#171717] shadow-[0_10px_24px_rgba(0,0,0,.32)]";

      const image = document.createElement("img");
      image.src = TRADOX_LOGO;
      image.alt = "Tradox";
      image.width = 36;
      image.height = 36;
      image.className = "h-full w-full object-cover";
      image.draggable = false;
      logo.appendChild(image);
    }

    const title = Array.from(button.querySelectorAll<HTMLElement>("strong, span")).find(
      (element) => element.textContent?.trim() === "TradeWay" || element.textContent?.trim() === "Tradox",
    );
    if (title) title.textContent = "Tradox";
  });
}

export function BrandIdentitySync() {
  useEffect(() => {
    syncBrand();
    const observer = new MutationObserver(syncBrand);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
