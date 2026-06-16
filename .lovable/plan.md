Plan:

1. Backend izinlerini kesinleştir
- `letter_stats` ve `answer_events` tablolarında kullanıcı bazlı okuma/yazma/güncelleme izinlerini migration ile açıkça yeniden tanımlayacağım.
- RLS mantığı kullanıcıya sadece kendi `user_id` ilerlemesini gösterecek/yazdıracak şekilde kalacak.
- Cevap kaydeden `record_letter_answer` fonksiyonunun giriş yapan kullanıcılar tarafından çalıştırılabildiğini garanti edeceğim.

2. Cevap kaydını localStorage yerine backend-first yap
- Kullanıcı giriş yapmışsa doğru/yanlış cevabı önce backend fonksiyonuna gönderilecek.
- Seviye güncellemesi backend’de yapılacak: doğru cevap `1→2→3→4`, yanlış cevap `4→3→2→1`.
- Backend başarılı dönerse local cache sadece ekrandaki hızlı yenileme için backend satırından güncellenecek.
- Backend hatası olursa sessizce geçilmeyecek; böylece ilerleme “0” kalırsa sebebi görülebilecek.

3. Uygulama açılışında backend verisini yükle
- Hesap açıkken uygulama/ilerleme ekranı önce kullanıcının backend ilerlemesini çekecek.
- Veri gelmeden toplam cevap, doğru, başarı ve seviye kutularında `0` göstermek yerine yükleniyor durumu gösterilecek.
- Veri geldikten sonra tüm ekranlar aynı backend state’i okuyacak.

4. İlerleme ekranını sadece hesap verisine bağla
- `Progress` ekranındaki toplamlar ve Seviye 1/2/3/4 kutuları giriş yapan kullanıcıda doğrudan backend’deki `letter_stats` verisinden hesaplanacak.
- Tarayıcı geçmişi/localStorage silinse bile hesap verisi tekrar çekilip ekranda görünecek.

5. Test ve konu üstündeki seviye kutularını düzelt
- Konu/test ekranındaki üst seviye kutuları backend state yüklenmeden hesaplanmayacak.
- Soru seçimi de giriş yapan kullanıcıda backend seviyelerine göre yapılacak; localStorage sıfırlanınca tekrar sistemi sıfırlanmayacak.

6. Oyun cevaplarını aynı ilerleme sistemine yazdır
- Oyunlardaki doğru/yanlış cevaplar da aynı backend kayıt fonksiyonundan geçecek.
- Oyunlarda görünen kelime seviyeleri local cache yerine backend’den gelen seviyeyi kullanacak.

7. Doğrulama
- Değişiklikten sonra backend’de yeni cevap olayının ve kelime istatistiğinin yazıldığını sorguyla kontrol edeceğim.
- İlerleme ekranının hesap açıkken yükleme durumundan sonra gerçek sayıları gösterdiğini kontrol edeceğim.
- Tarayıcı verisi silinse bile hesap ilerlemesinin tekrar geldiğini doğrulayacağım.