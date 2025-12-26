namespace WebApplication2.Dtos
{
    public class AdminTransactionDto
    {
        public string AccountNumber { get; set; } // Hangi hesaba?
        public decimal Amount { get; set; }       // Ne kadar?
        public string TransactionType { get; set; } // "Deposit" (Yatır) veya "Withdraw" (Çek)
    }
}