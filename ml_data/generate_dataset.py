"""
CafeML - Türk Restoranı Sipariş Veri Seti Üreticisi
====================================================
Toplantı notlarına göre üretilen gerçekçi sipariş verisi:
- 1000+ sipariş (varsayılan: 2000)
- Türk mutfağı ürünleri (lahmacun, kebap, pide, tatlı, içecek…)
- Birliktelik kurallarına uygun ağırlıklı ürün seçimi (Apriori)
- Yaş demografisi, saat, gün, hava durumu, özel gün korelasyonu
- Market sepet analizi için one-hot (transactional) format
"""

import random
import json
import csv
import math
from datetime import datetime, timedelta
from collections import defaultdict

random.seed(42)

# ─────────────────────────────────────────────
# 1. MENÜ TANIMI
# ─────────────────────────────────────────────
MENU = {
    # id: (ad, kategori, fiyat_tl, hazirlik_dk, kdv)
    1:  ("Adana Kebap",            "Ana Yemek - Kebap",    280.0,  12, 10),
    2:  ("Urfa Kebap",             "Ana Yemek - Kebap",    280.0,  12, 10),
    3:  ("İskender Kebap",         "Ana Yemek - Kebap",    320.0,  10, 10),
    4:  ("Karışık Izgara",         "Ana Yemek - Izgara",   380.0,  18, 10),
    5:  ("Tavuk Şiş",              "Ana Yemek - Izgara",   220.0,  15, 10),
    6:  ("Beyti Kebabı",           "Ana Yemek - Kebap",    300.0,  12, 10),
    7:  ("Lahmacun",               "Hamur İşi",             65.0,   5, 10),
    8:  ("Kıymalı Pide",           "Hamur İşi",            130.0,  12, 10),
    9:  ("Kaşarlı Pide",           "Hamur İşi",            140.0,  12, 10),
    10: ("Kıymalı Kaşarlı Pide",   "Hamur İşi",            150.0,  12, 10),
    11: ("Kavurma Pide",           "Hamur İşi",            160.0,  12, 10),
    12: ("Makarna (Bolonez)",      "Ana Yemek - Diğer",    180.0,  10, 10),
    13: ("Mantı",                  "Ana Yemek - Diğer",    200.0,  15, 10),
    14: ("Hamburger Menü",         "Fast-Casual",          240.0,   8, 10),
    15: ("Çiğ Köfte Dürüm",        "Fast-Casual",           80.0,   2, 10),
    # BAŞLANGIÇLAR / MEZELER
    16: ("Mercimek Çorbası",       "Çorba",                 90.0,   3, 10),
    17: ("Ezogelin Çorbası",       "Çorba",                 90.0,   3, 10),
    18: ("Yayla Çorbası",          "Çorba",                 95.0,   3, 10),
    19: ("Domates Çorbası",        "Çorba",                 85.0,   3, 10),
    20: ("Gavurdağı Salata",       "Salata & Meze",        120.0,   3, 10),
    21: ("Çoban Salata",           "Salata & Meze",        100.0,   3, 10),
    22: ("Mevsim Salata",          "Salata & Meze",         95.0,   3, 10),
    23: ("Ezme",                   "Salata & Meze",         90.0,   3, 10),
    24: ("Haydari",                "Salata & Meze",         90.0,   3, 10),
    25: ("İçli Köfte",             "Ara Sıcak",            130.0,   8, 10),
    26: ("Sigara Böreği",          "Ara Sıcak",            115.0,  10, 10),
    27: ("Patates Kızartması",     "Ara Sıcak",            100.0,   6, 10),
    # TATLILAR
    28: ("Havuç Dilimi Baklava",   "Tatlı",                180.0,   2, 10),
    29: ("Künefe",                 "Tatlı",                220.0,   8, 10),
    30: ("Fırın Sütlaç",           "Tatlı",                120.0,   1, 10),
    31: ("Profiterol",             "Tatlı",                140.0,   1, 10),
    32: ("Tiramisu",               "Tatlı",                150.0,   1, 10),
    33: ("Katmer",                 "Tatlı",                160.0,   5, 10),
    # İÇECEKLER
    34: ("Ayran",                  "İçecek - Soğuk",        45.0,   1, 10),
    35: ("Şalgam",                 "İçecek - Soğuk",        50.0,   1, 10),
    36: ("Kola",                   "İçecek - Soğuk",        60.0,   1, 10),
    37: ("Sprite / Fanta",         "İçecek - Soğuk",        60.0,   1, 10),
    38: ("Ice Tea",                "İçecek - Soğuk",        65.0,   1, 10),
    39: ("Su (500ml)",             "İçecek - Soğuk",        20.0,   1, 10),
    40: ("Limonata",               "İçecek - Soğuk",        75.0,   2, 10),
    41: ("Şıra",                   "İçecek - Soğuk",        60.0,   1, 10),
    42: ("Çay (Bardak)",           "İçecek - Sıcak",        25.0,   1, 10),
    43: ("Türk Kahvesi",           "İçecek - Sıcak",        65.0,   5, 10),
    44: ("Sütlü Kahve",            "İçecek - Sıcak",        85.0,   5, 10),
    45: ("Bitki Çayı",             "İçecek - Sıcak",        55.0,   3, 10),
    # KAHVALTI
    46: ("Serpme Kahvaltı (2 kişi)","Kahvaltı",            600.0,  15, 10),
    47: ("Kiremitte Menemen",      "Kahvaltı",             300.0,  10, 10),
    48: ("Sucuklu Yumurta",        "Kahvaltı",             280.0,   8, 10),
    49: ("Simit",                  "Kahvaltı",              40.0,   1, 10),
    # EKSTRALAR
    50: ("Ekstra Lavaş / Ekmek",   "Ekstra",                15.0,   1, 10),
}

