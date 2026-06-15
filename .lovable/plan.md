
# Endless Mum — Analitik & Öğrenme Verisi Paneli

Amaç: Velinin kendi çocuğunu, anasınıfı öğretmeninin kendi sınıfını, senin (admin) tüm uygulamayı **anonim ve KVKK uyumlu** şekilde izleyebileceği bir analitik sistemi. Mobil (Capacitor) ile uyumlu, ad/soyad/foto gibi kimlik verisi toplamadan.

---

## 1. Yasal yaklaşım (KVKK / GDPR-K çocuk verisi)

- **Hiçbir kimlik bilgisi toplanmaz**: ad, soyad, foto, doğum tarihi yok. Sadece **yaş aralığı** (3-4, 5-6) ve **cinsiyet (opsiyonel, "belirtmek istemiyorum" varsayılan)**.
- Veri sahibi: veli. İlk girişte tek ekranlı **veli onayı** (toggle + tarih damgası) — onay verilmezse sadece localStorage çalışır, sunucuya hiçbir event gitmez.
- Tüm event'ler `user_id` (auth uid) ile bağlanır; PII içermez. Veli "**verilerimi sil**" butonuyla tüm event'lerini silebilir (RLS + edge function).
- Öğretmen sınıfa **davet kodu** ile bağlanır; çocuğun adını değil, takma adı (örn. "Mavi Tilki") görür.
- Admin paneli **toplu/anonim** rakamlar gösterir; tek bir kullanıcının ham eventlerine erişim sadece "veri silme talebi" için, gerekçeli.

---

## 2. Veri modeli (yeni tablolar)

Mevcut `answer_events` ve `letter_stats` korunur. Yeni:

```text
profiles            (+ yeni alanlar)
  age_band          text   -- "3-4" | "5-6"
  gender            text   -- "k" | "e" | "x"  (x = belirtmedi, default)
  role              -- ZATEN user_roles'ta: parent | teacher | admin (enum'a eklenir)
  analytics_consent boolean default false
  consent_at        timestamptz
  pseudonym         text   -- otomatik (örn. "Mavi-Tilki-42")

classrooms
  id, teacher_id (user_id), name, invite_code (unique), created_at

classroom_members
  classroom_id, child_user_id, joined_at
  -- veli, çocuğunun kodla katılmasını onaylar

game_sessions
  id, user_id, game_id, topic_id (nullable), started_at, ended_at,
  duration_ms, score int, correct int, wrong int, completed bool,
  age_band, gender   -- session anındaki snapshot (denormalize, raporlama hızlı)

screen_views
  id, user_id, path, opened_at, duration_ms, age_band

learning_milestones
  id, user_id, topic_id, letter_id, level smallint,
  reached_at timestamptz
  -- ilk Level 2/3/4 anı; "öğrenme süresi" = first_seen_at → reached_at(L4)

paywall_events
  id, user_id, step text  -- "viewed" | "plan_selected" | "checkout_started" | "purchased" | "abandoned"
  plan_id text, created_at
```

RLS:
- `parent` kendi `user_id`'sinin satırlarını okur/yazar.
- `teacher` sadece `classroom_members` ile bağlı çocukların satırlarını okur (security definer fn `is_classmate(teacher, child)`).
- `admin` her şeyi okur ama **sadece view'lar üzerinden toplu** (ham tablolara client erişimi yok; admin sayfası `analytics_*` view'ları sorgular).
- Tüm `public` tabloları için GRANT bloğu eklenir.

---

## 3. Toplulaştırma view'ları (admin için)

```text
analytics_daily_active       -- user_id'siz, sadece sayım
analytics_letter_learn_time  -- harf, ortalama dakika, n
analytics_game_popularity    -- game_id, oturum sayısı, ort. süre, tamamlama %
analytics_game_retention     -- game_id, tekrar oynama oranı (24h, 7g)
analytics_funnel_paywall     -- adım, kullanıcı sayısı, oran
analytics_session_heatmap    -- saat × gün, oturum sayısı
analytics_age_breakdown      -- age_band × topic × başarı %
```

