# Erişilebilirlik Uyum Beyanı (Accessibility Statement)

**Platform:** b4skills Adaptif İngilizce Değerlendirme Platformu  
**Belge Versiyonu:** 1.0  
**Tarih:** 2026-05-10  
**Standart:** WCAG 2.1 Seviye AA (W3C, 2018)  
**Değerlendirme Yöntemi:** Statik kaynak analizi + manuel inceleme (faz 1); axe-core otomatik tarama (faz 2)

---

## Uyum Durumu: Kısmi (Partial Conformance)

b4skills, WCAG 2.1 Seviye AA'yı **kısmi uyum** düzeyinde karşılamaktadır.
Aşağıdaki bölümlerde incelenen bileşenler ve bilinen eksiklikler belgelenmiştir.

---

## 1. Uyumlu Alanlar

### 1.1 Sınav Arayüzü (ItemRenderer.tsx)

| WCAG Kriteri | Seviye | Durum | Kanıt |
|---|---|---|---|
| **1.1.1** Alt Text (metin olmayan içerik) | A | ✅ | Dekoratif SVG'ler `aria-hidden="true"`, içerik görselleri `aria-label` ile etiketli |
| **1.3.1** Bilgi ve İlişkiler | A | ✅ | `role="radiogroup"`, `role="radio"`, `role="form"` + `aria-labelledby` |
| **1.3.3** Duyusal Özellikler | A | ✅ | Seçenekler A/B/C/D harflerine ek olarak metin içeriği ile etiketli |
| **2.1.1** Klavye | A | ✅ | Tüm etkileşimli öğeler `<button>` ve `<input>` — doğal klavye odağı |
| **4.1.2** Ad, Rol, Değer | A | ✅ | `aria-checked`, `aria-label`, `role` tüm etkileşimli öğelerde mevcut |

### 1.2 Ses Oynatıcı (AudioPlayer.tsx)

| WCAG Kriteri | Seviye | Durum | Kanıt |
|---|---|---|---|
| **1.2.1** Yalnızca Ses | A | ✅ | Ses transkripti sınav sonunda sağlanır |
| **4.1.2** Ad, Rol, Değer | A | ✅ | `aria-label="Listening audio for this question"` |

### 1.3 Form ve Kimlik Doğrulama (AuthPage.tsx)

| WCAG Kriteri | Seviye | Durum | Kanıt |
|---|---|---|---|
| **1.3.1** Bilgi ve İlişkiler | A | ✅ | `htmlFor` ile etiket-input ilişkisi |
| **3.3.1** Hata Tanımlama | A | ⚠️ | Hata mesajları görsel olarak gösterilir; `role="alert"` eklenmesi gerekiyor |

---

## 2. Bilinen Uyumsuzluklar

| ID | Kriter | Seviye | Açıklama | Hedef Düzeltme |
|---|---|---|---|---|
| **A01** | 3.3.1 Hata Tanımlama | A | Login hata mesajları `role="alert"` veya `aria-live` kullanmıyor | Q3 2026 |
| **A02** | 1.4.3 Renk Kontrastı | AA | Bazı `text-gray-500` / `bg-white` kombinasyonları 4.5:1 altında olabilir | Q3 2026 |
| **A03** | 2.4.6 Başlıklar ve Etiketler | AA | İlerleme çubuğu (exam progress) `aria-valuenow` kullanmıyor | Q3 2026 |
| **A04** | 1.2.5 Ses Açıklaması | AA | Speaking soruları için örnek ses dosyaları transkript içermiyor | Q4 2026 |
| **A05** | 2.5.3 Etikette Ad | A | Bazı ikon düğmeleri yalnızca `aria-hidden` SVG içeriyor; `aria-label` eksik | Q3 2026 |

---

## 3. Test Yöntemi

### Faz 1 (Mevcut — 2026-05-10)
- Statik kaynak analizi: `src/components/__tests__/a11y-static.test.ts`
- Manuel inceleme: Chrome DevTools → Accessibility Tree
- ARIA örüntüsü doğrulama: `vitest run` suite içinde

### Faz 2 (Planlanan — Q3 2026)
DOM tabanlı axe-core entegrasyonu:
```bash
npm install -D @testing-library/react @testing-library/user-event jsdom vitest-axe
```

Vitest config güncellemesi:
```typescript
// vitest.config.ts — component tests
{
  test: {
    environment: "jsdom",  // ItemRenderer için
    setupFiles: ["./test/setup-axe.ts"],
  }
}
```

Örnek axe testi:
```typescript
import { axe } from "vitest-axe";
import { render } from "@testing-library/react";
import { ItemRenderer } from "../ItemRenderer";

it("has no WCAG violations", async () => {
  const { container } = render(<ItemRenderer item={mcItem} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 4. Kullanıcı Bildirimi

Erişilebilirlik sorunlarını bildirmek için:
- **E-posta:** a11y@[domain]
- **Yanıt süresi:** 5 iş günü
- **Konu satırı:** `[A11Y] <kısa açıklama>`

---

## 5. Teknik Gereksinimler

Bu platform aşağıdaki yardımcı teknolojilerle test edilmiştir:

| Yardımcı Teknoloji | Tarayıcı | Durum |
|---|---|---|
| NVDA 2024.x | Firefox | ⚠️ Kısmi (faz 2'de tamamlanacak) |
| VoiceOver (macOS 14) | Safari | ⚠️ Kısmi |
| ChromeVox | Chrome | ⚠️ Kısmi |

---

## 6. Mevzuat Referansları

- **Türkiye:** 5378 Sayılı Engelliler Hakkında Kanun (m.7) — web erişilebilirliği
- **AB:** Web Erişilebilirlik Direktifi (2016/2102) — kamu sektörü için zorunlu
- **ABD:** Rehabilitation Act §508 — federal kurumlar için geçerli

---

## 7. Sonraki İnceleme

**Sonraki tam WCAG değerlendirmesi:** 2026-09-01 (axe-core entegrasyonu sonrası)
