## Flappy oyunu — eğlence + düzgün çarpışma

Kullanıcı geri bildirimi:
- Doğru harf yenince tüm harflerin silinmesi oyunu sıkıcı yaptı. Eski yanlış harfler kalmalı, oyuncu onlardan kaçmalı.
- Harfler üst üste denk gelmemeli.
- Kuşun geçemeyeceği "duvar" oluşmamalı (dikeyde her zaman bir boşluk olmalı).
- Önceki "ta dedi ama yanlış saydı" hatası tekrar etmemeli.

### Yapılacaklar (sadece `src/pages/games/FlappyGame.tsx`)

1. **Doğru harf yenince ekran temizlenmeyecek**
   - Sadece o harf listeden çıkarılacak. Diğer (yanlış) harfler ekranda kalmaya devam edecek; oyuncu onlara çarpmamak için manevra yapacak.
   - Yeni hedef seçilirken `setLetters([])` çağrısı kaldırılacak; eskiden kalan yanlış harfler doğal olarak ekranı geçip gidene kadar kalacak.

2. **Yanlış algılama hatasını farklı çözmek**
   - Çarpışmada hedef önceliği korunacak (mevcut "bestTargetD vs bestWrongD, hedef varsa yanlışı yok say" mantığı kalacak).
   - Ek olarak: hedef harf kuşun yatay yakın bölgesindeyken (örn. `|l.x - BIRD_X| < 14`) aynı dikey bölgedeki yanlış harf çarpışması bir tick için yok sayılacak. Böylece "ta"ya giderken yanındaki renkli/yanlış harf yanlış sayılmayacak.
   - Hedef harf yendiğinde, o anda kuşa çok yakın (örn. `d < HIT_THRESH + 4`) olan yanlış harfler de listeden çıkarılacak — "doğruyu yedim ama hemen arkasındaki yanlışa da çarptım" durumu engellenecek. Geri kalan yanlış harfler ekranda kalacak.

3. **Üst üste binmeyi önlemek**
   - Spawn anında: yeni harfler için y-slotları rastgele seçilecek, ama o sırada ekranda olan (henüz `x > 95` civarı, yani yeni gelen) harflerin y'sine yakın slotlar elenecek (en az ~14 birim dikey fark).
   - Aynı dalga içindeki harfler arasında yatay mesafe artırılacak (22 → 28) ve dikey slotlar daha geniş tutulacak.
   - Spawn aralığı `SPAWN_EVERY` 110 → 130 yapılacak, böylece dalgalar üst üste binmeyecek.

4. **Geçilemeyen duvar oluşmasın**
   - Bir dalgadaki harfler tüm dikey alanı kapatmayacak: en fazla 2 harf aynı x kolonunda olabilir ve aralarında en az ~30 birimlik dikey boşluk garanti edilecek.
   - Yeni dalga spawn ederken, ekranda yatayca yakın (`Δx < 18`) başka harfler varsa, yeni dalganın y-slotları onlarla çakışmayacak şekilde seçilecek; uygun slot bulunamazsa o spawn atlanacak.
   - Maksimum aynı anda ekranda olan harf sayısı sınırlanacak (örn. 6) — ekran çok dolarsa yeni spawn atlanır.

### Teknik notlar
- Tüm değişiklik tek dosyada: `src/pages/games/FlappyGame.tsx`.
- SRS / puan / can mantığına dokunulmayacak.
- `pickTarget` artık `setLetters([])` çağırmayacak; yeni hedef sadece `setTarget` + ses çalacak.
- Spawn fonksiyonu küçük bir yardımcıya alınıp slot çakışma kontrolü yapacak.
