# Post-Mortem Şablonu — b4skills

> **Kural:** Bu belge blameless (suçsuz) bir süreçle doldurulur.  
> Amaç bireyleri değil, sistemik sorunları tespit etmektir.  
> Her SEV-1 ve SEV-2 incident için 48 saat içinde tamamlanmalıdır.

---

## Incident Özeti

| Alan | Değer |
|---|---|
| **Incident ID** | INC-YYYY-NNN |
| **Başlık** | [Kısa açıklama] |
| **Tarih** | YYYY-MM-DD |
| **Süre** | HH saat MM dakika |
| **Şiddet (Severity)** | SEV-1 / SEV-2 / SEV-3 |
| **Etkilenen Bileşenler** | API / AI Puanlama / Veritabanı / Sınav Motoru |
| **Kullanıcı Etkisi** | [Kaç kullanıcı, nasıl etkilendi] |
| **Olay Yazan** | [İsim] |
| **İnceleme Tarihi** | YYYY-MM-DD |

---

## Zaman Çizelgesi (Timeline)

| Zaman (UTC) | Olay |
|---|---|
| HH:MM | 🔴 İlk alarm / kullanıcı bildirimi |
| HH:MM | 🔍 On-call mühendis olayı incelemeye başladı |
| HH:MM | 🎯 Kök neden tespit edildi |
| HH:MM | 🛠️ Geçici çözüm (mitigation) uygulandı |
| HH:MM | ✅ Hizmet tam olarak geri geldi |
| HH:MM | 📋 Post-mortem süreci başladı |

**Toplam etki süresi:** ___ saat ___ dakika  
**Tespit süresi (MTTD):** ___ dakika  
**Kurtarma süresi (MTTR):** ___ dakika  

---

## Kök Neden Analizi (Root Cause)

### Birincil Neden
> [Teknik olarak ne oldu? Hangi bileşen neden başarısız oldu?]

### Katkıda Bulunan Faktörler

1. **Faktör 1:** [Açıklama]
2. **Faktör 2:** [Açıklama]
3. **Faktör 3:** [Açıklama]

### "5 Neden" Analizi

| # | Neden |
|---|---|
| 1 | [Semptom: Ne gözlemlendi?] |
| 2 | [Neden böyle oldu?] |
| 3 | [Bunun altında yatan neden neydi?] |
| 4 | [Daha derin sebep nedir?] |
| 5 | [Kök neden] |

---

## Etki Analizi

### Kullanıcı Etkisi

- **Etkilenen aktif oturum sayısı:** ___
- **Yarıda kesilen sınav sayısı:** ___
- **Puanlama yapılamayan yanıt sayısı:** ___
- **Etkilenen kurum sayısı:** ___

### SLO Etkisi

| SLO | Hedef | Gerçekleşen | Etki |
|---|---|---|---|
| API Erişilebilirlik | ≥ 99.5% | ___% | ___ saat hata bütçesi tüketildi |
| p95 Gecikme | < 500ms | ___ms | — |
| 5xx Hata Oranı | < 0.5% | ___% | — |

---

## İyi Çalışan Şeyler

> [Olayı daha da kötü olmaktan neyin önlediğini yazın. Tespit araçları, fallback mekanizmaları, on-call yanıt süresi vb.]

- ✅ [Örnek: Circuit breaker, Gemini down olduğunda human review kuyruğuna yönlendirdi]
- ✅ [Örnek: Redis fallback, exposure store in-memory modda çalışmaya devam etti]
- ✅ [Örnek: pino-http structured logs, sorunun hızlı tespitini sağladı]

---

## Kötü Çalışan Şeyler

> [Tespit, yanıt veya kurtarmayı zorlaştıran şeyleri yazın.]

- ❌ [Örnek: Alarm eşiği çok geç tetiklendi]
- ❌ [Örnek: Runbook eksikti]

---

## Aksiyon Kalemleri

| ID | Aksiyon | Sahip | Öncelik | Hedef Tarih | Durum |
|---|---|---|---|---|---|
| A1 | [Yapılacak şey] | [İsim] | P1 / P2 / P3 | YYYY-MM-DD | 🔴 Açık |
| A2 | [Yapılacak şey] | [İsim] | P2 | YYYY-MM-DD | 🔴 Açık |
| A3 | [Yapılacak şey] | [İsim] | P3 | YYYY-MM-DD | 🔴 Açık |

> **Öncelik tanımı:** P1 = 48 saat, P2 = 1 hafta, P3 = 1 ay

---

## Tekrar Önleme

### Kısa Vadeli (bu hafta)

- [ ] [Acil aksiyon 1]
- [ ] [Acil aksiyon 2]

### Orta Vadeli (bu ay)

- [ ] [Sistem iyileştirmesi 1]
- [ ] [Monitoring iyileştirmesi 1]

### Uzun Vadeli (bu çeyrek)

- [ ] [Mimari iyileştirme 1]

---

## Referanslar

- Incident ticket: [JIRA/Linear linki]
- Sentry event: [Sentry linki]
- İlgili workflow: [GitHub Actions run linki]
- Runbook bölümü: [docs/OPERATIONS_RUNBOOK.md#section]

---

## İmzalar

| Rol | İsim | Tarih |
|---|---|---|
| Incident Komutanı | | |
| Engineering Lead | | |
| Assessment Director | | |

---

*Bu şablon [Google SRE Post-Mortem Culture](https://sre.google/sre-book/postmortem-culture/) ve [Atlassian Incident Management](https://www.atlassian.com/incident-management/postmortem) prensipleri doğrultusunda hazırlanmıştır.*
