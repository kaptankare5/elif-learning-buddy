# Hesap & İlerleme Akışı — Düzeltmeler

## Sorunlar
1. Hesaba girip çıkınca ilerleme "sıfır" görünüyor (yeni hesabın cloud'u boş, misafir verisi otomatik gelmiyor; çıkışta misafir görünümüne dönülüyor).
2. Ayarlar'daki "Misafir ilerlemesini aktar" butonu kullanıcıya net geri bildirim vermiyor / işe yaramıyor gibi hissettiriyor.
3. Kullanıcı, aktarımın Ayarlar'da olduğunu bilmiyor — ilk girişte sormalı.
4. Veri silme tek `confirm()` ile çok kolay tetikleniyor; iptal/onay akışı zayıf.
5. Cihazdaki yerel ilerlemeyi silme butonu yok.

## Çözüm

### 1) İlk girişte otomatik "Aktarma" diyaloğu
- Yeni dosya: `src/components/TransferGuestDialog.tsx` — shadcn `AlertDialog` tabanlı, çocuksu/renkli.
  - Başlık: "Cihazdaki ilerlemeni hesabına ekleyelim mi?"
  - Açıklama: misafirken kazanılan rozet/seviyelerin bu hesaba eklenir, mevcut hesap verisi silinmez (max alınır).
  - "Evet, aktar" → `migrateGuestDataToAccount` + `hydrateSrsFromCloud`, toast ile "X kayıt aktarıldı".
  - "Hayır" → ikinci onay: "Emin misin? Bu hesap için bir daha sorulmayacak." iki butonlu; "Vazgeç" diyaloğa geri döner.
- `useAuth` içinde, kullanıcı **ilk kez** giriş yaptığında (flag: `miniakil:transfer-asked:{uid}` yoksa **ve** misafir SRS'inde veri varsa) global bir context event yayar.
- `src/App.tsx` (veya `Index`) bu event'i dinleyip dialog'u açar.
- Aktarım yapılsın ya da yapılmasın flag set edilir; "daha sonra sor" seçeneği için flag set edilmez.

### 2) Çıkış davranışı: ilerleme görsel kaybını önle
- `useAuth` `signOut`: önce kullanıcıya `AlertDialog` ile sorulur ("Çıkış yapmak istiyor musun? İlerlemen hesabında güvende kalır."). Onaylarsa çıkış.
- Çıkıştaki `clearUserLocalSrs(prevUid)` çağrısı **kaldırılır**: yerel önbellek dursun, tekrar girişte hidrate ile zaten güncellenir. (Cihaz başkasıyla paylaşıldığında manuel "Cihaz verilerimi sil" butonu var.)

### 3) Ayarlar > Aktar butonunu güçlendir
- Yükleme durumu (`busy`), başarı/başarısızlık için `toast` (mevcut `sonner`).
- Aktarım sonrası progress event tetikle (`elifba-progress-updated`) — Progress sayfası anında yenilensin.
- Buton metni: "⬆️ Misafir ilerlemesini bu hesaba aktar". Açıklama: "Cihazdaki misafir verilerinde X harf bulundu" (boşsa buton disabled + "Aktarılacak veri yok").

### 4) Güçlü onay (double-confirm) yardımcı
- Yeni: `src/components/ConfirmDestructive.tsx` — iki adımlı `AlertDialog`:
  - 1. adım: "Emin misin?" + risk açıklaması.
  - 2. adım: "Gerçekten silinsin mi? Geri alınamaz." + 3 saniye geri sayımlı "Sil" butonu (yanlışlıkla tıklamayı engellemek için).
- `Settings.tsx`'te kullanılır:
  - **Bulut verilerimi sil** (mevcut `deleteMyAnalytics`).
  - **Cihaz ilerleme verilerini sil** (yeni — aşağıda).

### 5) Cihaz ilerleme verisini silme
- `src/data/srs.ts`'e yeni: `clearLocalProgress(opts: { scope: "active" | "guest" | "all" })` — `elifba-srs-quiz-*`, `elifba-srs-games-*` anahtarlarını siler ve `PROGRESS_EVENT` yayar.
- Ayarlar'da yeni kart "📱 Cihaz verileri":
  - "Cihazdaki ilerlememi sil" → ConfirmDestructive (iki adımlı + geri sayım).
  - Misafirken: yalnız guest anahtar silinir.
  - Girişliyken: hem aktif kullanıcı önbelleği hem misafir verisi silinmesini seçtiren iki radio (varsayılan "yalnız bu hesabın cihaz önbelleği"). Bulut verisi etkilenmez (uyarı metni).

## Teknik detaylar (geliştirici)
- Tüm yeni dialoglar shadcn `AlertDialog` + Tailwind tasarım tokenları (`primary`, `destructive`, vs.).
- `migrateGuestDataToAccount` zaten `MIGRATED_FLAG` ile idempotent — değişiklik gerekmez; sadece UI'dan tetiklenir.
- `useAuth.tsx`: önceki uid'nin yerel SRS temizliği kaldırılacak; `setActiveSrsUser` ve `hydrateSrsFromCloud` aynı kalır.
- "İlk giriş" tespiti: hesap için `MIGRATED_FLAG` da `transfer-asked` flag'i de yoksa.

## Dokunulan dosyalar
- `src/hooks/useAuth.tsx` — çıkış onayı, ilk-giriş eventi, clear çağrısı kaldırma.
- `src/components/AccountCard.tsx` — çıkış onayı tetikleyici.
- `src/components/TransferGuestDialog.tsx` (yeni).
- `src/components/ConfirmDestructive.tsx` (yeni).
- `src/pages/Settings.tsx` — aktarım butonu UX, iki silme aksiyonu, yeni "Cihaz verileri" kartı.
- `src/data/srs.ts` — `clearLocalProgress` yardımcısı; misafir SRS'de veri var mı kontrolü için `hasGuestData()`.
- `src/App.tsx` — `TransferGuestDialog` global mount + event listener.

## Kapsam dışı
- Model değişikliği: Lovable mevcut "en üst" modeli (Claude Opus 4.5) ile çalışıyor; chat tarafı bu istekle değişmez.
- Bulut analitik/admin metrikleri bu turda değişmez.
