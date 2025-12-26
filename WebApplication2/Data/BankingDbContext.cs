using Microsoft.EntityFrameworkCore;
using WebApplication2.Models;

namespace WebApplication2.Data
{
    public class BankingDbContext : DbContext
    {
        public BankingDbContext(DbContextOptions<BankingDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<BankAccount> BankAccounts { get; set; }
        public DbSet<TransactionHistory> TransactionHistories { get; set; }
        public DbSet<SecurityLog> SecurityLogs { get; set; }
        public DbSet<LoanApplication> LoanApplications { get; set; }
        public DbSet<Card> Cards { get; set; }
        
        // YENİ EKLENEN TABLO
        public DbSet<ScheduledTransfer> ScheduledTransfers { get; set; }
        

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // --- 1. USER - BANKACCOUNT İLİŞKİSİ (Bire-Çok) ---
            modelBuilder.Entity<BankAccount>()
                .HasOne(b => b.User) 
                .WithMany(u => u.BankAccounts) 
                .HasForeignKey(b => b.UserId)
                .IsRequired(); 

            // --- 2. TRANSACTION - GÖNDEREN HESAP ---
            modelBuilder.Entity<TransactionHistory>()
                .HasOne(t => t.FromAccount)
                .WithMany()
                .HasForeignKey(t => t.FromAccountId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            // --- 3. TRANSACTION - ALICI HESAP ---
            modelBuilder.Entity<TransactionHistory>()
                .HasOne(t => t.ToAccount)
                .WithMany()
                .HasForeignKey(t => t.ToAccountId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            // --- 4. SCHEDULED TRANSFER - GÖNDEREN HESAP ---
            modelBuilder.Entity<ScheduledTransfer>()
                .HasOne(st => st.FromAccount)
                .WithMany()
                .HasForeignKey(st => st.FromAccountId)
                .OnDelete(DeleteBehavior.Restrict) // Hesap silinirse transfer hata versin (Güvenlik)
                .IsRequired();

            // --- 5. SCHEDULED TRANSFER - ALICI HESAP ---
            modelBuilder.Entity<ScheduledTransfer>()
                .HasOne(st => st.ToAccount)
                .WithMany()
                .HasForeignKey(st => st.ToAccountId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            // --- 6. DECIMAL HASSASİYET AYARLARI (ÖNERİLEN) ---
            // Bu ayar, veritabanında tutar alanlarının virgülden sonra kaç hane tutacağını belirler.
            // EF Core bazen bu ayar yoksa uyarı verebilir.
            modelBuilder.Entity<ScheduledTransfer>()
                .Property(p => p.Amount)
                .HasColumnType("decimal(18,2)"); // Toplam 18 basamak, virgülden sonra 2 hane.

            modelBuilder.Entity<TransactionHistory>()
                .Property(p => p.Amount)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<BankAccount>()
                .Property(p => p.Balance)
                .HasColumnType("decimal(18,2)");

            base.OnModelCreating(modelBuilder);
        }
    }
}