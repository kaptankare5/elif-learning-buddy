// Cevapları Supabase'e (giriş yapan kullanıcılar için) kaydeder.
// Sessiz davranır — kullanıcı giriş yapmamışsa hiçbir şey yapmaz.
import { supabase } from "@/integrations/supabase/client";

export async function logAnswer(params: {
  topicId: string;
  letterId: string;
  correct: boolean;
  gameId?: string;
  responseMs?: number;
}) {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) return;

  // Ham olay
  supabase.from("answer_events").insert({
    user_id: user.id,
    topic_id: params.topicId,
    letter_id: params.letterId,
    game_id: params.gameId ?? null,
    correct: params.correct,
    response_ms: params.responseMs ?? null,
  }).then(() => {});

  // Toplulaştırılmış istatistik (upsert)
  const { data: existing } = await supabase
    .from("letter_stats")
    .select("id, shown_count, correct_count, wrong_count, level")
    .eq("user_id", user.id)
    .eq("topic_id", params.topicId)
    .eq("letter_id", params.letterId)
    .maybeSingle();

  if (existing) {
    const newLevel = Math.max(1, Math.min(4, existing.level + (params.correct ? 1 : -1)));
    await supabase.from("letter_stats").update({
      shown_count: existing.shown_count + 1,
      correct_count: existing.correct_count + (params.correct ? 1 : 0),
      wrong_count: existing.wrong_count + (params.correct ? 0 : 1),
      level: newLevel,
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
      level: params.correct ? 2 : 1,
    });
  }
}

export async function markKnewBefore(topicId: string, letterId: string, knewBefore: boolean) {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) return;
  const { data: existing } = await supabase
    .from("letter_stats")
    .select("id")
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .eq("letter_id", letterId)
    .maybeSingle();
  if (existing) {
    await supabase.from("letter_stats").update({ knew_before: knewBefore }).eq("id", existing.id);
  } else {
    await supabase.from("letter_stats").insert({
      user_id: user.id, topic_id: topicId, letter_id: letterId, knew_before: knewBefore,
    });
  }
}