# Kategoriler
def kategori(item_id):
    return MENU[item_id][1]

def is_ana_yemek(item_id):
    k = kategori(item_id)
    return k.startswith("Ana Yemek") or k == "Hamur İşi" or k == "Fast-Casual"

def is_icecek_soguk(item_id):
    return kategori(item_id) == "İçecek - Soğuk"

def is_icecek_sicak(item_id):
    return kategori(item_id) == "İçecek - Sıcak"

def is_tatli(item_id):
    return kategori(item_id) == "Tatlı"

def is_corba(item_id):
    return kategori(item_id) == "Çorba"

def is_kahvalti(item_id):
    return kategori(item_id) == "Kahvaltı"

# ─────────────────────────────────────────────
# 2. BİRLİKTELİK KURALLARI (Apriori Temelli)
# ─────────────────────────────────────────────
# (tetikleyici_id, eklenen_id, olasılık)
ASSOCIATION_RULES = [
    # Lahmacun → Ayran (conf: 0.85)
    (7,  34, 0.85),
    # Lahmacun → Çoban Salata
    (7,  21, 0.40),
    # Adana/Urfa Kebap → Ayran
    (1,  34, 0.70),
    (2,  34, 0.68),
    # Adana/Urfa → Şalgam
    (1,  35, 0.55),
    (2,  35, 0.55),
    # Adana/Urfa → Ezme
    (1,  23, 0.50),
    (2,  23, 0.45),
    # Adana/Urfa → Gavurdağı Salata
    (1,  20, 0.40),
    # Adana/Urfa → Künefe (tatlı)
    (1,  29, 0.35),
    (2,  29, 0.30),
    # İskender → Şıra
    (3,  41, 0.70),
    # İskender → Çay
    (3,  42, 0.60),
    # Baklava → Çay (conf: 0.95)
    (28, 42, 0.95),
    # Künefe → Çay
    (29, 42, 0.90),
    # Sütlaç → Türk Kahvesi
    (30, 43, 0.65),
    # Profiterol/Tiramisu → Türk Kahvesi
    (31, 43, 0.70),
    (32, 43, 0.70),
    # Çorba → Lahmacun (cross-sell)
    (16, 7,  0.40),
    (17, 7,  0.35),
    # Pide → Ayran
    (8,  34, 0.60),
    (9,  34, 0.60),
    (10, 34, 0.60),
    # Karışık Izgara → Şalgam
    (4,  35, 0.55),
    # Kahvaltı → Çay (conf: 0.95)
    (46, 42, 0.95),
    (47, 42, 0.90),
    (48, 42, 0.85),
    # Hamburger → Kola
    (14, 36, 0.80),
    # Hamburger → Patates Kızartması
    (14, 27, 0.75),
]

# ─────────────────────────────────────────────
# 3. YAŞ / SAAT / HAVA / ÖZEL GÜN MODELLERİ
# ─────────────────────────────────────────────

YAS_GRUPLARI = [
    ("18-24", 0.28),
    ("25-34", 0.30),
    ("35-44", 0.22),
    ("45-54", 0.13),
    ("55+",   0.07),
]

# Saatlik yoğunluk (Poisson lambdası gibi ağırlık)
SAAT_DAGITIM = {
    8: 0.04,  9: 0.06,  10: 0.05,  11: 0.06,
    12: 0.12, 13: 0.13, 14: 0.09,  15: 0.06,
    16: 0.04, 17: 0.04, 18: 0.05,  19: 0.10,
    20: 0.09, 21: 0.06, 22: 0.03,
}

