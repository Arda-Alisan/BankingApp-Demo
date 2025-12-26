namespace WebApplication2.Dtos
{
    public class LoanProcessDto
    {
        public int LoanId { get; set; }
        public string Decision { get; set; } // "Approved" veya "Rejected"
    }
}