// Mini Akıl - Yaş seçimi (MEB okul öncesi 3-6 yaş)
import { useEffect, useState } from "react";
import type { Age, ContentTopic } from "@/data/types";

const KEY = "miniakil:age";

export function getAge(): Age | null {
  try {
    const v = localStorage.getItem(KEY);
    const n = v ? parseInt(v, 10) : NaN;
    if (n === 3 || n === 4 || n === 5 || n === 6) return n;
  } catch { /* ignore */ }
  return null;
}

export function setAge(age: Age) {
  try {
    localStorage.setItem(KEY, String(age));
    window.dispatchEvent(new CustomEvent("miniakil:age-changed"));
  } catch { /* ignore */ }
}

export function useAge(): [Age | null, (a: Age) => void] {
  const [age, setLocal] = useState<Age | null>(() => getAge());
  useEffect(() => {
    const fn = () => setLocal(getAge());
    window.addEventListener("miniakil:age-changed", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("miniakil:age-changed", fn);
      window.removeEventListener("storage", fn);
    };
  }, []);
  return [age, (a: Age) => { setAge(a); setLocal(a); }];
}

// Topic yaşa uygunsa true. ages boşsa tüm yaşlara uygun.
export function topicForAge(topic: ContentTopic, age: Age | null): boolean {
  if (!age) return true;
  if (!topic.ages || topic.ages.length === 0) return true;
  return topic.ages.includes(age);
}

// Yaşa göre item slice — küçük yaşlarda daha az item
export function itemsForAge<T>(items: T[], age: Age | null): T[] {
  if (!age) return items;
  const limits: Record<number, number> = { 3: 8, 4: 14, 5: 22, 6: items.length };
  const lim = limits[age] ?? items.length;
  return items.slice(0, lim);
}

export const AGE_LABELS: Record<Age, string> = {
  3: "3 Yaş",
  4: "4 Yaş",
  5: "5 Yaş",
  6: "6 Yaş",
};

export const AGE_DESCRIPTIONS: Record<Age, string> = {
  3: "Tanıma & sesler",
  4: "Renkler & sayılar",
  5: "Harfler & kavramlar",
  6: "Okuma hazırlık",
};
