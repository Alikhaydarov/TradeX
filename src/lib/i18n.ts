"use client";

import { useEffect, useState } from "react";

export const locales = ["en", "uz", "ru", "ko"] as const;
export type Locale = typeof locales[number];

const labels: Record<Locale, string> = {
  en: "English",
  uz: "O'zbek",
  ru: "Русский",
  ko: "한국어",
};

const dictionary = {
  home: { en: "Home", uz: "Bosh sahifa", ru: "Главная", ko: "홈" },
  journal: { en: "Journal", uz: "Jurnal", ru: "Журнал", ko: "저널" },
  profile: { en: "Profile", uz: "Profil", ru: "Профиль", ko: "프로필" },
  marketPulse: { en: "Market pulse", uz: "Bozor oqimi", ru: "Пульс рынка", ko: "시장 흐름" },
  accountsRecords: { en: "Accounts and trade records", uz: "Hisoblar va trade tarixi", ru: "Счета и сделки", ko: "계좌와 거래 기록" },
  proofSettings: { en: "Proof and settings", uz: "Proof va sozlamalar", ru: "Доказательства и настройки", ko: "인증 및 설정" },
  shareTrade: { en: "Share trade", uz: "Trade ulashish", ru: "Поделиться сделкой", ko: "거래 공유" },
  shareJournalTrade: { en: "Share a journal trade", uz: "Jurnaldagi tradeni ulashish", ru: "Поделиться сделкой из журнала", ko: "저널 거래 공유" },
  reviewedOnly: { en: "Only reviewed trades can be posted.", uz: "Faqat review qilingan tradelar post bo'ladi.", ru: "Публикуются только проверенные сделки.", ko: "리뷰된 거래만 게시할 수 있습니다." },
  pickTrade: { en: "Pick a journal trade. Home feed only accepts real trade posts.", uz: "Jurnaldan trade tanlang. Home feed faqat real trade postlarini qabul qiladi.", ru: "Выберите сделку из журнала. Лента принимает только сделки.", ko: "저널 거래를 선택하세요. 홈 피드는 실제 거래 게시물만 허용합니다." },
  searchTrade: { en: "Search symbol, setup or note", uz: "Symbol, setup yoki note qidiring", ru: "Поиск символа, сетапа или заметки", ko: "심볼, 셋업 또는 노트 검색" },
  noTrades: { en: "No journal trades yet", uz: "Hali journal trade yo'q", ru: "В журнале пока нет сделок", ko: "저널 거래가 아직 없습니다" },
  addTradeFirst: { en: "Add a trade in Journal first, then share it from Home.", uz: "Avval Journal'da trade qo'shing, keyin Home'dan ulashing.", ru: "Сначала добавьте сделку в журнал, затем поделитесь из Home.", ko: "먼저 저널에 거래를 추가한 뒤 홈에서 공유하세요." },
  openJournal: { en: "Open Journal", uz: "Journalni ochish", ru: "Открыть журнал", ko: "저널 열기" },
} as const;

type TranslationKey = keyof typeof dictionary;

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("tradeway-locale");
  if (saved && locales.includes(saved as Locale)) return saved as Locale;
  const browser = window.navigator.language.toLowerCase();
  if (browser.startsWith("uz")) return "uz";
  if (browser.startsWith("ru")) return "ru";
  if (browser.startsWith("ko")) return "ko";
  return "en";
}

export function useLanguage() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detectLocale());
    const sync = () => setLocaleState(detectLocale());
    window.addEventListener("tradeway:locale", sync);
    return () => window.removeEventListener("tradeway:locale", sync);
  }, []);

  const setLocale = (next: Locale) => {
    window.localStorage.setItem("tradeway-locale", next);
    setLocaleState(next);
    window.dispatchEvent(new Event("tradeway:locale"));
  };

  const t = (key: TranslationKey) => dictionary[key][locale] ?? dictionary[key].en;

  return { locale, locales, labels, setLocale, t };
}
