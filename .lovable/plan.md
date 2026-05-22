# Anasınıfı Modu: Yazısız & Oyunlaştırılmış Kavramlar

## Hedef
Okuma-yazma bilmeyen anaokulu çocuklarına uygun, **yazıya bağımlı olmayan**, sesli + görsel yönlendirmeli bir deneyim. Mevcut oyunlar (Yılan, Kuş, Match3 vb.) **aynı kalacak**. Sadece Topic (konu) sayfası ve Kavramlar bölümü dönüşecek.

## 1. Tüm Uygulamada "Yazısız Mod"
- Konu kartları, pratik soruları ve kartlar sayfasında **etiket yazılarını gizle**.
- Yazı yerine: büyük emoji + otomatik ses + dokunarak tekrar dinleme butonu (hoparlör ikonu).
- "Hangisi bu?" gibi yazılı sorular kalkar → onun yerine ses sorar ("Hangisi elma?"), sadece emoji'li butonlar gösterilir.
- Başlıklarda küçük yazı (PageHeader) kalır (öğretmen/veli için), ama oyun içi yazılar kaldırılır.

## 2. Kavramlar → Mini Oyunlar
Mevcut `kavramlar.ts` topic'leri için, klasik test yerine **etkileşimli mini oyun** açılır.

### a) Büyük & Küçük / Uzun & Kısa
- Zürafa boynu sahnesi: çocuk boynu yukarı/aşağı sürükler.
  - Boyun uzunsa → ses: "uzun" 🦒
  - Boyun kısaysa → ses: "kısa"
- Top sahnesi: top büyütülüp küçültülür → "büyük" / "küçük" sesi.

### b) Konum (üst/alt/içinde/dışında/sağ/sol/ön/arka)
- Kutu + kedi sahnesi: kediyi sürükle, bırakılan yere göre ses ("üstünde", "içinde"…).

### c) Zıt Anlamlılar
- İki nesneli karşılaştırma slaytı: parmakla istenen tarafı seç → ses doğrular.

### d) Duygular
- Yüz ifadesi seçicisi: ses "üzgün yüzü göster" der → çocuk doğru emojiye dokunur.

### e) Taşıtlar / Trafik / Günler
- Mevcut görsel quiz korunur ama yazı kaldırılır, ses ile soru sorulur.

> **Not:** Bu mesajda hepsini bir kerede yapmak büyük. İlk adımda **çerçeveyi** kuracağım: yazısız topic sayfası + 2 örnek interaktif kavram (Uzun/Kısa zürafa, Büyük/Küçük top). Geri kalan kavramlar aynı çerçeveye sonraki turlarda eklenecek.

## 3. "Nasıl Oynanır" Tanıtımı
- Her interaktif kavram oyununun başında **kısa animasyonlu gösterim** (CSS/SVG):
  - Örn: hayalet parmak boynu yukarı çekiyor + "uzun" sesi otomatik çalıyor.
- 3-4 saniyelik döngü, ses bitince oyun başlar.
- "Atla" butonu yerine ekrana dokununca geçilir (yazısız).

## 4. Teknik Plan
- Yeni dosya: `src/components/HowToPlay.tsx` (SVG animasyon + autoplay ses).
- Yeni dosya: `src/pages/kavram/NeckGame.tsx` (uzun/kısa zürafa).
- Yeni dosya: `src/pages/kavram/SizeGame.tsx` (büyük/küçük top).
- `src/data/types.ts` → `ContentTopic`'a opsiyonel `interactiveGame?: "neck" | "size" | "position" | "opposite" | "emotion"` alanı.
- `kavramlar.ts` → ilgili topic'lere `interactiveGame` etiketi.
- `src/pages/Topic.tsx` → eğer `topic.interactiveGame` varsa interaktif sahneyi render et, yoksa **yazısız** klasik quiz/kart akışı.
- Klasik akışta `label` / `subLabel` / "Hangisi bu?" yazıları kaldırılır.
- Mevcut oyunlar (`src/pages/games/*`) **dokunulmaz**.

## Bu turda yapılacaklar
1. `HowToPlay` bileşeni.
2. `NeckGame` (Uzun/Kısa) + `SizeGame` (Büyük/Küçük).
3. Topic.tsx'i yazısız moda çevir + interaktif yönlendirme.
4. `kavramlar.ts`'te `buyuk-kucuk` ve `uzun-kisa` topic'lerine `interactiveGame` ekle.
5. Diğer kavramlar (konum, zıt, duygu vb.) yazısız klasik mod ile çalışır; interaktif sahneleri sonraki turda ekleriz.
