using System;
using System.ComponentModel.DataAnnotations;

namespace WebApplication2.Models
{
    public class LoanApplication
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }

        public decimal Amount { get; set; }      // Çekilen Ana Para
        public int TermMonths { get; set; }      // Vade
        public decimal InterestRate { get; set; } 
        public decimal MonthlyPayment { get; set; } // Aylık Taksit Tutarı

        // --- YENİ EKLENENLER ---
        public decimal TotalRepayment { get; set; } // Toplam Geri Ödenecek Tutar (Faizli)
        public decimal RemainingAmount { get; set; } // Kalan Borç

        public string Status { get; set; } = "Pending"; 
        public DateTime ApplicationDate { get; set; } = DateTime.UtcNow;
    }
}