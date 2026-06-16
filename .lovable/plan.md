
# Hesap Aktarımı + İlerleme + Admin Per-Profil Düzeltmeleri

## Sorunların kökü

1. **"0 kayıt aktarıldı"**: `migrateGuestDataToAccount` `MIGRATED_FLAG`'i bir kere set ettikten sonra erken `return` ediyor. İlk girişte dialog "Evet" denip flag set olduktan sonra Ayarlar'daki butona basınca da 0 dönüyor. Ek olarak: aktarım sırasında misafir anahtarları silinmiyor — sonraki girişlerde aynı veri "bekliyor" gibi görünebiliyor; ama silindiğinde de hesap çıkış-girişinde tekrar import edilebilmesi gerek.
2. **İlerleme ekranı hesabı yansıtmıyor**: `getNamespaceStats` yalnız `elifba-srs-quiz-{uid}-v1` cache'ini okuyor. `hydrateSrsFromCloud` doğru çalışsa bile (a) çağrı zamanlaması (`apply` içinde fire-and-forget) ile ekran daha doluyu görmeden render edilebiliyor, (b) yeni hesabın cloud'u boşsa ve guest verisi aktarılmadıysa boş kalıyor, (c) hydrate yalnız `letter_stats`'tan yazıyor ama eğer hiç yazılmadıysa eski uid'in keyi temizlenmediği için **yanlış kullanıcının verisi** görünüyor olabilir (önbellek temizliği kaldırılmıştı; yeni hesabın keyi yoksa görünüm yine boş olmalı — ama re-hydrate fail olursa son veri kalır).
3. **Admin = toplam metrikler**: "already known items" gibi sayılar tek başına kıyaslanamıyor; profil bazında ve mod bazında kırılım gerek.

## Çözüm

### A) Aktarım (kesin düzeltme)
- `src/lib/localProgress.ts`:
  - `migrateGuestDataToAccount(userId, opts?: { force?: boolean })` — `force=true` iken `MIGRATED_FLAG` kontrolünü atla.
  - Aktarılan kayıt sayısı 0 ise flag'i **set etme** (gerçek aktarım yoksa "bir daha sorma" demeyelim).
  - Başarılı upsert sonrası misafir anahtarlarını **temizle** (`elifba-srs-{quiz,games}-guest-v1` ve eski `-v1`) — sonraki çıkışta yeni hesabın boş ekranı görünmesin diye **cloud'dan zaten hidrasyon yapılıyor**, yerelde duplikasyon olmaz.
  - `migrated` sayacı + `inserted/updated` kırılımı döndür (UX için "X yeni, Y güncellendi").
- `src/components/TransferGuestDialog.tsx`: `migrateGuestDataToAccount(uid, { force: true })`, sonuç toast'ında ayrıntı.
- `src/pages/Settings.tsx`: `doMigrate` da `{ force: true }` ile çağırsın; ek olarak 0 dönerse "Aktarılacak veri yok" toast'u + `MIGRATED_FLAG` ve `ASKED_FLAG`'i temizleyen küçük bir "Sıfırla" linki ekle (debug için gizli değil — kullanıcı anlasın).

### B) İlerleme ekranını buluttan canlı doldur
- `src/data/srs.ts`:
  - `getNamespaceStatsAsync(uid)` ekle: oturum varsa **cloud'dan tek query** ile aggregate (`shown_count`, `correct_count`, `level`) döndür; yoksa mevcut yerelden hesapla.
  - `hydrateSrsFromCloud` bittiğinde `PROGRESS_EVENT` zaten dispatch ediliyor — mevcut.
  - **Düzeltme**: aktif uid değiştiğinde önce yerel cache'i `setActiveSrsUser` çağrısıyla "yeni boş key" üzerinden okumaya başlasın; arkadan hidrasyon doldurana kadar **eski uid'in verisi sızmasın** (zaten anahtar değişikliği ile bu sağlanıyor ama `useSrsTick` bir kere tetiklenmiyor olabilir → `setActiveSrsUser` içinden `PROGRESS_EVENT`'in yanı sıra `storage` event'i de yayınla).
- `src/pages/Progress.tsx`:
  - Oturum varsa `useEffect` ile cloud aggregate'i çek ve stats / level dağılımı için kullan. Yoksa mevcut local mantığa düş.
  - Kullanıcı değiştiğinde otomatik yenile (uid değişiminde re-fetch).

