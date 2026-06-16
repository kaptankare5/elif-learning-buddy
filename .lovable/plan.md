# Plan: Hesap-bazlı ilerleme, giriş hatırlatma ve admin analitiği

## 1) Sorun: Farklı hesaplara giriş yapınca aynı ilerleme görünüyor

Bugün `Progress` sayfası ve oyunlardaki SRS verisi **sadece** cihazın `localStorage`'ından okunuyor (`elifba-srs-quiz-v1`, `elifba-srs-games-v1`). Hesap değiştirince localStorage aynı kaldığı için "ilerleme" değişmiyor. Ayrıca `Auth.tsx` her girişte cihazdaki misafir verisini hesaba otomatik aktarıyor (`migrateGuestDataToAccount`) — yeni bir hesap açan veli için bu yanlış.

### Yapılacaklar

- **Hesap-bazlı yerel anahtar**: `KEY(ns)` `elifba-srs-{ns}-v1` yerine `elifba-srs-{ns}-{userId|guest}-v1` olacak. `useAuth` üzerinden aktif kullanıcıya göre okuma/yazma. Misafirken `guest`, girişten sonra `userId` namespace'i kullanılacak.
- **Çıkış / hesap değişiminde reset**: `onAuthStateChange` dinleyicisinde önceki kullanıcının cache'i temizlenecek (yalnızca o kullanıcıya ait anahtarlar). Çıkışta misafir görünümü boş başlar.
- **İlk girişte buluttan hidrasyon**: Hesaba giriş anında `letter_stats` tablosundan o kullanıcının satırları çekilip o kullanıcının localStorage namespace'ine yazılacak (yeni hesapta tablo boşsa görünüm sıfırdan başlayacak). Yeni bir helper `hydrateFromCloud(userId)` eklenecek.
- **Otomatik migrate kapatılacak**: `Auth.tsx`'teki `migrateGuestDataToAccount` çağrısı kaldırılacak. Yerine `Settings` ekranına manuel bir buton: "Cihazdaki misafir ilerlemesini bu hesaba aktar" (tek seferlik onay, idempotent flag korunur).
- **Progress sayfası**: Misafirse "guest", girişliyse buluttan hidrate edilmiş kullanıcı verisini gösterecek; üstte küçük bir rozet: `👤 {display_name}` ya da "Misafir".

## 2) Veliye giriş yapmayı nazikçe hatırlat

- `Index` (ana sayfa) üst kısmında, misafir kullanıcıya kapatılabilir bir kart: "Veliysen giriş yap — ilerleme tüm cihazlarında güvenle saklansın." (gizleme 3 günlüğüne `localStorage` flag).
- Her oyun bitiminde misafirse bir kez (gün başına) küçük toast: "İlerlemen sadece bu cihazda saklanıyor — kaydetmek için giriş yap." `ParentGate` ardından `/giris`'e yönlendirme butonu.
- **Çocuk dostu**: hatırlatıcılar yalnızca metin/sticker, hızla kapatılabilir, oyunu kesintiye uğratmaz; mevcut `ParentGate` korunur.

## 3) Admin analitiği — yeni metrikler

### Yeni alan: oyun modu (super vs normal)
- `game_sessions` ve `answer_events` tablolarına `mode TEXT CHECK (mode IN ('normal','super'))` kolonu eklenecek (migration).
- `startGameSession`, `logAnswer`, `recordSrsAnswer` `lib/gameMode.ts`'ten okuyup `mode` parametresini ekleyecek.

### Yeni view'lar (migration)
- `analytics_learning_rate` — Yeni öğrenilen öğe / aktif dakika (yalnızca `knew_before=false`):  
  `learners`, `learned_items`, `active_minutes`, `items_per_minute`, `items_per_hour`, `mode` (normal/super kırılımı).
- `analytics_game_engagement` — Oyun başına toplam dakika, oturum başına ortalama süre, % tamamlama, doğruluk; `mode` kırılımı.
- `analytics_retention` — Kohort: signup tarihine göre D1 / D7 / D30 geri-dönüş yüzdesi (`screen_views` veya `game_sessions`'tan distinct day).
- `analytics_super_vs_normal` — Aynı kullanıcı havuzunda iki modun: ortalama öğrenme hızı, oturum süresi, devam oranı (drop-off), doğruluk.
- `analytics_known_letters` — Kullanıcı başına "zaten biliyordu" işaretlenen öğelerin sayısı (öğrenme hızından **dışlanmış** kontrol metriği olarak ayrı tablo).

### Admin UI eklemeleri (`src/pages/Admin.tsx`)
- "⚡ Öğrenme Hızı" kartı: dakikadaki yeni harf (normal vs super karşılaştırmalı bar chart).
- "🕒 Oyun Süresi" kartı: oyun başına toplam dakika.
- "🔁 Retention" kartı: D1/D7/D30 line chart.
- "🆚 Süper vs Normal" kartı: yan yana KPI'lar (hız, doğruluk, oturum süresi, drop-off).
- Filtre: yaş bandı + mode dropdown'u (mevcut kartlarda da filtre uygulansın).

### Hukuki / KVKK
- Hiçbir yeni PII toplanmıyor; sadece `mode` (enum) ve mevcut anonim agregalar. `analytics_consent=true` zorunluluğu korunur. Retention için `auth.users.created_at` SECURITY DEFINER view'da rumuzlanır (yalnız admin okur).

## Teknik detaylar (kısa)

```text
src/data/srs.ts
  KEY(ns) -> KEY(ns, userId)
  + getActiveUserId() helper (auth event ile cache)
  + hydrateFromCloud(userId) — letter_stats -> localStorage

src/hooks/useAuth.tsx
  onAuthStateChange:
    SIGNED_IN  -> hydrateFromCloud(user.id)
    SIGNED_OUT -> clearUserLocal(prev.id)

src/lib/gameMode.ts -> getMode() zaten var; analytics/cloudSync'e parametre olarak iletilir

supabase/migrations/*:
  ALTER TABLE answer_events ADD COLUMN mode text;
  ALTER TABLE game_sessions ADD COLUMN mode text;
  CREATE VIEW analytics_learning_rate ...
  CREATE VIEW analytics_game_engagement ...
  CREATE VIEW analytics_retention ...
  CREATE VIEW analytics_super_vs_normal ...
  CREATE VIEW analytics_known_letters ...
  GRANT SELECT ... TO authenticated;  (admin RLS zaten mevcut view'larda)
```

## Etki / risk

- `localStorage` anahtarı değişiyor — mevcut misafir verisi kullanıcı isterse Settings'ten içe aktarılır (kayıp yok, ama otomatik birleşmiyor).
- Yeni view'lar mevcut admin RLS modeline uyumlu (yalnızca `has_role(admin)`).
- Mode bilgisi geriye dönük `NULL`; view'larda `coalesce(mode,'normal')` kullanılır.

## Onay

Onaylarsan üç adımda uygularım: (1) DB migration + view'lar, (2) SRS hesap-bazlı yerel + bulut hidrasyon + çıkışta temizleme + auto-migrate kaldırma, (3) Admin UI yeni kartlar + giriş hatırlatıcılar.
