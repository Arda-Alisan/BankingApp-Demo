using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;
using WebApplication2.Dtos; 
using WebApplication2.Services; 
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Security.Cryptography; 
using System.Globalization;

namespace WebApplication2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BankingController : ControllerBase
    {
        private readonly BankingDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly CurrencyService _currencyService; 

        public BankingController(BankingDbContext context, IConfiguration configuration, CurrencyService currencyService)
        {
            _context = context;
            _configuration = configuration;
            _currencyService = currencyService;
        }

        // --- 0. YARDIMCI METOTLAR ---
        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(bytes);
            }
        }

        private bool VerifyPassword(string enteredPassword, string storedHash)
        {
            return HashPassword(enteredPassword) == storedHash;
        }

        private string GenerateUniqueAccountNumber()
        {
            const string Prefix = "TR";
            const int Length = 10;
            var random = new Random();
            string newNumber;
            do
            {
                var randomNumber = random.Next((int)Math.Pow(10, Length - 1), (int)Math.Pow(10, Length) - 1);
                newNumber = $"{Prefix}{randomNumber}";
            } while (_context.BankAccounts.Any(a => a.AccountNumber == newNumber));
            return newNumber;
        }

        // --- 1. GİRİŞ YAP ---
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto loginRequest)
        {
            var user = _context.Users.FirstOrDefault(u => u.Username == loginRequest.Username);
            if (user == null) return Unauthorized("Kullanıcı adı veya şifre hatalı.");

            bool isPasswordValid;
            if (user.Username == "admin" || user.Username == "arda" || user.Username == "arda2")
                isPasswordValid = user.PasswordHash == loginRequest.Password;
            else
                isPasswordValid = VerifyPassword(loginRequest.Password, user.PasswordHash);

            if (!isPasswordValid) return Unauthorized("Kullanıcı adı veya şifre hatalı.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: new[] {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Role, user.Role)
                },
                expires: DateTime.Now.AddHours(1),
                signingCredentials: creds
            );

            return Ok(new { 
                token = new JwtSecurityTokenHandler().WriteToken(token), 
                role = user.Role, 
                username = user.Username 
            });
        }

        // --- 2. HESAPLARI GETİR ---
        [Authorize]
        [HttpGet("my-account")]
        public IActionResult GetMyAccount()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var allAccounts = _context.BankAccounts.Include(a => a.User).Where(a => a.UserId == userId).ToList(); 
            var user = _context.Users.Find(userId);
            string ownerName = user?.FullName ?? user?.Username ?? "Kullanıcı";

            if (!allAccounts.Any()) 
            {
                return Ok(new { Owner = ownerName, Accounts = new List<object>() });
            }
            
            var accountsList = allAccounts.Select(account =>
            {
                var rawTransactions = _context.TransactionHistories
                    .Include(t => t.FromAccount).ThenInclude(u => u.User) 
                    .Include(t => t.ToAccount).ThenInclude(u => u.User)   
                    .Where(t => t.FromAccountId == account.Id || t.ToAccountId == account.Id)
                    .OrderByDescending(t => t.TransactionDate)
                    .ToList(); 
                
                var accountTransactions = rawTransactions.Select(t =>
                {
                    bool isSelfTransferSameAccount = t.FromAccountId == t.ToAccountId;
                    bool isInternalTransfer = t.FromAccountId != null && t.ToAccountId != null 
                                              && t.FromAccount?.UserId == userId && t.ToAccount?.UserId == userId 
                                              && !isSelfTransferSameAccount;
                    
                    bool isAdminTransaction = t.FromAccountId == null || t.ToAccountId == null;

                    string transactionType = t.TransactionType; 
                    string counterpartyName;
                    string counterpartyAccountNo = "---"; 

                    if (isAdminTransaction) counterpartyName = "Banka / Vezne İşlemi";
                    else if (isInternalTransfer)
                    {
                         string fromCurr = t.FromAccount?.Currency ?? "N/A";
                         string toCurr = t.ToAccount?.Currency ?? "N/A";
                         counterpartyName = $"Döviz İşlemi ({fromCurr} -> {toCurr})";
                         counterpartyAccountNo = t.FromAccountId == account.Id ? t.ToAccount?.AccountNumber ?? "---" : t.FromAccount?.AccountNumber ?? "---";
                    }
                    else if (isSelfTransferSameAccount) counterpartyName = "Kendi Hesabınız (Nötr)";
                    else if (t.ToAccountId == account.Id) 
                    {
                        counterpartyName = t.FromAccount?.User?.FullName ?? t.FromAccount?.OwnerName ?? "Bilinmeyen";
                        counterpartyAccountNo = t.FromAccount?.AccountNumber ?? "---"; 
                    }
                    else 
                    {
                        counterpartyName = t.ToAccount?.User?.FullName ?? t.ToAccount?.OwnerName ?? "Bilinmeyen";
                        counterpartyAccountNo = t.ToAccount?.AccountNumber ?? "---"; 
                    }
                    
                    string formattedDate = t.TransactionDate.AddHours(3).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);

                    decimal displayAmount = t.Amount; 

                    if (t.ToAccountId == account.Id && t.ReceivedAmount.HasValue && t.ReceivedAmount.Value > 0)
                    {
                        displayAmount = t.ReceivedAmount.Value;
                    }

                    return new 
                    {
                        Id = t.Id,
                        Amount = displayAmount, 
                        TransactionDate = formattedDate, 
                        ToAccountId = t.ToAccountId,
                        FromAccountId = t.FromAccountId,
                        CounterpartyName = counterpartyName,
                        CounterpartyAccountNo = counterpartyAccountNo, 
                        TransactionType = transactionType,
                        Details = t.Details ?? ""
                    };
                }).ToList(); 

                return new
                {
                    Id = account.Id,
                    AccountNumber = account.AccountNumber,
                    Balance = account.Balance,
                    Currency = account.Currency,
                    OwnerName = account.OwnerName,
                    Transactions = accountTransactions
                };
            }).ToList();

            return Ok(new { Owner = ownerName, Accounts = accountsList });
        }

        // --- 3. PARA TRANSFERİ ---
        [Authorize]
        [HttpPost("transfer")]
        public IActionResult Transfer([FromBody] TransferDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            using var transaction = _context.Database.BeginTransaction();
            try
            {
                var fromAccount = _context.BankAccounts.FirstOrDefault(a => a.AccountNumber == request.FromAccountNumber && a.UserId == userId);
                if (fromAccount == null) return BadRequest("Gönderen hesap bulunamadı.");

                var toAccount = _context.BankAccounts.Include(a => a.User).FirstOrDefault(a => a.AccountNumber == request.ToAccountNumber);
                if (toAccount == null) return BadRequest("Alıcı hesap bulunamadı.");

                if (fromAccount.Currency != toAccount.Currency && toAccount.UserId != userId)
                    return BadRequest("Harici transferler sadece aynı para biriminde yapılabilir.");

                if (fromAccount.Balance < request.Amount) return BadRequest("Yetersiz bakiye.");

                bool isSelfTransferSameAccount = fromAccount.Id == toAccount.Id;
                string transactionType = isSelfTransferSameAccount ? "Hesap İçi İşlem" : "Transfer";

                if (!isSelfTransferSameAccount)
                {
                    fromAccount.Balance -= request.Amount;
                    toAccount.Balance += request.Amount;
                } 

                var history = new TransactionHistory
                {
                    FromAccountId = fromAccount.Id,
                    ToAccountId = toAccount.Id,
                    Amount = request.Amount,
                    ReceivedAmount = request.Amount, 
                    TransactionType = transactionType,
                    TransactionDate = DateTime.UtcNow,
                    Details = isSelfTransferSameAccount ? "Nötr işlem." : null
                };
                _context.TransactionHistories.Add(history);
                _context.SecurityLogs.Add(new SecurityLog { UserId = userId, Action = transactionType, Details = "Transfer", Timestamp = DateTime.UtcNow });
                
                _context.SaveChanges();
                transaction.Commit();

                return Ok(new { Message = "Transfer Başarılı", NewBalance = fromAccount.Balance });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                return StatusCode(500, "Hata: " + ex.Message);
            }
        }

        // --- 4. TEST VERİSİ ---
        [HttpPost("create-test-data")]
        public IActionResult CreateTestData()
        {
            if (!_context.Users.Any(u => u.Username == "admin")) {
                 _context.Users.Add(new User { Username = "admin", PasswordHash = "123", Role = "Admin", FullName = "Admin", Email="admin@bank.com" });
            }
            if (!_context.Users.Any(u => u.Username == "arda")) {
                var u = new User { Username = "arda", PasswordHash = "123", Role = "Customer", FullName = "Arda Alişan", Email = "arda@test.com", PhoneNumber = "5551234567" };
                _context.Users.Add(u);
                _context.SaveChanges();
                _context.BankAccounts.Add(new BankAccount { AccountNumber="TR01", OwnerName="Arda Alişan", Balance=50000, UserId=u.Id, Currency="TL" });
            }
             _context.SaveChanges();
            return Ok("Test verileri oluşturuldu.");
        }

        // --- 4. PROFİL BİLGİLERİNİ GETİR ---
        [Authorize]
        [HttpGet("profile")]
        public IActionResult GetProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = _context.Users.Find(userId);

            if (user == null) return NotFound("Kullanıcı bulunamadı.");

            return Ok(new 
            {
                FullName = user.FullName,
                Username = user.Username,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                Address = user.Address,
                Role = user.Role
            });
        }
        
        // --- 5. PROFİL GÜNCELLEME ---
        [Authorize]
        [HttpPut("update-profile")]
        public IActionResult UpdateProfile([FromBody] UpdateProfileDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");

            user.FullName = request.FullName;
            user.Email = request.Email;
            user.PhoneNumber = request.PhoneNumber;
            user.Address = request.Address;

            _context.SaveChanges();
            return Ok(new { Message = "Profil başarıyla güncellendi." });
        }
        
        // --- 6. HESAP DÖKÜMÜ PDF İNDİR ---
        [Authorize]
        [HttpGet("export-statement")]
        public IActionResult ExportStatement([FromQuery] string accountNumber, [FromQuery] string filterPeriod = "all", [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null) 
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var account = _context.BankAccounts.Include(a => a.User).FirstOrDefault(a => a.UserId == userId && a.AccountNumber == accountNumber);

            if (account == null) return NotFound("Seçilen hesap bulunamadı.");

            DateTime? filterStartDate = null;
            DateTime? filterEndDate = DateTime.UtcNow;

            switch (filterPeriod?.ToLower())
            {
                case "1month": filterStartDate = DateTime.UtcNow.AddMonths(-1); break;
                case "3months": filterStartDate = DateTime.UtcNow.AddMonths(-3); break;
                case "6months": filterStartDate = DateTime.UtcNow.AddMonths(-6); break;
                case "1year": filterStartDate = DateTime.UtcNow.AddYears(-1); break;
                case "custom":
                    if (startDate.HasValue && endDate.HasValue) {
                        filterStartDate = startDate.Value.ToUniversalTime();
                        filterEndDate = endDate.Value.ToUniversalTime().AddDays(1).AddSeconds(-1);
                    }
                    break;
                case "all": default: filterStartDate = null; filterEndDate = null; break;
            }

            var transactionsQuery = _context.TransactionHistories
                                   .Include(t => t.FromAccount).ThenInclude(u => u.User)
                                   .Include(t => t.ToAccount).ThenInclude(u => u.User)
                                   .Where(t => t.FromAccountId == account.Id || t.ToAccountId == account.Id);

            if (filterStartDate.HasValue) transactionsQuery = transactionsQuery.Where(t => t.TransactionDate >= filterStartDate.Value);
            if (filterEndDate.HasValue) transactionsQuery = transactionsQuery.Where(t => t.TransactionDate <= filterEndDate.Value);

            var transactions = transactionsQuery.OrderByDescending(t => t.TransactionDate).ToList();

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(12));
                    page.Header().Text($"Grup 1 Bank - Hesap Özeti ({account.Currency})").SemiBold().FontSize(24).FontColor(Colors.Blue.Medium);
                    page.Content().PaddingVertical(1, Unit.Centimetre).Column(x =>
                    {
                        x.Item().Text($"Sayın {account.User.FullName ?? account.User.Username}");
                        x.Item().Text($"IBAN: {account.AccountNumber}");
                        x.Item().Text($"Para Birimi: {account.Currency}"); 
                        x.Item().Text($"Rapor Tarihi: {DateTime.UtcNow.AddHours(3):dd.MM.yyyy HH:mm}");
                        x.Item().Text($"Toplam İşlem: {transactions.Count} adet");
                        x.Item().PaddingBottom(10);
                        x.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns => { columns.RelativeColumn(3); columns.RelativeColumn(4); columns.RelativeColumn(2); });
                            table.Header(header => {
                                header.Cell().Text("Tarih ve Saat");
                                header.Cell().Text("Açıklama / Hesap Detay"); 
                                header.Cell().AlignRight().Text("Tutar");
                            });
                            
                            foreach (var item in transactions) {
                                var isOutgoing = item.FromAccountId == account.Id;
                                decimal finalAmount = item.Amount;
                                if (!isOutgoing && item.ReceivedAmount.HasValue && item.ReceivedAmount.Value > 0)
                                    finalAmount = item.ReceivedAmount.Value;

                                var amountText = isOutgoing ? $"-{finalAmount:N2}" : $"+{finalAmount:N2}";
                                var directionSymbol = isOutgoing ? "⬇️ Giden İşlem" : "⬆️ Gelen İşlem";
                                
                                string counterpartyName;
                                string counterpartyAccountNo;

                                if (isOutgoing) {
                                    counterpartyName = item.ToAccount?.User?.FullName ?? item.ToAccount?.OwnerName ?? "Bilinmeyen";
                                    counterpartyAccountNo = item.ToAccount?.AccountNumber ?? "---";
                                } else {
                                    counterpartyName = item.FromAccount?.User?.FullName ?? item.FromAccount?.OwnerName ?? "Bilinmeyen";
                                    counterpartyAccountNo = item.FromAccount?.AccountNumber ?? "---";
                                }
                                
                                bool isBankOp = item.TransactionType.Contains("Admin") || item.TransactionType.Contains("Vezne");
                                
                                table.Cell().Text($"{item.TransactionDate.AddHours(3):dd.MM.yyyy HH:mm}"); 
                                table.Cell().Column(col => {
                                    col.Item().Text(directionSymbol + " - " + item.TransactionType).SemiBold().FontSize(10); 
                                    if (!isBankOp) {
                                        col.Item().Text($"Kişi: {counterpartyName}").FontSize(8).FontColor(Colors.Black); 
                                        if (counterpartyAccountNo != "---") col.Item().Text($"Hesap No: {counterpartyAccountNo}").FontSize(8).FontColor(Colors.Grey.Medium); 
                                    }
                                });
                                table.Cell().AlignRight().Text($"{amountText} {account.Currency}");
                            }
                        });
                    });
                    page.Footer().AlignCenter().Text(x => { x.CurrentPageNumber(); x.Span(" / "); x.TotalPages(); });
                });
            });
            return File(document.GeneratePdf(), "application/pdf", $"HesapOzeti_{account.AccountNumber}.pdf");
        }

        // --- 7. KULLANICI EKLEME (ADMIN) ---
        [Authorize(Roles = "Admin")]
        [HttpPost("add-user")]
        public IActionResult AddUser([FromBody] AddUserDto request)
        {
            try
            {
                if (_context.Users.Any(u => u.Username == request.Username)) 
                    return BadRequest(new { Message = "Kullanıcı adı zaten kullanımda." }); 
                
                var newUser = new User { 
                    Username = request.Username, 
                    PasswordHash = HashPassword(request.Password), 
                    FullName = request.FullName, 
                    Email = request.Email, 
                    Role = request.Role 
                };
                
                _context.Users.Add(newUser);
                _context.SaveChanges();

                if (request.Role == "Customer") {
                    string ownerName = newUser.FullName ?? newUser.Username; 
                    _context.BankAccounts.Add(new BankAccount { 
                        UserId = newUser.Id, 
                        AccountNumber = GenerateUniqueAccountNumber(), 
                        OwnerName = ownerName, 
                        Balance = request.InitialBalance, 
                        Currency = "TL" 
                    });
                    _context.SaveChanges();
                }
                
                return Ok(new { Message = "Kullanıcı başarıyla eklendi ve hesap oluşturuldu." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Kullanıcı eklenirken sunucu hatası oluştu: " + ex.Message });
            }
        }

        // --- 8. YENİ HESAP AÇ ---
        [HttpPost("open-new-account")]
        [Authorize(Roles = "Customer")] 
        public async Task<IActionResult> OpenNewAccount([FromBody] NewAccountRequestDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = await _context.Users.FindAsync(currentUserId);
            
            var supportedCurrencies = new List<string> { "TL", "USD", "EUR", "ALTIN" };
            if (!supportedCurrencies.Contains(dto.Currency.ToUpper())) 
                return BadRequest("Geçersiz para birimi.");
            
            int existingCount = await _context.BankAccounts.CountAsync(a => a.UserId == currentUserId && a.Currency == dto.Currency);

            if (existingCount >= 6) return BadRequest($"Maksimum hesap limitine ulaştınız. En fazla 6 adet {dto.Currency} hesabı açabilirsiniz.");

            string currencyCode = dto.Currency.Length >= 2 ? dto.Currency.ToUpper().Substring(0, 2) : dto.Currency.ToUpper();
            var random = new Random();
            string uniqueSuffix = $"{random.Next(1000, 9999)}"; 
            
            string newAccountNumber;
            do {
                 newAccountNumber = $"TR{currencyCode}{currentUserId}{uniqueSuffix}{random.Next(100,999)}";
            } while (_context.BankAccounts.Any(a => a.AccountNumber == newAccountNumber));

            var newAccount = new BankAccount {
                UserId = currentUserId, 
                AccountNumber = newAccountNumber, 
                Balance = 0m, 
                Currency = dto.Currency, 
                OwnerName = user.FullName ?? user.Username, 
                CreatedAt = DateTime.UtcNow
            };

            _context.BankAccounts.Add(newAccount);
            await _context.SaveChangesAsync();
            
            return Ok(new { Message = "Yeni hesap başarıyla açıldı.", AccountNumber = newAccount.AccountNumber });
        }

        // --- 9. HESAPLAR ARASI DÖVİZ AL/SAT ---
        [HttpPost("internal-transfer")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> InternalCurrencyTransfer([FromBody] AccountTransferDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            using var transaction = _context.Database.BeginTransaction();
            try
            {
                var fromAccount = await _context.BankAccounts.FirstOrDefaultAsync(a => a.AccountNumber == dto.FromAccountNumber && a.UserId == currentUserId);
                var toAccount = await _context.BankAccounts.FirstOrDefaultAsync(a => a.AccountNumber == dto.ToAccountNumber && a.UserId == currentUserId);

                if (fromAccount == null || toAccount == null) return BadRequest("Hesaplar bulunamadı.");
                if (fromAccount.Balance < dto.Amount) return BadRequest("Yetersiz bakiye.");
                if (fromAccount.AccountNumber == toAccount.AccountNumber) return BadRequest("Aynı hesaba işlem yapılamaz.");

                decimal receivingAmount = 0m;
                decimal exchangeRateUsed = 1.0m;
                string rateDescription = "";

                var allRates = await _currencyService.GetAllRatesAsync();

                if (fromAccount.Currency == toAccount.Currency) {
                    receivingAmount = dto.Amount;
                    rateDescription = "Birebir";
                } else if (fromAccount.Currency == "TL" && toAccount.Currency != "TL") {
                    if (allRates.TryGetValue(toAccount.Currency, out var rateData)) {
                        exchangeRateUsed = rateData.Selling; 
                        receivingAmount = dto.Amount / exchangeRateUsed;
                        rateDescription = $"Kur (Satış): {exchangeRateUsed:N4}";
                    }
                } else if (fromAccount.Currency != "TL" && toAccount.Currency == "TL") {
                    if (allRates.TryGetValue(fromAccount.Currency, out var rateData)) {
                        exchangeRateUsed = rateData.Buying; 
                        receivingAmount = dto.Amount * exchangeRateUsed;
                        rateDescription = $"Kur (Alış): {exchangeRateUsed:N4}";
                    }
                } else {
                    decimal amountInTL = 0;
                    if (allRates.TryGetValue(fromAccount.Currency, out var fromRate)) amountInTL = dto.Amount * fromRate.Buying;
                    if (allRates.TryGetValue(toAccount.Currency, out var toRate)) {
                        receivingAmount = amountInTL / toRate.Selling;
                        exchangeRateUsed = amountInTL / dto.Amount; 
                        rateDescription = $"Çapraz Kur ({fromAccount.Currency}->TL->{toAccount.Currency})";
                    }
                }

                if (receivingAmount == 0) return BadRequest("Kur bilgisi alınamadı, işlem yapılamıyor.");

                fromAccount.Balance -= dto.Amount;
                toAccount.Balance += receivingAmount;

                var history = new TransactionHistory {
                    FromAccountId = fromAccount.Id,
                    ToAccountId = toAccount.Id,
                    Amount = dto.Amount,
                    ReceivedAmount = receivingAmount,
                    TransactionType = "Döviz Al/Sat",
                    TransactionDate = DateTime.UtcNow,
                    Details = $"{rateDescription} | Sonuç: {receivingAmount:N2} {toAccount.Currency}"
                };
                _context.TransactionHistories.Add(history);
                await _context.SaveChangesAsync();
                transaction.Commit();

                return Ok(new { Message = "İşlem başarılı.", ExchangeRate = exchangeRateUsed, Received = receivingAmount });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                return StatusCode(500, "Hata: " + ex.Message);
            }
        }

        // --- 10. ADMIN PARA YATIRMA / ÇEKME ---
        [HttpPost("admin-transaction")]
        [Authorize(Roles = "Admin")]
        public IActionResult AdminTransaction([FromBody] AdminTransactionDto request)
        {
            using var transaction = _context.Database.BeginTransaction();
            try
            {
                var account = _context.BankAccounts.Include(a => a.User).FirstOrDefault(a => a.AccountNumber == request.AccountNumber);
                if (account == null) return NotFound("Hesap bulunamadı.");

                string transactionType = "";
                if (request.TransactionType == "Deposit") { account.Balance += request.Amount; transactionType = "Para Yatırma (Admin)"; }
                else if (request.TransactionType == "Withdraw") { 
                    if (account.Balance < request.Amount) return BadRequest("Yetersiz bakiye.");
                    account.Balance -= request.Amount; transactionType = "Para Çekme (Admin)"; 
                } else return BadRequest("Geçersiz işlem tipi.");

                var history = new TransactionHistory {
                    FromAccountId = request.TransactionType == "Withdraw" ? account.Id : (int?)null,
                    ToAccountId = request.TransactionType == "Deposit" ? account.Id : (int?)null,
                    Amount = request.Amount, 
                    ReceivedAmount = request.Amount, 
                    TransactionType = transactionType, 
                    TransactionDate = DateTime.UtcNow, 
                    Details = "Vezne/Admin İşlemi"
                };
                _context.TransactionHistories.Add(history);
                _context.SaveChanges();
                transaction.Commit();
                return Ok(new { Message = "İşlem Başarılı", NewBalance = account.Balance });
            }
            catch (Exception ex) { transaction.Rollback(); return StatusCode(500, "Hata: " + ex.Message); }
        }

        // --- 11. ADMIN: TÜM İŞLEMLER ---
        [HttpGet("all-transactions")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetAllTransactions()
        {
            var transactions = _context.TransactionHistories
                .Include(t => t.FromAccount).ThenInclude(u => u.User)
                .Include(t => t.ToAccount).ThenInclude(u => u.User) 
                .OrderByDescending(t => t.TransactionDate).Take(50).ToList();
            return Ok(transactions);
        }

        // --- 12. ADMIN: SİSTEM LOGLARI ---
        [HttpGet("system-logs")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetSystemLogs()
        {
            var logs = _context.SecurityLogs.Include(l => l.User).OrderByDescending(l => l.Timestamp).Take(50).ToList();
            return Ok(logs);
        }

        // --- 13. PİYASA KURLARI ---
        [HttpGet("rates")]
        public async Task<IActionResult> GetMarketRates()
        {
            try {
                var rates = await _currencyService.GetAllRatesAsync();
                var popularCodes = new[] { "USD", "EUR", "ALTIN", "GBP", "CHF", "JPY", "CAD", "AUD", "DKK", "SEK", "NOK", "SAR", "KWD" };
                var filteredRates = rates.Where(r => popularCodes.Contains(r.Key)).Select(r => r.Value).OrderBy(r => Array.IndexOf(popularCodes, r.Code)).ToList();
                return Ok(new { Rates = filteredRates, LastUpdate = DateTime.Now.ToString("HH:mm") });
            } catch (Exception ex) {
                return StatusCode(500, "Kur bilgisi alınamadı: " + ex.Message);
            }
        }

        // --- 14. KREDİ BAŞVURUSU ---
        [HttpPost("apply-loan")]
        [Authorize]
        public IActionResult ApplyLoan([FromBody] LoanApplication request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            decimal rate = 3.49m / 100;
            double r = (double)rate;
            double n = request.TermMonths;
            double monthly = (double)request.Amount * (r * Math.Pow(1 + r, n)) / (Math.Pow(1 + r, n) - 1);
            decimal totalRepayment = (decimal)monthly * request.TermMonths;

            request.UserId = userId;
            request.InterestRate = 3.49m;
            request.MonthlyPayment = (decimal)monthly;
            request.TotalRepayment = totalRepayment; 
            request.RemainingAmount = totalRepayment; 
            request.Status = "Pending"; 
            request.ApplicationDate = DateTime.UtcNow;

            _context.LoanApplications.Add(request);
            _context.SaveChanges();

            return Ok(new { Message = "Kredi başvurunuz alındı.", ApplicationId = request.Id });
        }

        // --- 15. BAŞVURULARIMI GETİR ---
        [HttpGet("my-loans")]
        [Authorize]
        public IActionResult GetMyLoans()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var loans = _context.LoanApplications.Where(l => l.UserId == userId).OrderByDescending(l => l.ApplicationDate).ToList();
            return Ok(loans);
        }

        // --- 16. ADMIN: BEKLEYEN KREDİLER ---
        [HttpGet("admin/loans")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetAllLoanApplications()
        {
            var loans = _context.LoanApplications.Include(l => l.User).OrderByDescending(l => l.ApplicationDate).ToList();
            return Ok(loans);
        }

        // --- 17. ADMIN: KREDİ ONAYLA / REDDET ---
        [HttpPost("admin/process-loan")]
        [Authorize(Roles = "Admin")]
        public IActionResult ProcessLoan([FromBody] LoanProcessDto request)
        {
            using var transaction = _context.Database.BeginTransaction();
            try {
                var loan = _context.LoanApplications.FirstOrDefault(l => l.Id == request.LoanId);
                if (loan == null) return NotFound("Kredi başvurusu bulunamadı.");
                if (loan.Status != "Pending") return BadRequest("Bu başvuru zaten sonuçlandırılmış veya durumu uygun değil.");

                loan.Status = request.Decision; 

                if (request.Decision == "Approved") {
                    var account = _context.BankAccounts.FirstOrDefault(a => a.UserId == loan.UserId && a.Currency == "TL");
                    if (account == null) {
                        var user = _context.Users.Find(loan.UserId);
                        account = new BankAccount { UserId = loan.UserId, Currency = "TL", Balance = 0, AccountNumber = GenerateUniqueAccountNumber(), OwnerName = user.FullName ?? user.Username };
                        _context.BankAccounts.Add(account);
                    }
                    account.Balance += loan.Amount;
                    var history = new TransactionHistory {
                        ToAccountId = account.Id, Amount = loan.Amount, ReceivedAmount = loan.Amount, TransactionType = "Kredi Kullandırımı", TransactionDate = DateTime.UtcNow, Details = $"{loan.TermMonths} Ay Vadeli Kredi Onayı"
                    };
                    _context.TransactionHistories.Add(history);
                }
                _context.SaveChanges();
                transaction.Commit();
                return Ok(new { Message = request.Decision == "Approved" ? "Kredi onaylandı ve para hesaba geçti." : "Kredi reddedildi." });
            } catch (Exception ex) {
                transaction.Rollback();
                return StatusCode(500, "Hata: " + ex.Message);
            }
        }

        // --- 18. KREDİ TAKSİDİ ÖDE ---
        [HttpPost("repay-loan")]
        [Authorize]
        public IActionResult RepayLoan([FromBody] int loanId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            using var transaction = _context.Database.BeginTransaction();
            try {
                var loan = _context.LoanApplications.FirstOrDefault(l => l.Id == loanId && l.UserId == userId);
                if (loan == null) return NotFound("Kredi bulunamadı.");
                if (loan.Status != "Approved") return BadRequest("Bu kredi onaylanmamış veya zaten kapanmış.");
                if (loan.RemainingAmount <= 0.1m) return BadRequest("Bu kredinin borcu bitmiştir.");

                var account = _context.BankAccounts.FirstOrDefault(a => a.UserId == userId && a.Currency == "TL");
                if (account == null) return BadRequest("Ödeme yapacak TL hesabınız bulunamadı.");

                decimal paymentAmount = loan.MonthlyPayment;
                if (loan.RemainingAmount < paymentAmount) paymentAmount = loan.RemainingAmount;

                if (account.Balance < paymentAmount) return BadRequest("Yetersiz bakiye.");

                account.Balance -= paymentAmount;
                loan.RemainingAmount -= paymentAmount;

                if (loan.RemainingAmount <= 0.1m) {
                    loan.RemainingAmount = 0;
                    loan.Status = "PaidOff"; 
                }

                var history = new TransactionHistory {
                    FromAccountId = account.Id, Amount = paymentAmount, ReceivedAmount = paymentAmount, TransactionType = "Kredi Ödemesi", TransactionDate = DateTime.UtcNow, Details = $"Kredi ID: {loan.Id} Taksit Ödemesi"
                };
                _context.TransactionHistories.Add(history);
                _context.SaveChanges();
                transaction.Commit();
                return Ok(new { Message = "Taksit ödendi.", RemainingDebt = loan.RemainingAmount, Status = loan.Status });
            } catch (Exception ex) {
                transaction.Rollback();
                return StatusCode(500, "Hata: " + ex.Message);
            }
        }

       // --- 19. ADMIN: DETAYLI FİNANSAL RAPOR (GÜNCELLENMİŞ) ---
        [HttpGet("admin/financial-report")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSystemFinancialReport()
        {
            // 1. Verileri Çek
            var users = _context.Users.AsNoTracking().ToList();
            var accounts = _context.BankAccounts.AsNoTracking().ToList();
            var loans = _context.LoanApplications.AsNoTracking().ToList();
            var cards = _context.Cards.AsNoTracking().ToList();

            // 2. Güncel Kurları Al (Dövizleri TL'ye çevirmek için)
            var rates = await _currencyService.GetAllRatesAsync();

            var report = users.Select(user => 
            {
                // Kullanıcının hesapları
                var userAccounts = accounts.Where(a => a.UserId == user.Id).ToList();
                
                var accountDetails = userAccounts.Select(a => new { 
                    AccountNumber = a.AccountNumber, 
                    Currency = a.Currency, 
                    Balance = a.Balance, 
                    AccountOwnerUsername = user.Username 
                }).ToList();

                // Krediler ve Kartlar
                var userLoans = loans.Where(l => l.UserId == user.Id).ToList();
                var userCards = cards.Where(c => c.UserId == user.Id).ToList();

                // --- HESAPLAMALAR ---

                // 1. 🔥 TOPLAM VARLIK (TOTAL MONEY) HESAPLAMA 🔥
                decimal totalAssetsTL = 0;
                foreach (var acc in userAccounts)
                {
                    if (acc.Currency == "TL")
                    {
                        totalAssetsTL += acc.Balance;
                    }
                    else if (rates.TryGetValue(acc.Currency, out var rateData)) // Kur varsa çarp
                    {
                        totalAssetsTL += acc.Balance * rateData.Buying;
                    }
                    else
                    {
                        totalAssetsTL += acc.Balance; // Kur yoksa birebir topla (Güvenlik)
                    }
                }

                // 2. Borç Hesaplamaları
                var userLoansList = userLoans.Select(l => new { 
                    Id = l.Id, Amount = l.Amount, TotalRepayment = l.TotalRepayment, RemainingAmount = l.RemainingAmount, 
                    Status = l.Status 
                }).ToList();

                var userCardsList = userCards.Select(c => new { 
                    CardNumber = c.CardNumber, CardType = c.CardType, CreditLimit = c.CreditLimit, CurrentDebt = c.CurrentDebt, Status = c.Status 
                }).ToList();

                decimal remainingLoanDebt = userLoans.Where(l => l.Status == "Approved").Sum(l => l.RemainingAmount);
                decimal totalCardDebt = userCards.Where(c => c.CardType == "Credit").Sum(c => c.CurrentDebt);
                decimal totalLiabilities = remainingLoanDebt + totalCardDebt;

                // Kredi İstatistikleri
                decimal totalLoanPrincipal = userLoans.Sum(l => l.TotalRepayment);
                decimal totalLoanPaid = totalLoanPrincipal - userLoans.Sum(l => l.RemainingAmount);

                return new { 
                    UserId = user.Id, 
                    FullName = user.FullName ?? user.Username, 
                    AccountList = accountDetails, 
                    CardList = userCardsList, 
                    Loans = new { 
                        TotalDebt = totalLoanPrincipal, 
                        Paid = totalLoanPaid, 
                        Remaining = remainingLoanDebt, 
                        ActiveLoanCount = userLoans.Count(l => l.Status == "Approved"), 
                        List = userLoansList 
                    },
                    TotalLiabilities = totalLiabilities, // Toplam Borç
                    TotalAssets = totalAssetsTL          // 🔥 GÖNDERİLEN YENİ VERİ: TOPLAM PARA
                };
            }).ToList();

            return Ok(report);
        }
        // --- 20. KARTLARIMI GETİR ---
        [HttpGet("my-cards")]
        [Authorize]
        public IActionResult GetMyCards()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var cards = _context.Cards.Where(c => c.UserId == userId).Include(c => c.LinkedAccount).OrderByDescending(c => c.Id).ToList();
            return Ok(cards);
        }

        // --- 21. YENİ KART BAŞVURUSU ---
        [HttpPost("create-card")]
        [Authorize]
        public IActionResult CreateCard([FromBody] CreateCardDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = _context.Users.Find(userId);
            int existingCount = _context.Cards.Count(c => c.UserId == userId && c.CardType == request.CardType && c.Status != "Rejected");

            if (existingCount >= 6) {
                string typeName = request.CardType == "Debit" ? "Banka Kartı" : "Kredi Kartı";
                return BadRequest($"Maksimum limite ulaştınız. En fazla 6 adet {typeName} sahibi olabilirsiniz.");
            }

            var random = new Random();
            string cardNumber = $"4{random.Next(100, 999)} {random.Next(1000, 9999)} {random.Next(1000, 9999)} {random.Next(1000, 9999)}";
            string cvv = random.Next(100, 999).ToString();
            string expiry = DateTime.Now.AddYears(5).ToString("MM/yy");

            var newCard = new Card { UserId = userId, CardHolderName = user.FullName?.ToUpper() ?? user.Username.ToUpper(), CardNumber = cardNumber, CVV = cvv, ExpiryDate = expiry, CardType = request.CardType };

            if (request.CardType == "Debit") {
                var account = _context.BankAccounts.FirstOrDefault(a => a.AccountNumber == request.LinkedAccountNumber && a.UserId == userId);
                if (account == null) return BadRequest("Lütfen geçerli bir vadesiz hesabınızı seçin.");
                newCard.LinkedAccountId = account.Id; newCard.Status = "Active"; 
            } else if (request.CardType == "Credit") {
                newCard.RequestedLimit = request.RequestedLimit; newCard.CreditLimit = 0; newCard.Status = "Pending"; 
            }

            _context.Cards.Add(newCard); _context.SaveChanges();
            return Ok(new { Message = request.CardType == "Credit" ? "Başvurunuz alındı, onay bekleniyor." : "Kartınız oluşturuldu." });
        }

        // --- 22. ADMIN: TÜM KART BAŞVURULARI ---
        [HttpGet("admin/card-applications")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetCardApplications()
        {
            var applications = _context.Cards.AsNoTracking().Include(c => c.User).Where(c => c.CardType == "Credit").OrderByDescending(c => c.Id).ToList();
            return Ok(applications);
        }

        // --- 23. ADMIN: KART ONAYLA / REDDET ---
        [HttpPost("admin/process-card")]
        [Authorize(Roles = "Admin")]
        public IActionResult ProcessCard([FromBody] CardProcessDto dto)
        {
            var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value); 
            var card = _context.Cards.Include(c => c.User).FirstOrDefault(c => c.Id == dto.CardId);
            
            if (card == null) return NotFound("Kart bulunamadı.");

            string logAction = ""; string logDetails = "";

            if (dto.Decision == "Approved") {
                card.Status = "Active"; card.CreditLimit = dto.ApprovedLimit; 
                logAction = "Kart Onaylandı"; logDetails = $"Kullanıcı: {card.User.Username}, Kart ID: {card.Id}, Limit: {dto.ApprovedLimit}";
            } else {
                card.Status = "Rejected"; logAction = "Kart Reddedildi"; logDetails = $"Kullanıcı: {card.User.Username}, Kart ID: {card.Id}";
            }

            var log = new SecurityLog { UserId = adminId, Action = logAction, Details = logDetails, Timestamp = DateTime.UtcNow };
            _context.SecurityLogs.Add(log);
            _context.SaveChanges();
            return Ok(new { Message = "İşlem başarılı." });
        }

        // -----------------------------------------------------------
        // --- 24. SCHEDULED TRANSFERS / DÜZENLI TRANSFERLER (YENİ) ---
        // -----------------------------------------------------------

        // --- 1. DÜZENLI TRANSFER OLUŞTUR ---
        [Authorize]
        [HttpPost("scheduled-transfers")]
        public IActionResult CreateScheduledTransfer([FromBody] CreateScheduledTransferDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Gönderen hesabı kontrol et (kullanıcının kendi hesabı olmalı)
            var fromAccount = _context.BankAccounts
                .FirstOrDefault(a => a.AccountNumber == dto.FromAccountNumber && a.UserId == currentUserId);

            if (fromAccount == null)
                return BadRequest("Gönderen hesap bulunamadı veya size ait değil.");

            // Alıcı hesabı kontrol et
            var toAccount = _context.BankAccounts
                .Include(a => a.User)
                .FirstOrDefault(a => a.AccountNumber == dto.ToAccountNumber);

            if (toAccount == null)
                return BadRequest("Alıcı hesap bulunamadı.");

            if (fromAccount.Id == toAccount.Id)
                return BadRequest("Aynı hesaplar arasında transfer yapılamaz.");

            if (dto.Amount <= 0)
                return BadRequest("Transfer tutarı pozitif olmalıdır.");

            // 🔥🔥 FIX EKLENDİ: PostgreSQL UTC hatasını önlemek için tarih formatını düzeltiyoruz 🔥🔥
            if (dto.EndDate.HasValue)
            {
                dto.EndDate = DateTime.SpecifyKind(dto.EndDate.Value, DateTimeKind.Utc);
            }

            // Sonraki transfer tarihini hesapla
            var nextExecutionDate = CalculateNextExecutionDate(dto.Frequency, dto.DayOfMonth, dto.DayOfWeek);

            if (nextExecutionDate == null)
                return BadRequest("Geçersiz sıklık parametreleri.");

            var scheduledTransfer = new ScheduledTransfer
            {
                FromAccountId = fromAccount.Id,
                ToAccountId = toAccount.Id,
                Amount = dto.Amount,
                Description = dto.Description,
                Frequency = dto.Frequency,
                DayOfMonth = dto.DayOfMonth,
                DayOfWeek = dto.DayOfWeek,
                NextExecutionDate = nextExecutionDate.Value,
                EndDate = dto.EndDate,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ScheduledTransfers.Add(scheduledTransfer);
            _context.SaveChanges();

            return Ok(new { Message = "Düzenli transfer başarıyla oluşturuldu.", Id = scheduledTransfer.Id });
        }

        // --- 2. DÜZENLI TRANSFERLERI LİSTELE ---
        [Authorize]
        [HttpGet("scheduled-transfers")]
        public IActionResult GetScheduledTransfers()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var scheduledTransfersRaw = _context.ScheduledTransfers
                .Include(st => st.FromAccount)
                .Include(st => st.ToAccount)
                .ThenInclude(ta => ta.User)
                .Where(st => st.FromAccount.UserId == currentUserId)
                .OrderByDescending(st => st.CreatedAt)
                .ToList();

            var scheduledTransfers = scheduledTransfersRaw
                .Select(st => new ScheduledTransferViewDto
                {
                    Id = st.Id,
                    FromAccountNumber = st.FromAccount.AccountNumber,
                    FromAccountOwner = st.FromAccount.OwnerName,
                    ToAccountNumber = st.ToAccount.AccountNumber,
                    ToAccountOwner = st.ToAccount.OwnerName,
                    Amount = st.Amount,
                    Description = st.Description,
                    Frequency = st.Frequency,
                    FrequencyDisplay = GetFrequencyDisplay(st.Frequency, st.DayOfMonth, st.DayOfWeek),
                    DayOfMonth = st.DayOfMonth,
                    DayOfWeek = st.DayOfWeek,
                    NextExecutionDate = st.NextExecutionDate,
                    EndDate = st.EndDate,
                    IsActive = st.IsActive,
                    CreatedAt = st.CreatedAt,
                    UpdatedAt = st.UpdatedAt
                })
                .ToList();

            return Ok(scheduledTransfers);
        }

        // --- 3. DÜZENLI TRANSFER GÜNCELLE ---
        [Authorize]
        [HttpPut("scheduled-transfers/{id}")]
        public IActionResult UpdateScheduledTransfer(int id, [FromBody] UpdateScheduledTransferDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var scheduledTransfer = _context.ScheduledTransfers
                .Include(st => st.FromAccount)
                .FirstOrDefault(st => st.Id == id && st.FromAccount.UserId == currentUserId);

            if (scheduledTransfer == null)
                return NotFound("Düzenli transfer bulunamadı.");

            if (dto.Amount <= 0)
                return BadRequest("Transfer tutarı pozitif olmalıdır.");

            // Sonraki transfer tarihini yeniden hesapla
            var nextExecutionDate = CalculateNextExecutionDate(dto.Frequency, dto.DayOfMonth, dto.DayOfWeek);

            if (nextExecutionDate == null)
                return BadRequest("Geçersiz sıklık parametreleri.");

            scheduledTransfer.Amount = dto.Amount;
            scheduledTransfer.Description = dto.Description;
            scheduledTransfer.Frequency = dto.Frequency;
            scheduledTransfer.DayOfMonth = dto.DayOfMonth;
            scheduledTransfer.DayOfWeek = dto.DayOfWeek;
            scheduledTransfer.NextExecutionDate = nextExecutionDate.Value;
            scheduledTransfer.EndDate = dto.EndDate;
            scheduledTransfer.IsActive = dto.IsActive;
            scheduledTransfer.UpdatedAt = DateTime.UtcNow;

            _context.SaveChanges();

            return Ok(new { Message = "Düzenli transfer başarıyla güncellendi." });
        }

        // --- 4. DÜZENLI TRANSFER SİL ---
        [Authorize]
        [HttpDelete("scheduled-transfers/{id}")]
        public IActionResult DeleteScheduledTransfer(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var scheduledTransfer = _context.ScheduledTransfers
                .Include(st => st.FromAccount)
                .FirstOrDefault(st => st.Id == id && st.FromAccount.UserId == currentUserId);

            if (scheduledTransfer == null)
                return NotFound("Düzenli transfer bulunamadı.");

            _context.ScheduledTransfers.Remove(scheduledTransfer);
            _context.SaveChanges();

            return Ok(new { Message = "Düzenli transfer başarıyla silindi." });
        }

        // --- YARDIMCI METOTLAR ---
        private DateTime? CalculateNextExecutionDate(string frequency, int? dayOfMonth, int? dayOfWeek)
        {
            var now = DateTime.UtcNow;
            
            switch (frequency?.ToLower())
            {
                case "daily":
                    return now.Date.AddDays(1);

                case "weekly":
                    if (!dayOfWeek.HasValue || dayOfWeek < 0 || dayOfWeek > 6)
                        return null;
                    
                    var nextWeekly = now.Date;
                    while (nextWeekly.DayOfWeek != (DayOfWeek)dayOfWeek.Value)
                        nextWeekly = nextWeekly.AddDays(1);
                    
                    if (nextWeekly <= now.Date)
                        nextWeekly = nextWeekly.AddDays(7);
                    
                    return nextWeekly;

                case "monthly":
                    if (!dayOfMonth.HasValue || dayOfMonth < 1 || dayOfMonth > 31)
                        return null;
                    
                    var nextMonthly = new DateTime(now.Year, now.Month, Math.Min(dayOfMonth.Value, DateTime.DaysInMonth(now.Year, now.Month)));
                    
                    if (nextMonthly <= now.Date)
                    {
                        if (now.Month == 12)
                            nextMonthly = new DateTime(now.Year + 1, 1, Math.Min(dayOfMonth.Value, DateTime.DaysInMonth(now.Year + 1, 1)));
                        else
                            nextMonthly = new DateTime(now.Year, now.Month + 1, Math.Min(dayOfMonth.Value, DateTime.DaysInMonth(now.Year, now.Month + 1)));
                    }
                    
                    return nextMonthly;

                case "yearly":
                    var nextYearly = new DateTime(now.Year, now.Month, now.Day).AddYears(1);
                    return nextYearly;

                default:
                    return null;
            }
        }

        private static string GetFrequencyDisplay(string frequency, int? dayOfMonth, int? dayOfWeek)
        {
            switch (frequency?.ToLower())
            {
                case "daily":
                    return "Her gün";
                case "weekly":
                    if (dayOfWeek.HasValue)
                    {
                        var dayNames = new[] { "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi" };
                        return $"Her hafta {dayNames[dayOfWeek.Value]}";
                    }
                    return "Haftalık";
                case "monthly":
                    if (dayOfMonth.HasValue)
                        return $"Her ayın {dayOfMonth.Value}. günü";
                    return "Aylık";
                case "yearly":
                    return "Yıllık";
                default:
                    return frequency ?? "Bilinmiyor";
            }
        }
    }
}