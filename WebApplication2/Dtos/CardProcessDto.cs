namespace WebApplication2.Dtos
{
    public class CardProcessDto
    {
        public int CardId { get; set; }
        public string Decision { get; set; } // "Approved" or "Rejected"
        public decimal ApprovedLimit { get; set; } // Adminin belirlediği limit
    }
}