namespace WebApplication2.Dtos
{
    public class TransferDto 
    { 
        // 🚨 YENİ EKLENDİ: Paranın çekileceği hesap numarası
        public string FromAccountNumber { get; set; } 

        public string ToAccountNumber { get; set; } 
        public decimal Amount { get; set; } 
    }
}