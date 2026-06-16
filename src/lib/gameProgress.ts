// Oyunlardaki test-soru cevaplarını ilerleme (SRS) sistemine kaydeder.
// Böylece oyunlardaki doğru/yanlış cevaplar Progress sayfasındaki konu
// ilerlemesine yansır.
import { getTopicSrs, pickNextLetterFromTopic, recordSrsAnswer, type Level, type TopicSrs } from "@/data/srs";
import { findTopicOfItem } from "@/data/subjects";
import type { ContentItem } from "@/data/types";

const NS = "quiz" as const;

export function recordGameAnswer(
  item: ContentItem | undefined | null,
  correct: boolean,
  meta?: { responseMs?: number; gameId?: string },
) {
  if (!item) return;
  const t = findTopicOfItem(item.id);
  if (!t) return;
  try {
    recordSrsAnswer(NS, t.topicId, item.id, correct, meta);
  } catch { /* ignore */ }
}

export function getGameItemLevel(item: ContentItem | undefined | null): Level {
  if (!item) return 1;
  const t = findTopicOfItem(item.id);
  if (!t) return 1;
  return (getTopicSrs(NS, t.topicId)[item.id]?.level ?? 1) as Level;
}

export function pickNextGameItem(pool: ContentItem[]): ContentItem | undefined {
  if (pool.length === 0) return undefined;
  const synthetic: TopicSrs = {};
  for (const item of pool) {
    const t = findTopicOfItem(item.id);
    const entry = t ? getTopicSrs(NS, t.topicId)[item.id] : undefined;
    synthetic[item.id] = entry ?? { level: 1, correct: 0, total: 0, seen: 0, lastSeen: 0, totalMs: 0 };
  }
  const id = pickNextLetterFromTopic(synthetic, pool.map((p) => p.id));
  return pool.find((p) => p.id === id) ?? pool[0];
}
