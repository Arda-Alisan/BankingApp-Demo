using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace WebApplication2.Models
{
    public class User
    {
        public int Id { get; set; }
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string PasswordHash { get; set; } = string.Empty;
        [Required]
        public string Role { get; set; } = "Customer";
        
        // Profil alanları - Veritabanında boş (NULL) olabilir
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }

        // İlişki Alanları
        public ICollection<BankAccount> BankAccounts { get; set; } = new List<BankAccount>(); 
    }
}