View'lar SECURITY INVOKER; admin'e GRANT SELECT. Veli/öğretmen view'ları da ayrı (`my_child_*`, `classroom_*`).

---

## 4. İstemci entegrasyonu

Yeni `src/lib/analytics.ts`:
- `consentGiven()` kontrolü; yoksa hiç gönderme.
- `trackSession(gameId, topicId)` → mount/unmount ile süre.
- `trackScreen(path)` → react-router listener.
- `trackPaywall(step, planId?)` → Paywall.tsx adımlarında.
- `trackMilestone(topicId, letterId, level)` → `recordSrsAnswer` içinden çağrılır (level her arttığında upsert).
- Tüm event'ler batch'lenip 5sn'de bir gönderilir (mobil pil dostu).

Mevcut `cloudSync.ts` korunur, sadece `game_sessions` ile zenginleştirilir.

---

## 5. UI sayfaları

- `/ilerleme` (mevcut) — veli için: çocuğun harf süreleri, en sık oynadığı oyun, son 7 gün streak.
- `/sinif` — **yeni**, öğretmen rolü için: sınıf listesi, davet kodu, sınıf ortalamaları (anonim takma adlarla).
- `/admin` — **yeni**, admin rolü için: KPI'lar (DAU, ort. oturum, en popüler oyun), öğrenme süresi grafikleri, ödeme funnel'i, yaş/cinsiyet kırılımı. `recharts` ile.
- `/ayarlar` → "Analitik onayı" toggle + "Verilerimi sil" butonu eklenir.
- `/giris` sonrası ilk açılışta tek seferlik **onam modal'ı** (rol seçimi: Veliyim / Öğretmenim, yaş aralığı, opsiyonel cinsiyet, onay).

---

## 6. Adım adım uygulama sırası

1. **Migration 1**: `app_role` enum'a `parent`, `teacher` ekle; `profiles`'a yeni alanlar; tüm yeni tablolar + GRANT + RLS + security definer fn'ler (`is_classmate`, `current_age_band`).
2. **Migration 2**: Analytics view'ları + GRANT.
3. **`src/lib/analytics.ts`** + tüm oyunlara mount-süresi hook (`useGameSession(gameId)`).
4. **Onam modal'ı** + Settings'e veri silme.
5. **Veli görünümü**: mevcut `/ilerleme`'yi yeni metriklerle genişlet (harf öğrenme süresi, oyun süresi).
6. **Öğretmen `/sinif`** sayfası + sınıf oluştur/katıl akışı.
7. **Admin `/admin`** sayfası + recharts grafikleri.
8. **Paywall takibi**: `Paywall.tsx`'e adım event'leri.
9. Capacitor için: tüm event'ler offline kuyrukta (`localStorage`), bağlantı gelince flush.

---

## 7. Toplanan metriklerin örnek listesi

- Harf/öğe başına: ilk görme, L4'e ulaşma süresi (dakika), tekrar sayısı.
- Oyun başına: oynanma sayısı, ort. süre, tamamlanma %, doğru/yanlış oranı, "beğeni proxy"si (24h içinde tekrar açma).
- Konu başına: yaş bandına göre başarı %.
- Oturum: günlük/saatlik dağılım, streak, ort. oturum süresi.
- Ödeme funnel: paywall görüldü → plan seçildi → checkout başladı → satın alındı (her adımda drop %).
- Cihaz: yalnızca platform (web/ios/android) + dil; IP/UA saklanmaz.

---

## 8. Riskler & notlar

- Çocuk verisi olduğundan: ses kayıtları, foto, konum **kesinlikle yok**.
- Cinsiyet opsiyonel, varsayılan boş; istatistikte n<5 olan hücreler "—" gösterilir (k-anonimite).
- Admin paneli ham `user_id` listelemez; yalnızca toplam ve oran.
- `pseudonym` çocuk adı yerine — öğretmen sınıfta gerçek ad göremez (veli kendi cihazında etiketleyebilir, local-only).