HAVA_DURUM_LISTESI = [
    ("Güneşli",    0.30, 22),
    ("Bulutlu",    0.25, 15),
    ("Serin",      0.20, 10),
    ("Yağmurlu",   0.15, 8),
    ("Soğuk/Karlı",0.10, 2),
]

OZEL_GUNLER = {
    "2026-02-14": "Sevgililer Günü",
    "2026-03-08": "Dünya Kadınlar Günü",
    "2026-04-23": "23 Nisan Ulusal Egemenlik",
    "2026-05-19": "19 Mayıs Atatürk Anma",
    "2026-10-29": "29 Ekim Cumhuriyet Bayramı",
}

def ozel_gun_kontrol(tarih: datetime):
    key = tarih.strftime("%Y-%m-%d")
    return OZEL_GUNLER.get(key, None)

def hafta_sonu_mu(tarih: datetime):
    return tarih.weekday() >= 4  # Cuma, Cmt, Pazar

# ─────────────────────────────────────────────
# 4. SAAT'E GÖRE BAŞLANGIÇ ÜRÜN SEÇİMİ
# ─────────────────────────────────────────────
def saat_bazli_urun_havuzu(saat: int, hava: str):
    """Günün saatine ve hava durumuna göre olası başlangıç ürünleri."""
    if 8 <= saat < 12:
        # Kahvaltı saati
        return [46, 47, 48, 49, 42, 49]
    elif 12 <= saat < 14:
        # Öğle: hızlı yemek
        return [7, 7, 7, 8, 9, 14, 5, 15, 3]
    elif 14 <= saat < 17:
        # Öğleden sonra: tatlı + sıcak içecek
        return [28, 29, 30, 31, 32, 42, 43, 42, 43, 33]
    elif 17 <= saat < 19:
        # Akşamüstü: hafif
        return [7, 8, 26, 25, 42, 43]
    else:
        # Akşam yemeği: ağır
        if hava in ("Soğuk/Karlı", "Yağmurlu"):
            return [1, 2, 4, 3, 16, 17, 8, 10, 6]
        else:
            return [1, 2, 4, 5, 3, 6, 8, 9, 7]

# ─────────────────────────────────────────────
# 5. YAŞ GRUBUNA GÖRE ÜRÜN AĞIRLIĞI
# ─────────────────────────────────────────────
def yas_bazli_ek_urunler(yas_grubu: str):
    """Yaş grubuna göre ek sipariş havuzu."""
    if yas_grubu == "18-24":
        # Bütçe odaklı, fast-casual
        return [7, 7, 7, 15, 14, 36, 34, 27, 30]
    elif yas_grubu == "25-34":
        # Karma
        return [1, 5, 8, 7, 34, 35, 29, 42, 20]
    elif yas_grubu == "35-44":
        # Aile, paylaşmalık
        return [1, 2, 4, 16, 17, 23, 24, 34, 35, 28, 42, 25, 26]
    elif yas_grubu == "45-54":
        # Geleneksel
        return [1, 3, 2, 16, 17, 35, 41, 29, 42, 23, 24]
    else:  # 55+
        # Hafif, çorba ağırlıklı
        return [16, 17, 18, 8, 9, 39, 42, 30, 22]

# ─────────────────────────────────────────────
# 6. TEK SİPARİŞ ÜRET
# ─────────────────────────────────────────────
def urun_adi(item_id):
    return MENU[item_id][0]

def urun_fiyat(item_id):
    return MENU[item_id][2]

