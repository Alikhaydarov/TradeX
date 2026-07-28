"use client";

import { useEffect, type ReactNode } from "react";

import { useLanguage } from "@/lib/i18n";

const TRANSLATABLE_ATTRIBUTES = [
  "placeholder",
  "title",
  "aria-label",
  "aria-description",
  "alt",
] as const;
const SKIP_SELECTOR =
  'script,style,code,pre,textarea,[contenteditable="true"],[data-no-i18n]';

const originalText = new WeakMap<Text, string>();
const appliedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const appliedAttributes = new WeakMap<Element, Map<string, string>>();

function shouldSkip(node: Node) {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  return Boolean(element?.closest(SKIP_SELECTOR));
}

function preserveWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

export function LegacyI18nBoundary({ children }: { children: ReactNode }) {
  const { locale, translateText } = useLanguage();

  useEffect(() => {
    const root = document.body;
    let translating = false;

    const translateTextNode = (node: Text) => {
      if (shouldSkip(node)) return;
      const current = node.nodeValue ?? "";
      if (!current.trim()) return;
      const lastApplied = appliedText.get(node);
      if (lastApplied !== current) originalText.set(node, current);
      const source = originalText.get(node) ?? current;
      const translated = preserveWhitespace(source, translateText(source.trim()));
      appliedText.set(node, translated);
      if (current !== translated) node.nodeValue = translated;
    };

    const translateAttributes = (element: Element) => {
      if (shouldSkip(element)) return;
      const originals =
        originalAttributes.get(element) ?? new Map<string, string>();
      const applied =
        appliedAttributes.get(element) ?? new Map<string, string>();

      for (const attribute of TRANSLATABLE_ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (!current?.trim()) continue;
        if (applied.get(attribute) !== current) originals.set(attribute, current);
        const source = originals.get(attribute) ?? current;
        const translated = translateText(source);
        applied.set(attribute, translated);
        if (current !== translated) element.setAttribute(attribute, translated);
      }

      originalAttributes.set(element, originals);
      appliedAttributes.set(element, applied);
    };

    const translateTree = (node: Node) => {
      if (shouldSkip(node)) return;
      translating = true;
      try {
        if (node.nodeType === Node.TEXT_NODE) {
          translateTextNode(node as Text);
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const element = node as Element;
        translateAttributes(element);
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        );
        let current = walker.nextNode();
        while (current) {
          if (current.nodeType === Node.TEXT_NODE) {
            translateTextNode(current as Text);
          } else {
            translateAttributes(current as Element);
          }
          current = walker.nextNode();
        }
      } finally {
        translating = false;
      }
    };

    const frame = window.requestAnimationFrame(() => translateTree(root));
    const observer = new MutationObserver((mutations) => {
      if (translating) return;
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTree(mutation.target);
          continue;
        }
        if (mutation.type === "attributes") {
          translateTree(mutation.target);
          continue;
        }
        mutation.addedNodes.forEach(translateTree);
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [locale, translateText]);

  return children;
}
