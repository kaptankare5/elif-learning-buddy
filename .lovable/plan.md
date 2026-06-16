Durumu gördüm: veritabanında `letter_stats` içinde kayıtlar var, ama uygulama hâlâ birçok yerde cihaz önbelleğini asıl kaynak gibi kullanıyor. Bu yüzden cihaz geçmişi silinince hesapla girişte seviye/progress sıfırlanmış gibi görünebiliyor. Ayrıca “misafir verisini hesaba aktar” akışı karışıklık çıkarıyor; isteğin doğrultusunda onu kaldıracağız.

Plan:

1. Misafir aktarımını tamamen kaldır
- Giriş sonrası otomatik “cihazdaki veriyi hesaba aktaralım mı?” sorusunu kaldıracağım.
- Ayarlar’daki “Cihazdaki misafir ilerlemesini bu hesaba aktar” kartını ve hatırlatıcı sıfırlama butonunu kaldıracağım.
- `TransferGuestDialog` bileşenini uygulamadan çıkaracağım.
- Eski aktarım yardımcı kodlarını artık kullanılmayacak şekilde temizleyeceğim.

2. Hesap açıkken ilerlemeyi ana kaynak olarak buluta bağla
- Giriş yapmış kullanıcıda SRS okuma/yazma akışını “hesabın bulut kaydı” mantığına sabitleyeceğim.
- Girişte buluttaki `letter_stats` verisi cihaz önbelleğine indirilecek; cihaz önbelleği sadece hızlı görüntü/cache olacak.
- Progress ekranındaki toplam cevap, doğru, başarı, seviye kutuları ve konu/harf kırılımları hesap açıkken bulut verisinden beslenecek.
- Bulut yüklenirken sıfır göstermek yerine yükleniyor durumu kullanılacak; veri yoksa gerçekten veri yok mesajı gösterilecek.

3. Oyunda seviye kaydı güvenilir olsun
- Cevap verildiğinde önce yerel görünüm güncellenecek, ardından aynı kayıt `letter_stats` tablosuna yazılacak.
- Bulut yazma hatası sessizce kaybolmasın diye en azından geliştirici görünür hata/toast/log davranışı iyileştirilecek.
- Level düşme/yükselme, doğru/toplam ve öğrenme süresi aynı kullanıcı hesabına yazılacak.

4. Veritabanı izinlerini sağlamlaştır
- `profiles`, `letter_stats`, `answer_events`, `subscriptions` için Data API izinlerini migration ile açıkça sabitleyeceğim. Mevcut RLS yine kullanıcıyı sadece kendi verisine sınırlar.
- Böylece Lovable Cloud tarafında “tablo var ama uygulama okuyamıyor/yazamıyor” riski azalır.

5. Abonelik/Capacitor için netleştirme
- Abonelik ilerlemeden ayrı tutulacak: `subscriptions` tablosu hesap bazlı okunuyor; cihaz geçmişi silmek aboneliği silmemeli.
- Capacitor’a çevirince sorun çıkarmaması için uygulamadaki satın alma durumu da cihaz değil hesap/bulut üzerinden kontrol edilmeli. Bu planda abonelik satın alma altyapısını baştan kurmayacağım; sadece mevcut abonelik okumasının hesap bazlı güvenli çalıştığını koruyacağım.

Teknik not:
- Lovable Cloud bu iş için uygun; sorun “bulut kötü” değil, uygulamada hesap verisi ile cihaz önbelleğinin karışık kullanılması. Bunu tek kaynak hesap/bulut olacak şekilde düzelteceğim.
- Misafir modu yine cihazda çalışır; ama giriş yapınca artık misafir verisini hesaba taşıma özelliği olmayacak.