### C) Admin: per-profil + faydalı, hukuken güvenli metrikler
**Yeni view'lar** (tek migration):
1. `analytics_user_progress` — **profil bazlı**:
   `user_id, display_name (rumuz/pseudonym fallback), age_band, gender, mode (super|normal majority), learned_items, known_items, total_items_seen, avg_seconds_per_learned_item, items_per_active_hour, last_active, accuracy_pct`.
   - "Öğrenme gücü" tanımı: `sum(time_to_learn_ms) / count(learned & not knew_before) / 1000` (saniye/öğe).
   - `items_per_active_hour` = `learned_count / (sum(response_ms of learned-only events) / 3_600_000)`. Bildiği harfler dahil edilmez.
2. `analytics_user_letter_breakdown` — profil × harf: `user_id, topic_id, letter_id, level, knew_before, learned_at, seconds_to_learn`.
3. `analytics_super_vs_normal_per_user` — aynı kullanıcıyı iki modda ayrı satır.
4. **PII koruması**: `display_name` yerine `coalesce(p.pseudonym, 'Öğrenci #' || substring(user_id::text,1,6))` döndür; e-posta/ad hiç gösterme. `gender`/`age_band` profiles'tan; eksikse "—".
5. RLS: hepsi `WITH (security_invoker=on)`, sadece `has_role(auth.uid(),'admin')` olan kullanıcılara SELECT (grant + base table policy zaten admin select destekliyor).

**Admin UI** (`src/pages/Admin.tsx`):
- Yeni kart **"👤 Profil bazlı ilerleme"**: tablo (rumuz, yaş, mod, öğrendiği öğe, ort sn/öğe, saat/öğe, doğruluk, son aktif) + filtre (mod: hepsi/super/normal; arama: rumuz).
- Bir satıra tıklayınca **detay drawer**: o kullanıcının harf kırılımı (`analytics_user_letter_breakdown`), Super vs Normal kıyas.
- Mevcut "Öğrenme Hızı" kartı **mod ayrımı + per-profil ortalama** olarak güncellenir.
- "Already known" sayısı tek başına bilgilendirici olmadığından kart kaldırılır; yerine **"Bilinen vs. öğrenilen oranı"** (her profilde) badge ile gösterilir.

### D) Tracking düzeltmeleri (gerekli minimum)
- `src/data/cloudSync.ts`: `mode`'u zaten yazıyor. Ek olarak `time_to_learn_ms` sadece **ilk Level 3 anında bir kere** yazılsın (mevcut `existing.time_to_learn_ms ?? null` mantığı düzgün; doğrulanacak).
- `recordSrsAnswer`: `knewBefore` netleştiği anda cloud satırına da yansıtma zaten var; ekstra değişiklik yok.

## Hukuki & gizlilik
- Admin ekranında **isim, e-posta, doğum tarihi gösterilmez**. Sadece rumuz + yaş bandı + cinsiyet (varsa). Kullanıcı `analytics_consent=false` ise satır gözükmez.
- Tüm yeni view'lar sadece admin'e açık (`has_role`).

## Dokunulan dosyalar
- `src/lib/localProgress.ts` (force opsiyonu, guest temizliği, dönüş tipi)
- `src/components/TransferGuestDialog.tsx` (force çağrı)
- `src/pages/Settings.tsx` (force çağrı, "sıfırla" linki, 0-kayıt UX)
- `src/data/srs.ts` (`getNamespaceStatsAsync`, event tetikleme iyileştirmesi)
- `src/pages/Progress.tsx` (cloud aggregate okuma)
- `src/pages/Admin.tsx` (yeni profil tablosu + detay drawer + filtre)
- **Migration**: 3 view + RLS grants (`analytics_user_progress`, `analytics_user_letter_breakdown`, `analytics_super_vs_normal_per_user`); `analytics_known_letters` view'ı kaldırılır.

## Kapsam dışı
- Yeni veri toplama (yaş, cinsiyet zorunlu hale getirme) yok — mevcut alanlar kullanılır.
- Çocuk profil çoklu kullanıcısı (tek hesap altında birden fazla çocuk) bu turda eklenmez.
