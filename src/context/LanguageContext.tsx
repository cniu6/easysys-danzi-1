"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "@/types/content";
import { resolveInitialLang, setStoredLang } from "@/lib/i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  ready: boolean;
}

const Ctx = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  ready: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 有 localStorage 用缓存；没有则按浏览器语言；其它语言 → en
    const initial = resolveInitialLang();
    setLangState(initial);
    document.documentElement.lang = initial;
    setReady(true);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    setStoredLang(l);
    document.documentElement.lang = l;
  };

  return (
    <Ctx.Provider value={{ lang, setLang, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  return useContext(Ctx);
}
