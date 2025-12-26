using System;

namespace WebApplication2.Dtos
{
    public class CreateScheduledTransferDto
    {
        public string FromAccountNumber { get; set; }
        public string ToAccountNumber { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; }
        public string Frequency { get; set; } 
        public int? DayOfMonth { get; set; } 
        public int? DayOfWeek { get; set; } 
        public DateTime? EndDate { get; set; } 
    }

    public class UpdateScheduledTransferDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; }
        public string Frequency { get; set; }
        public int? DayOfMonth { get; set; }
        public int? DayOfWeek { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class ScheduledTransferViewDto
    {
        public int Id { get; set; }
        public string FromAccountNumber { get; set; }
        public string FromAccountOwner { get; set; }
        public string ToAccountNumber { get; set; }
        public string ToAccountOwner { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; }
        public string Frequency { get; set; }
        public string FrequencyDisplay { get; set; } 
        public int? DayOfMonth { get; set; }
        public int? DayOfWeek { get; set; }
        public DateTime NextExecutionDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}