// Cevapları Supabase'e (giriş yapan kullanıcılar için) kaydeder.
// Sessiz davranır — kullanıcı giriş yapmamışsa hiçbir şey yapmaz.
import { supabase } from "@/integrations/supabase/client";

export interface LogAnswerParams {
  topicId: string;
  letterId: string;
  correct: boolean;
  gameId?: string;
  responseMs?: number;
  // SRS hesabından gelen güncel durum
  knewBefore?: boolean;
  learnedAtMs?: number;     // epoch ms — seviye 3'e ilk ulaştığı an
  timeToLearnMs?: number;   // öğrenmeye kadar harcanan toplam cevap süresi
  totalResponseMs?: number; // tüm karşılaşmaların toplam süresi
  level?: number;
}

export async function logAnswer(params: LogAnswerParams) {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) return;

  // Ham olay (analitik için süre dahil)
  supabase.from("answer_events").insert({
    user_id: user.id,
    topic_id: params.topicId,
    letter_id: params.letterId,
    game_id: params.gameId ?? null,
    correct: params.correct,
    response_ms: params.responseMs ?? null,
  }).then(() => {});

  // Toplulaştırılmış istatistik (upsert) + öğrenme gücü alanları
  const { data: existing } = await supabase
    .from("letter_stats")
    .select("id, shown_count, correct_count, wrong_count, level, learned_at, time_to_learn_ms, total_response_ms, knew_before")
    .eq("user_id", user.id)
    .eq("topic_id", params.topicId)
    .eq("letter_id", params.letterId)
    .maybeSingle();

  const newLevel = params.level ?? (existing ? Math.max(1, Math.min(4, existing.level + (params.correct ? 1 : -1))) : (params.correct ? 2 : 1));
  const addMs = params.responseMs && params.responseMs > 0 ? Math.min(params.responseMs, 60_000) : 0;

  if (existing) {
    const learnedAt = params.learnedAtMs
      ? new Date(params.learnedAtMs).toISOString()
      : existing.learned_at; // mevcut değeri koru
    await supabase.from("letter_stats").update({
      shown_count: existing.shown_count + 1,
      correct_count: existing.correct_count + (params.correct ? 1 : 0),
      wrong_count: existing.wrong_count + (params.correct ? 0 : 1),
      level: newLevel,
      knew_before: params.knewBefore ?? existing.knew_before,
      learned_at: learnedAt,
      time_to_learn_ms: params.timeToLearnMs ?? existing.time_to_learn_ms,
      total_response_ms: (existing.total_response_ms ?? 0) + addMs,
      last_seen_at: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await supabase.from("letter_stats").insert({
      user_id: user.id,
      topic_id: params.topicId,
      letter_id: params.letterId,
      shown_count: 1,
      correct_count: params.correct ? 1 : 0,
      wrong_count: params.correct ? 0 : 1,
      level: newLevel,
      knew_before: params.knewBefore ?? null,
      learned_at: params.learnedAtMs ? new Date(params.learnedAtMs).toISOString() : null,
      time_to_learn_ms: params.timeToLearnMs ?? null,
      total_response_ms: addMs,
    });
  }
}

export async function markKnewBefore(topicId: string, letterId: string, knewBefore: boolean) {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) return;
  const { data: existing } = await supabase
    .from("letter_stats").select("id")
    .eq("user_id", user.id).eq("topic_id", topicId).eq("letter_id", letterId).maybeSingle();
  if (existing) {
    await supabase.from("letter_stats").update({ knew_before: knewBefore }).eq("id", existing.id);
  } else {
    await supabase.from("letter_stats").insert({
      user_id: user.id, topic_id: topicId, letter_id: letterId, knew_before: knewBefore,
    });
  }
}