def siparis_uret(siparis_id: int, tarih: datetime, masa_id: int):
    saat = tarih.hour
    yas_grubu = random.choices(
        [g[0] for g in YAS_GRUPLARI],
        weights=[g[1] for g in YAS_GRUPLARI]
    )[0]

    hava = random.choices(
        [h[0] for h in HAVA_DURUM_LISTESI],
        weights=[h[1] for h in HAVA_DURUM_LISTESI]
    )[0]

    sicaklik = next(h[2] for h in HAVA_DURUM_LISTESI if h[0] == hava)
    # Mevsimsel sıcaklık varyasyonu
    ay = tarih.month
    if ay in (12, 1, 2):
        sicaklik = max(0, sicaklik - 5)
    elif ay in (6, 7, 8):
        sicaklik = min(38, sicaklik + 8)

    kisi_sayisi = random.choices([1, 2, 3, 4, 5, 6],
                                  weights=[10, 25, 20, 22, 15, 8])[0]

    ozel_gun = ozel_gun_kontrol(tarih)
    hs = hafta_sonu_mu(tarih)

    # ─── Ürün listesi oluştur ───
    sepet: dict[int, int] = {}  # item_id → miktar

    def ekle(item_id, miktar=1):
        sepet[item_id] = sepet.get(item_id, 0) + miktar

    # Saat bazlı başlangıç ürünleri (kişi başı 1 tane)
    havuz = saat_bazli_urun_havuzu(saat, hava)
    for _ in range(kisi_sayisi):
        secim = random.choice(havuz)
        ekle(secim)

    # Yaş bazlı ek ürünler
    yas_havuz = yas_bazli_ek_urunler(yas_grubu)
    ek_sayisi = random.randint(0, max(1, kisi_sayisi - 1))
    for _ in range(ek_sayisi):
        ekle(random.choice(yas_havuz))

    # ─── Birliktelik kuralları uygula ───
    mevcut = list(sepet.keys())
    for tetik_id, eklenecek_id, olasilik in ASSOCIATION_RULES:
        if tetik_id in mevcut and random.random() < olasilik:
            if eklenecek_id not in sepet:
                ekle(eklenecek_id, random.randint(1, max(1, kisi_sayisi - 1)))

    # ─── Hava durumu modifikasyonu ───
    if sicaklik < 10 and random.random() < 0.5:
        # Çorba ekle
        ekle(random.choice([16, 17, 18, 19]))
    if sicaklik > 25 and random.random() < 0.6:
        # Soğuk içecek ekle / miktarı artır
        ekle(random.choice([34, 40, 38, 39]))

    # ─── Özel gün modifikasyonu ───
    if ozel_gun == "Sevgililer Günü" and kisi_sayisi == 2:
        ekle(random.choice([29, 28, 31, 32]))  # tatlı
        ekle(43)  # türk kahvesi
    elif ozel_gun and random.random() < 0.3:
        ekle(random.choice([28, 29, 30]))

    # ─── Hafta sonu bonusu ───
    if hs and random.random() < 0.3:
        ekle(random.choice([25, 26, 28]))

    # ─── İkram/İptal simülasyonu (~%5) ───
    ikramlar = []
    iptal_sayisi = 0
    toplam_urun = sum(sepet.values())
    if toplam_urun > 4 and random.random() < 0.05:
        # Rastgele 1 ürün ikram
        ikram_urun = random.choice([42, 39, 34])  # çay/su/ayran
        ikramlar.append(ikram_urun)
    if toplam_urun > 5 and random.random() < 0.03:
        iptal_sayisi = 1

    # ─── Toplam hesapla ───
    toplam_tutar = sum(urun_fiyat(k) * v for k, v in sepet.items())
    toplam_tutar = round(toplam_tutar, 2)

    # ─── Sipariş içeriği metni ───
    icerik_metni = ", ".join(
        f"{v} {urun_adi(k)}" for k, v in sorted(sepet.items())
    )

    # ─── One-Hot (market basket) satırı ───
    one_hot = {urun_adi(i): 0 for i in MENU}
    for k in sepet:
        one_hot[urun_adi(k)] = 1

    return {
        "siparis_id": f"ORD-{siparis_id:05d}",
        "qr_masa_id": f"QR-M{masa_id:02d}",
        "tarih_saat": tarih.strftime("%Y-%m-%d %H:%M"),
        "gun":        tarih.strftime("%A"),
        "saat":       saat,
        "ay":         tarih.month,
        "hafta_sonu": int(hs),
        "ozel_gun":   ozel_gun if ozel_gun else "",
        "yas_grubu":  yas_grubu,
        "kisi_sayisi": kisi_sayisi,
        "hava_durumu": hava,
        "sicaklik_c":  sicaklik,
        "siparis_icerigi": icerik_metni,
        "toplam_tutar":    toplam_tutar,
        "ikram_var":  int(len(ikramlar) > 0),
        "iptal_var":  int(iptal_sayisi > 0),
        "urun_sayisi": toplam_urun,
        "one_hot":    one_hot,
        "sepet_ids":  list(sepet.keys()),
    }

