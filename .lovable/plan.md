
## Amaç

Türkiye KVKK (özellikle çocuk verileri) ve Capacitor mobil dağıtım göz önünde tutularak; giriş erişimini kolaylaştırmak, onay modalının tekrar tekrar açılmasını engellemek, hesapsız oynanan verinin hesaba taşınmasını sağlamak ve yaş seçeneklerini genişletmek.

---

## 1) Giriş yerini görünür hale getirme

- `Ayarlar` sayfasına en üste bir "Hesap" kartı:
  - Giriş yapılmadıysa → "Giriş / Kayıt" butonu (`/giris`).
  - Giriş yapıldıysa → e-posta + "Çıkış yap".
- `Index` (ana sayfa) sağ üstte küçük bir kullanıcı/giriş ikonu (giriş yoksa `/giris`, varsa `/ayarlar`).
- `BottomNav` değişmiyor (alanı küçük).

## 2) Onay modalının (ConsentModal) bir daha sorulmaması

Sorun: Modal sadece giriş yapan kullanıcıya açılıyor, ama her oturum açılışta tekrar tetikleniyor çünkü `consent_at` yalnız sunucuda. Tarayıcı verisi temizlenince ya da yeni cihazda tekrar soruluyor.

Çözüm:
- Tercihleri **yerelde de** önbelleğe al: `miniakil:profile-cache` zaten var; `consent_at` ve `age_band` da yazılacak.
- Modal açılma koşulu: (yerel cache YOK) **VE** (server `consent_at` YOK).
- Profil sorularını tek bir yere bağla:
  - **Hesapsız (guest)**: sadece yerel; sunucuya hiçbir şey gitmez (KVKK).
  - **Hesaplı**: yerel + `profiles` tablosu.
- "Tekrar sorma" mantığı: bir kez kaydedildikten sonra Ayarlar > Hesap içinden "Yaş / Cinsiyet" düzenlenebilir.

## 3) KVKK uyumlu veri toplama kurgusu (çocuklar, Türkiye)

Mimari prensip: **Yasal muhatap = veli (e-posta + şifre ile kayıtlı kişi).** Çocuğun adı/foto/doğum tarihi hiç toplanmaz.

- **Hesapsız mod (default):**
  - Tüm SRS, doğru/yanlış, süreler **sadece `localStorage`/IndexedDB** içinde tutulur (zaten `srs.ts` ve `gameProgress.ts` lokal).
  - `game_sessions`, `screen_views`, `answer_events`, `letter_stats`, `paywall_events`, `learning_milestones` sunucuya **yazılmaz**. `analytics.ts` zaten `consentGiven()` + `uid()` kontrolüne sahip; ek olarak guest için cloudSync'i bypass edeceğiz.
- **Hesap açma (Parent Gate):**
  - Kayıt ekranına bir **Ebeveyn Kapısı** (basit aritmetik, ör. "7 + 8 = ?") eklenecek.
  - Aydınlatma Metni + KVKK Açık Rıza onay kutusu (zorunlu) + Çocuk Avatarı/Takma Ad seçimi.
  - "Çocuğumun verilerinin işlenmesine veli sıfatıyla onay veriyorum" tek tıklık.
- **Veri Birleştirme (Migration) hesap açıldığı an:**
  - `src/lib/localProgress.ts` (yeni) tüm lokal SRS + ilerleme + süre verisini snapshot olarak verir.
  - `migrateGuestDataToAccount(userId)` fonksiyonu:
    1. `letter_stats` upsert (toplam sayaçlar, level, knew_before, time_to_learn_ms, total_response_ms),
    2. `learning_milestones` (level=3 ilk ulaşım) ekle,
    3. başarılı olunca yerel snapshot **silinmez** (offline destek için kalır), sadece `migrated_at` işaretlenir.
  - Çocuk seviye 1'e düşmez; kaldığı yerden devam eder.
- **Premium/ödeme akışı:**
  - Ödeme ekranına girişten önce Parent Gate.
  - Ödeme yapanın **veli** olduğu beyanı (checkbox) + iade hakkı + abonelik koşulları linki (KVKK/MEM/6502).
  - Yaş bandı sunucuya yazılmadan ödeme başlatılmaz (yaş çocuk = veli onayı zorunlu).
- **Capacitor için:**
  - iOS App Store / Google Play "Kids" kategorisi için: SDK üzerinden reklam yok, üçüncü taraf izleyici yok (zaten yok), ağ analitiği yalnız hesap + onay sonrası.
  - `Info.plist` / Android manifest tracking permission açıklamaları daha sonra eklenecek (ayrı görev).

