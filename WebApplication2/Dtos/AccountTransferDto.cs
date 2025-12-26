// WebApplication2/Dtos/AccountTransferDto.cs
using System.ComponentModel.DataAnnotations;

namespace WebApplication2.Dtos 
{
    // Hesaplar arası döviz al/sat transferi için kullanılan DTO
    public class AccountTransferDto
    {
        [Required]
        public string FromAccountNumber { get; set; }
        [Required]
        public string ToAccountNumber { get; set; }
        public decimal Amount { get; set; } // Gönderilecek miktar (Gönderen para biriminde)
    }
}