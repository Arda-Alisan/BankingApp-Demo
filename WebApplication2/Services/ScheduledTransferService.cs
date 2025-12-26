using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Services
{
    public class ScheduledTransferService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ScheduledTransferService> _logger;

        public ScheduledTransferService(IServiceProvider serviceProvider, ILogger<ScheduledTransferService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Scheduled Transfer Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessScheduledTransfers();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while processing scheduled transfers.");
                }

                // Her 1 dakikada bir kontrol et (production'da 1 saatte bir olabilir)
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task ProcessScheduledTransfers()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<BankingDbContext>();

            var now = DateTime.UtcNow;
            
            // Bugün yapılması gereken aktif transferleri getir
            var nowDate = DateTime.SpecifyKind(now.Date, DateTimeKind.Utc);
            var dueTransfers = await context.ScheduledTransfers
                .Include(st => st.FromAccount)
                .Include(st => st.ToAccount)
                .ThenInclude(ta => ta.User)
                .Where(st => st.IsActive && 
                           st.NextExecutionDate <= nowDate &&
                           (st.EndDate == null || st.EndDate.Value <= nowDate))
                .ToListAsync();

            _logger.LogInformation($"Found {dueTransfers.Count} scheduled transfers to process.");

            foreach (var transfer in dueTransfers)
            {
                try
                {
                    await ProcessSingleTransfer(context, transfer);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error processing scheduled transfer {transfer.Id}");
                }
            }

            if (dueTransfers.Any())
            {
                await context.SaveChangesAsync();
            }
        }

        private async Task ProcessSingleTransfer(BankingDbContext context, ScheduledTransfer scheduledTransfer)
        {
            // Gönderen hesabın bakiyesini kontrol et
            if (scheduledTransfer.FromAccount.Balance < scheduledTransfer.Amount)
            {
                _logger.LogWarning($"Insufficient balance for scheduled transfer {scheduledTransfer.Id}. " +
                                 $"Required: {scheduledTransfer.Amount}, Available: {scheduledTransfer.FromAccount.Balance}");
                
                // Yetersiz bakiye logu
                var log = new SecurityLog
                {
                    UserId = scheduledTransfer.FromAccount.UserId,
                    Action = "Düzenli Transfer - Yetersiz Bakiye",
                    Details = $"Transfer ID: {scheduledTransfer.Id}, Tutar: {scheduledTransfer.Amount}, " +
                             $"Bakiye: {scheduledTransfer.FromAccount.Balance}",
                    Timestamp = DateTime.UtcNow
                };
                context.SecurityLogs.Add(log);
                
                // Bir sonraki transfer tarihini hesapla
                var nextDate = CalculateNextExecutionDate(scheduledTransfer);
                if (nextDate.HasValue)
                {
                    scheduledTransfer.NextExecutionDate = DateTime.SpecifyKind(nextDate.Value, DateTimeKind.Utc);
                    scheduledTransfer.UpdatedAt = DateTime.UtcNow;
                }
                
                return;
            }

            // Transferi gerçekleştir
            using var transaction = await context.Database.BeginTransactionAsync();

            try
            {
                // Bakiyeleri güncelle
                scheduledTransfer.FromAccount.Balance -= scheduledTransfer.Amount;
                scheduledTransfer.ToAccount.Balance += scheduledTransfer.Amount;

                // Transaction history kaydet
                var transactionHistory = new TransactionHistory
                {
                    FromAccountId = scheduledTransfer.FromAccountId,
                    ToAccountId = scheduledTransfer.ToAccountId,
                    Amount = scheduledTransfer.Amount,
                    TransactionType = "Düzenli Transfer",
                    TransactionDate = DateTime.UtcNow,
                    Details = $"Otomatik düzenli transfer - {scheduledTransfer.Description}"
                };
                context.TransactionHistories.Add(transactionHistory);

                // Security log
                var securityLog = new SecurityLog
                {
                    UserId = scheduledTransfer.FromAccount.UserId,
                    Action = "Düzenli Transfer Gerçekleştirildi",
                    Details = $"Gönderen: {scheduledTransfer.FromAccount.AccountNumber}, " +
                             $"Alıcı: {scheduledTransfer.ToAccount.AccountNumber}, " +
                             $"Tutar: {scheduledTransfer.Amount} TL",
                    Timestamp = DateTime.UtcNow
                };
                context.SecurityLogs.Add(securityLog);

                // Sonraki transfer tarihini hesapla
                var nextExecutionDate = CalculateNextExecutionDate(scheduledTransfer);
                if (nextExecutionDate.HasValue && 
                    (scheduledTransfer.EndDate == null || nextExecutionDate.Value <= scheduledTransfer.EndDate.Value))
                {
                    scheduledTransfer.NextExecutionDate = DateTime.SpecifyKind(nextExecutionDate.Value, DateTimeKind.Utc);
                    scheduledTransfer.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Transfer süresi dolmuş, pasif yap
                    scheduledTransfer.IsActive = false;
                    scheduledTransfer.UpdatedAt = DateTime.UtcNow;
                    
                    _logger.LogInformation($"Scheduled transfer {scheduledTransfer.Id} has been deactivated (end date reached).");
                }

                await transaction.CommitAsync();
                
                _logger.LogInformation($"Successfully processed scheduled transfer {scheduledTransfer.Id}. " +
                                     $"Amount: {scheduledTransfer.Amount}, " +
                                     $"From: {scheduledTransfer.FromAccount.AccountNumber}, " +
                                     $"To: {scheduledTransfer.ToAccount.AccountNumber}");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, $"Failed to process scheduled transfer {scheduledTransfer.Id}");
                throw;
            }
        }

        private DateTime? CalculateNextExecutionDate(ScheduledTransfer scheduledTransfer)
        {
            var current = scheduledTransfer.NextExecutionDate;
            
            switch (scheduledTransfer.Frequency?.ToLower())
            {
                case "daily":
                    return current.AddDays(1);

                case "weekly":
                    return current.AddDays(7);

                case "monthly":
                    // Bir sonraki ay, aynı gün
                    var nextMonth = current.AddMonths(1);
                    if (scheduledTransfer.DayOfMonth.HasValue)
                    {
                        try
                        {
                            var daysInNextMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
                            var targetDay = Math.Min(scheduledTransfer.DayOfMonth.Value, daysInNextMonth);
                            return new DateTime(nextMonth.Year, nextMonth.Month, targetDay);
                        }
                        catch
                        {
                            return nextMonth;
                        }
                    }
                    return nextMonth;

                case "yearly":
                    return current.AddYears(1);

                default:
                    return null;
            }
        }
    }
}