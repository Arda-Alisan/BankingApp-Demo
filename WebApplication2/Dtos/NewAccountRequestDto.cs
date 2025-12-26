using System.ComponentModel.DataAnnotations;

namespace WebApplication2.Dtos // veya WebApplication2.Models, projenizin yapısına göre değişir
{
    public class NewAccountRequestDto
    {
        [Required]
        public string Currency { get; set; } // Örn: "USD", "EUR", "ALTIN", "TL"
    }
}