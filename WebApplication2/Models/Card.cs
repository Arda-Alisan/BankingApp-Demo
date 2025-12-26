using System.ComponentModel.DataAnnotations;

namespace WebApplication2.Models
{
    public class Card
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }

        public string CardNumber { get; set; } 
        public string CardHolderName { get; set; }
        public string ExpiryDate { get; set; } 
        public string CVV { get; set; }

        public string CardType { get; set; } // "Debit" veya "Credit"
        
        // --- DEBIT KART İÇİN ---
        public int? LinkedAccountId { get; set; } 
        public BankAccount LinkedAccount { get; set; }

        // --- KREDİ KARTI İÇİN (YENİLENEN KISIM) ---
        public decimal CreditLimit { get; set; } = 0; // Admin'in belirlediği limit
        public decimal CurrentDebt { get; set; } = 0;
        
        public decimal RequestedLimit { get; set; } = 0; // Müşterinin istediği limit
        public string Status { get; set; } = "Active"; // "Active", "Pending", "Rejected"
    }
}