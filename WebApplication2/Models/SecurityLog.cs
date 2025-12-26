using System;

namespace WebApplication2.Models
{
    public class SecurityLog
    {
        public int Id { get; set; }
        public int? UserId { get; set; } // İşlemi yapan kullanıcı (varsa)
        public string Action { get; set; } = string.Empty; // Örn: "Transfer", "Login"
        public string Details { get; set; } = string.Empty; // Örn: "100 TL gönderildi"
        public DateTime Timestamp { get; set; } = DateTime.UtcNow; // İşlem saati
        
        // İlişki (Hangi kullanıcı yaptı?)
        public User? User { get; set; }
    }
}