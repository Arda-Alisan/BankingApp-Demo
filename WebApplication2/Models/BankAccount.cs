using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication2.Models 
{
    public class BankAccount
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string AccountNumber { get; set; } 

        [Required]
        public string OwnerName { get; set; } 

        public decimal Balance { get; set; } 
        
        public string Currency { get; set; } = "TL"; 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // İlişkiler
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User? User { get; set; }

        public List<TransactionHistory> Transactions { get; set; } = new();
    }
}