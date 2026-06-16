Sorunun ana nedeni: bazı yerlerde cevaplar iki farklı konu kimliğiyle kaydediliyor, bazı oyunlar hem oyun SRS'ine hem normal quiz ilerlemesine çift kayıt atıyor, ayrıca “buluttaki verilerimi sil” düğmesi öğrenme ilerlemesini de siliyor. Sonuç olarak ilerleme ekranı sıfır görünüyor veya seviyeler yanlış kaynaktan okunuyor.

Plan:

1. Bulut ilerleme kaydını tek ve güvenilir hale getireceğim

- `recordSrsAnswer` artık giriş yapan kullanıcıda buluta yazma başarısız olursa bunu sessizce yutmayacak; konsolda görülebilir, net hata verecek.
- Başarılı bulut kaydından dönen güncel satırla yerel önbelleği hemen güncelleyecek; ekranın bulutu beklerken sıfır göstermesi engellenecek.
- Giriş yapan kullanıcı için ilerleme kaynağı `letter_stats` olacak; localStorage sadece geçici önbellek olacak.

2. Oyunlardaki çift/yanlış kayıtları düzelteceğim

- Oyunlar özel `games` namespace'ine yazmaya devam edecekse bunu normal ilerleme ekranından ayrı tutacağım.
- Normal ilerleme ekranını etkileyen kayıtlar yalnızca gerçek konu kimliğiyle (`ingilizce`, `sayılar`, vb. konu item’ının bağlı olduğu topic) yazılacak.
- Aynı cevap için hem `recordSrsAnswer("games", ...)` hem `recordGameAnswer(...)` çağrılan yerlerde çift sayım ve konu karışıklığını kaldıracağım.
- Oyun ile test ayni ilerleme ekraninda seviyelere etki etsin onlari ben ayarladim nasil test sorusu testse oyunlarda test gibi ona gore ayarladim.oyunla testi ilerleme ekrani ayirma.

3. Progress ekranını tamamen bulut-first yapacağım

- Giriş yapılmışsa üstteki Toplam/Doğru/Başarı ve Seviye 1-4 kutuları doğrudan bulut satırlarından hesaplanacak.
- Konu detayları da aynı bulut state’inden beslenecek.
- Bulut verisi henüz gelmeden sıfır gösterme yerine yükleniyor durumu korunacak.

4. Test/pratik üstündeki seviye kutularını cloud-aware yapacağım

- Konu sayfasındaki seviye kutuları buluttaki ilgili topic state’iyle hesaplanacak.
- Doğru cevap: seviye 1→2→3→4; yanlış cevap: 4→3→2→1 mantığı korunacak.
- Soru seçimi yine seviye dağılım ağırlıklarına göre yapılacak, ama giriş yapan kullanıcıda buluttaki seviyelerden beslenecek.

5. “Buluttaki verilerimi sil” düğmesini güvenli hale getireceğim

- Gizlilik/analitik silme işlemi artık öğrenme ilerlemesini (`letter_stats`) ve cevap geçmişini (`answer_events`) silmeyecek.
- Eğer gerçekten öğrenme ilerlemesini silmek gerekiyorsa bunu ayrı, açık etiketli ve ayrı onaylı bir işlem yapacağım; mevcut düğme hesabın tekrar sistemini sıfırlamayacak.

6. Backend tarafını kontrol edip gerekiyorsa migration ekleyeceğim

- `letter_stats` ve `answer_events` izinlerini ve RLS kurallarını doğrulayacağım.
- RPC fonksiyonunun `auth.uid()` ile doğru kullanıcıya yazmasını ve concurrent cihazlarda aynı satırı bozmamasını koruyacağım.
- Gerekirse sadece izin/fonksiyon düzeltmesi içeren migration hazırlayacağım.

7. Doğrulama

- Kod tarafında tüm kayıt çağrılarını tekrar tarayacağım.
- Veritabanında son cevapların `letter_stats` / `answer_events` içine düştüğünü kontrol edeceğim.
- Aynı hesapla iki cihazda ilerleme ekranının aynı cloud state’i okuması için event/hydration akışını doğrulayacağım.