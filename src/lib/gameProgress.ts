// Oyunlardaki test-soru cevaplarını ilerleme (SRS) sistemine kaydeder.
// Böylece oyunlardaki doğru/yanlış cevaplar Progress sayfasındaki konu
// ilerlemesine yansır.
import { recordSrsAnswer } from "@/data/srs";
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