## 4) Yaş seçeneklerini genişletme

Mevcut: 3, 4, 5, 6.
Yeni seçenekler (`Age` tipi genişler): **2, 3, 4, 5, 6, 7, 8**.
- 2: "Sesler & taklit"
- 3: "Tanıma & sesler"
- 4: "Renkler & sayılar"
- 5: "Harfler & kavramlar"
- 6: "Okuma hazırlık"
- 7: "1. sınıfa hazırlık"
- 8: "Okuma-yazma pekiştirme"

`topicForAge` ve `itemsForAge` limitleri yeni yaşlara göre güncellenir. Yaş bandı sunucuya 3 grup gider: `2-3`, `4-5`, `6-8` (anonimlik için daha kaba bantlama, KVKK için tercih edilir).

ConsentModal yaş seçimi 4 yerine 7 seçenekli grid; cinsiyet aynı kalır + "Belirtme" default.

## 5) Şifre / Google girişi

Mevcut akış zaten OK. Eklenecek küçük iyileştirme: `Auth.tsx` üzerinde Google butonu loading state'inde devre dışı kalsın ve hata mesajları toast yerine inline gösterilsin (mobil için daha güvenilir). (Önceki turda Google hatası net surfacing zaten eklendi.)

---

## Teknik Özet (geliştirici için)

**Yeni dosyalar**
- `src/lib/localProgress.ts` — guest SRS snapshot / migration helper'ları.
- `src/lib/parentGate.ts` + `src/components/ParentGate.tsx` — aritmetik kapı.
- `src/components/AccountCard.tsx` — Ayarlar üstünde kullanılan giriş kartı.

**Değişen dosyalar**
- `src/data/types.ts` — `Age = 2|3|4|5|6|7|8`.
- `src/lib/age.ts` — etiketler/açıklamalar, `itemsForAge` limit tablosu, yaş→bant haritası (`2-3 | 4-5 | 6-8`).
- `src/components/AgePicker.tsx` — 7 seçenekli grid.
- `src/components/ConsentModal.tsx` — yerel cache + server kontrolü; yeni yaş seçenekleri; sadece hesaplı kullanıcıda açılır; "Tekrar sorma".
- `src/lib/analytics.ts` — `ageBand()` yeni eşleme; guest için early-return; profile cache'e `consent_at` yazımı.
- `src/data/cloudSync.ts` — guest ise no-op (zaten user yoksa atlıyor, doğrulanacak).
- `src/pages/Auth.tsx` — Parent Gate + KVKK rıza kutucuğu + çocuk takma adı/avatar alanı (opsiyonel, kayıt anında); başarılı kayıt sonrası `migrateGuestDataToAccount`.
- `src/pages/Paywall.tsx` — Parent Gate + veli beyanı checkbox.
- `src/pages/Settings.tsx` — Hesap kartı; Yaş/Cinsiyet düzenleme bölümü; mevcut "Verilerimi sil" zaten var.
- `src/pages/Index.tsx` — sağ üstte küçük hesap ikonu.

**Veritabanı**
- `profiles` mevcut. `age_band` değerleri yeni: `2-3 | 4-5 | 6-8` (mevcut `3-4`/`5-6` satırları geriye uyumlu, sadece UI yeni değerler yazar). Yeni migration **gerekmez** (kolon `text`).
- `letter_stats.knew_before`, `learned_at`, `time_to_learn_ms`, `total_response_ms` — önceki turlarda eklendi, migration'a gerek yok.

**KVKK/yasal notlar (içerik)**
- Aydınlatma Metni ve KVKK Açık Rıza şablonu için iki kısa MD dosyası: `src/content/legal/aydinlatma.md`, `src/content/legal/acik-riza.md`. Ayarlar > Yasal bölümünden okunabilir. (İçerik kullanıcı/avukat tarafından doldurulacak — placeholder ile başlanacak.)

---

## Açıklığa kavuşturulması iyi olur (opsiyonel)

1. Çocuk için **takma ad + avatar** seçimini hesap açılışında zorunlu mu, opsiyonel mi tutalım?
2. Yaş bandını **3 grup** (`2-3 | 4-5 | 6-8`) sunucuya göndermeyi onaylıyor musun (KVKK için anonimliği güçlendirir)?
3. Parent Gate olarak basit aritmetik (`7+8`) yeterli mi, yoksa "uzun bas + sürükle" tarzı bir engel mi tercih?

Onaylarsan implementasyona geçerim.