# ─────────────────────────────────────────────
# 7. ANA ÜRETICI
# ─────────────────────────────────────────────
def uret(n: int = 2000, masa_sayisi: int = 20) -> list:
    """n adet sipariş üret."""
    siparisler = []
    baslangic = datetime(2026, 1, 1, 8, 0)
    bitis     = datetime(2026, 3, 31, 22, 0)
    toplam_dk = int((bitis - baslangic).total_seconds() / 60)

    # Saatlik ağırlığa göre zaman noktaları seç
    saatler = list(SAAT_DAGITIM.keys())
    saat_agirlik = list(SAAT_DAGITIM.values())

    for i in range(1, n + 1):
        gun_offset = random.randint(0, (bitis - baslangic).days)
        tarih = baslangic + timedelta(days=gun_offset)

        # Hafta sonu daha yoğun
        if hafta_sonu_mu(tarih) and random.random() < 0.3:
            gun_offset = min(gun_offset, (bitis - baslangic).days)

        saat = random.choices(saatler, weights=saat_agirlik)[0]
        dakika = random.randint(0, 59)
        tarih = tarih.replace(hour=saat, minute=dakika)

        masa_id = random.randint(1, masa_sayisi)
        siparisler.append(siparis_uret(i, tarih, masa_id))

    # Tarihe göre sırala
    siparisler.sort(key=lambda x: x["tarih_saat"])
    return siparisler

# ─────────────────────────────────────────────
# 8. KAYDET
# ─────────────────────────────────────────────
def kaydet(siparisler: list, cikti_klasor: str = "."):
    import os
    os.makedirs(cikti_klasor, exist_ok=True)

    # ── 8a. orders_full.json (tüm detay) ──
    json_path = f"{cikti_klasor}/orders_full.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(siparisler, f, ensure_ascii=False, indent=2)
    print(f"✓ {json_path}  ({len(siparisler)} kayıt)")

    # ── 8b. orders_summary.csv (özellik tablosu) ──
    csv_fields = [
        "siparis_id","qr_masa_id","tarih_saat","gun","saat","ay",
        "hafta_sonu","ozel_gun","yas_grubu","kisi_sayisi",
        "hava_durumu","sicaklik_c","toplam_tutar",
        "ikram_var","iptal_var","urun_sayisi","siparis_icerigi"
    ]
    csv_path = f"{cikti_klasor}/orders_summary.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        for s in siparisler:
            writer.writerow({k: s[k] for k in csv_fields})
    print(f"✓ {csv_path}")

    # ── 8c. market_basket.csv (one-hot, Apriori için) ──
    urun_adlari = [MENU[i][0] for i in sorted(MENU.keys())]
    basket_path = f"{cikti_klasor}/market_basket.csv"
    with open(basket_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["siparis_id"] + urun_adlari)
        for s in siparisler:
            satir = [s["siparis_id"]] + [s["one_hot"].get(u, 0) for u in urun_adlari]
            writer.writerow(satir)
    print(f"✓ {basket_path}")

    # ── 8d. apriori_transactions.csv (mlxtend formatı – liste olarak) ──
    apr_path = f"{cikti_klasor}/apriori_transactions.csv"
    with open(apr_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for s in siparisler:
            urunler = [urun_adi(i) for i in s["sepet_ids"]]
            writer.writerow(urunler)
    print(f"✓ {apr_path}  (mlxtend TransactionEncoder formatı)")

    # ── 8e. İstatistik özeti ──
    print("\n── İstatistikler ──────────────────────────")
    print(f"Toplam sipariş  : {len(siparisler)}")
    tutar_topla = sum(s["toplam_tutar"] for s in siparisler)
    print(f"Toplam ciro     : {tutar_topla:,.0f} TL")
    print(f"Ortalama sepet  : {tutar_topla/len(siparisler):,.1f} TL")

    # Ürün frekansı
    freq: dict = defaultdict(int)
    for s in siparisler:
        for iid in s["sepet_ids"]:
            freq[iid] += 1
    top5 = sorted(freq.items(), key=lambda x: -x[1])[:5]
    print("\nEn çok satılan 5 ürün:")
    for iid, cnt in top5:
        print(f"  {urun_adi(iid):30s} {cnt:5d} adet")

    yas_freq: dict = defaultdict(int)
    for s in siparisler:
        yas_freq[s["yas_grubu"]] += 1
    print("\nYaş grubu dağılımı:")
    for yg, cnt in sorted(yas_freq.items()):
        print(f"  {yg:8s}: {cnt:4d} ({100*cnt/len(siparisler):.1f}%)")

    hava_freq: dict = defaultdict(int)
    for s in siparisler:
        hava_freq[s["hava_durumu"]] += 1
    print("\nHava durumu dağılımı:")
    for hd, cnt in sorted(hava_freq.items()):
        print(f"  {hd:15s}: {cnt:4d}")

if __name__ == "__main__":
    print("CafeML – Türk Restoranı Dataset Üretici")
    print("=" * 45)
    veri = uret(n=2000, masa_sayisi=20)
    kaydet(veri, cikti_klasor=".")
    print("\n✅ Dataset hazır! Sonraki adım: apriori_train.py çalıştırın.")
