using System.Xml.Linq;
using Microsoft.Extensions.Caching.Memory;
using System.Globalization;
using WebApplication2.Models;
using System.Text.Json; // JSON İşlemleri için gerekli

namespace WebApplication2.Services
{
    public class CurrencyService
    {
        private readonly IMemoryCache _memoryCache;
        private readonly HttpClient _httpClient;
        
        private const string TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";
        // Canlı Altın Ons Fiyatı (Ücretsiz API)
        private const string GOLD_API_URL = "https://data-asg.goldprice.org/dbXRates/USD";

        public CurrencyService(IMemoryCache memoryCache, HttpClient httpClient)
        {
            _memoryCache = memoryCache;
            _httpClient = httpClient;
        }

        // 1. Transferler İçin Basit Çekim
        public async Task<decimal> GetExchangeRateAsync(string currencyCode)
        {
            var rates = await GetAllRatesAsync();
            if (rates.TryGetValue(currencyCode, out var rateData))
            {
                return rateData.Selling; 
            }
            return 1.0m;
        }

        // 2. Piyasa Ekranı İçin Detaylı Liste
        public async Task<Dictionary<string, CurrencyRate>> GetAllRatesAsync()
        {
            // Altın fiyatı çok sık değiştiği için Cache süresini 1 dakikaya düşürdük
            if (!_memoryCache.TryGetValue("DetailedRates", out Dictionary<string, CurrencyRate> rates))
            {
                rates = await FetchRatesFromSources();
                
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(1)); 

                _memoryCache.Set("DetailedRates", rates, cacheOptions);
            }
            return rates;
        }

        private async Task<Dictionary<string, CurrencyRate>> FetchRatesFromSources()
        {
            var rates = new Dictionary<string, CurrencyRate>();

            try
            {
                _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

                // --- ADIM 1: TCMB'den Dolar, Euro vb. Çek ---
                var xmlString = await _httpClient.GetStringAsync(TCMB_URL);
                var xDoc = XDocument.Parse(xmlString);

                foreach (var currency in xDoc.Descendants("Currency"))
                {
                    var code = currency.Attribute("CurrencyCode")?.Value;
                    var name = currency.Element("Isim")?.Value;
                    var buyingStr = currency.Element("ForexBuying")?.Value;
                    var sellingStr = currency.Element("ForexSelling")?.Value;

                    if (!string.IsNullOrEmpty(code) && !string.IsNullOrEmpty(buyingStr) && !string.IsNullOrEmpty(sellingStr))
                    {
                        if (decimal.TryParse(buyingStr, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal buying) &&
                            decimal.TryParse(sellingStr, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal selling))
                        {
                            rates[code] = new CurrencyRate 
                            { 
                                Code = code, Name = name, Buying = buying, Selling = selling 
                            };
                        }
                    }
                }

                // --- ADIM 2: Canlı Ons Altın Fiyatını Çek ---
                decimal liveOuncePrice = 2650.00m; // API Çökerse kullanılacak GERÇEKÇİ yedek (4300 değil!)
                
                try
                {
                    // API'den JSON verisi çekiyoruz
                    var goldJson = await _httpClient.GetStringAsync(GOLD_API_URL);
                    using JsonDocument doc = JsonDocument.Parse(goldJson);
                    
                    // JSON Örneği: {"items":[{"xauPrice":2650.45,...}]}
                    if (doc.RootElement.TryGetProperty("items", out JsonElement items) && items.GetArrayLength() > 0)
                    {
                        liveOuncePrice = items[0].GetProperty("xauPrice").GetDecimal();
                    }
                }
                catch
                {
                    Console.WriteLine("⚠️ Canlı Altın verisi alınamadı, 2650$ baz alınıyor.");
                }

                // --- ADIM 3: Gram Altın Hesapla (TL) ---
                if (rates.ContainsKey("USD"))
                {
                    var usd = rates["USD"];
                    
                    // Formül: (Dolar Satış * Canlı Ons) / 31.1035
                    // Örnek: (34.85 * 2650) / 31.1035 = ~2969 TL
                    decimal goldGramPrice = (usd.Selling * liveOuncePrice) / 31.1035m; 
                    
                    rates["ALTIN"] = new CurrencyRate 
                    { 
                        Code = "ALTIN", 
                        Name = "Gram Altın (24 Ayar)", 
                        Buying = goldGramPrice * 0.98m,  // Alış (%2 makas)
                        Selling = goldGramPrice          // Satış
                    };
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("⚠️ Kur Hatası: " + ex.Message);
                // Çok acil durum yedekleri
                rates["USD"] = new CurrencyRate { Code="USD", Name="ABD Doları", Buying=34.80m, Selling=34.95m };
                rates["EUR"] = new CurrencyRate { Code="EUR", Name="Euro", Buying=37.10m, Selling=37.30m };
                rates["ALTIN"] = new CurrencyRate { Code="ALTIN", Name="Altın", Buying=2900m, Selling=2970m };
            }

            return rates;
        }
    }
}