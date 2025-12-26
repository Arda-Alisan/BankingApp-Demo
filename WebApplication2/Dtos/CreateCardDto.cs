namespace WebApplication2.Dtos
{
    public class CreateCardDto
    {
        public string CardType { get; set; } // "Debit" veya "Credit"
        public string LinkedAccountNumber { get; set; } // Debit için
        public decimal RequestedLimit { get; set; } // Credit için (YENİ)
    }
}