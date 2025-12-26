using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication2.Models
{
    public class ScheduledTransfer
    {
        [Key]
        public int Id { get; set; }
        
        public int FromAccountId { get; set; }
        
        public int ToAccountId { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        
        // Açıklama boş olabilir
        public string? Description { get; set; }
        
        // Tekrar sıklığı: "Monthly", "Weekly", "Daily", "Yearly"
        [Required]
        public string Frequency { get; set; }
        
        // Ayın hangi günü (1-31) - Monthly için
        public int? DayOfMonth { get; set; }
        
        // Haftanın hangi günü (0-6, 0=Pazar) - Weekly için
        public int? DayOfWeek { get; set; }
        
        // Bir sonraki transfer tarihi
        public DateTime NextExecutionDate { get; set; }
        
        // Son transfer tarihi (opsiyonel)
        public DateTime? EndDate { get; set; }
        
        // Varsayılan olarak aktif başlasın
        public bool IsActive { get; set; } = true;
        
        // Oluşturulma tarihi (Otomatik şu anki zaman)
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Son güncelleme tarihi (Otomatik şu anki zaman)
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        [ForeignKey("FromAccountId")]
        public virtual BankAccount? FromAccount { get; set; }
        
        [ForeignKey("ToAccountId")]
        public virtual BankAccount? ToAccount { get; set; }
    }
}