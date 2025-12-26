using System;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization; 

namespace WebApplication2.Models
{
    public class TransactionHistory
    {
        public int Id { get; set; }
        
        // 🚨 DÜZELTME: Burası 'int' idi, 'int?' (Boş geçilebilir) yaptık.
        // Çünkü Admin para yatırdığında gönderen hesap yoktur (NULL).
        public int? FromAccountId { get; set; }

        public int? ToAccountId { get; set; }
        
        // Gönderilen Tutar (Örn: 23 USD)
        public decimal Amount { get; set; }

        //  Karşı hesabın aldığı net tutar
        // Kur farkı hesaplaması için bu alana ihtiyacımız var (Örn: 805 TL)
        public decimal? ReceivedAmount { get; set; } 

        public string TransactionType { get; set; } = "Transfer";
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

        public string? Details { get; set; } 

        [JsonIgnore] 
        [ForeignKey("FromAccountId")]
        public virtual BankAccount? FromAccount { get; set; }

        [JsonIgnore]
        [ForeignKey("ToAccountId")]
        public virtual BankAccount? ToAccount { get; set; }
    }
}