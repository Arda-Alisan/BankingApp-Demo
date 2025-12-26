namespace WebApplication2.Models
{
    public class CurrencyRate
    {
        public string Code { get; set; }
        public decimal Buying { get; set; }  // Alış
        public decimal Selling { get; set; } // Satış
        public string Name { get; set; }     // Para Birimi Adı (ABD Doları vb.)
    }
}