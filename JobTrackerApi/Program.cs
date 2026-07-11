using Amazon.S3;
// using Amazon.SimpleEmailV2;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using JobTrackerApi.Services;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using System.Net;
using System.Security.Claims;
using Serilog;
using Serilog.Formatting.Json;
// using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Control Kestrel's minimum request body data rate
builder.WebHost.ConfigureKestrel(options =>
    {
    // options.Limits.MinRequestBodyDataRate = null; // disable rate limit entirely for dev
    options.Limits.MinRequestBodyDataRate =
        new MinDataRate(
            bytesPerSecond: 100,
            gracePeriod: TimeSpan.FromSeconds(10)
        );
    });


// Replace default ASP.NET logger with Serilog
builder.Services.AddSerilog((services, lc) =>
{
    if (builder.Environment.IsDevelopment())
    {
        // Human-readable output for local development
        lc.MinimumLevel.Information()
          .WriteTo.Console();
    }
    else
    {
        // Structured JSON to stdout — Docker captures it; compatible with any log aggregator (Loki, Datadog, etc.)
        lc.MinimumLevel.Warning()
          .WriteTo.Console(new JsonFormatter());
    }
});

// Add services to the container.
builder.Services.AddControllers().
    AddJsonOptions(options =>
    {
        // Input formatters:
        // https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding?view=aspnetcore-10.0

        // Add enum converter to serialize enums as strings
        options.JsonSerializerOptions.Converters.Add(
            // Enums as strings:
            // https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties
            new JsonStringEnumConverter(
                allowIntegerValues: false // Not allowing integer values for enums
            )
        );

        // JSON returned by API will be pretty-printed
        options.JsonSerializerOptions.WriteIndented = true;
        // Allow case-insensitive property names
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;

        // Configure property naming policy, but be strict for consistency
        // options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });


// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();


// GetConnectionString method looks for a configuration value
// https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-strings?tabs=dotnet-core-cli
// appsettings.json is not appropriate for secret values, keep them in .env
// .env -> Docker -> OS environment variables -> Configuration in .NET
var connectionString = builder.Configuration.GetConnectionString("JobTrackerContext")
    ?? throw new InvalidOperationException("Connection string 'JobTrackerContext' not found.");

// Fail-fast: validate required env vars at startup rather than crashing mid-request.
// ?? throw means: if the config key is missing or null, crash immediately with a clear message.
// In production these come from environment variables via compose.prod.yml (see .env.example).
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured. Set JWT_SECRET environment variable.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer is not configured. Set JWT_ISSUER environment variable.");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience is not configured. Set JWT_AUDIENCE environment variable.");
// S3 bucket only required in production — dev uses LocalStorageService instead
if (!builder.Environment.IsDevelopment())
    _ = builder.Configuration["Storage:S3BucketName"]
        ?? throw new InvalidOperationException("Storage:S3BucketName is not configured. Set S3_BUCKET_NAME environment variable.");
// Sender address + Resend API key only required in production — dev uses LogEmailService instead
if (!builder.Environment.IsDevelopment())
{
    _ = builder.Configuration["Email:FromAddress"]
        ?? throw new InvalidOperationException("Email:FromAddress is not configured. Set EMAIL_FROM_ADDRESS environment variable.");
    _ = builder.Configuration["Resend:ApiKey"]
        ?? throw new InvalidOperationException("Resend:ApiKey is not configured. Set RESEND_API_KEY environment variable.");
}

var adminEmail = builder.Configuration["Admin:Email"]
    ?? throw new InvalidOperationException(
        builder.Environment.IsDevelopment()
            ? "Admin:Email is not configured. Add it to appsettings.Development.json."
            : "Admin:Email is not configured. Set ADMIN_EMAIL environment variable."
    );

var anthropicApiKey = builder.Configuration["Anthropic:ApiKey"]
    ?? throw new InvalidOperationException(
        builder.Environment.IsDevelopment()
            ? "Anthropic:ApiKey is not configured. Add it to appsettings.Development.json."
            : "Anthropic:ApiKey is not configured. Set ANTHROPIC_API_KEY environment variable."
    );

// Npgsql Entity Framework
// https://www.npgsql.org/efcore/index.html?tabs=aspnet
// No AddDbContextPool for safety and simplicity
builder.Services.AddDbContext<JobTrackerContext>(options =>
    options.UseNpgsql(connectionString));

// Health check: GET /health — returns 200 (Healthy) or 503 (Unhealthy); includes DB connectivity check
builder.Services.AddHealthChecks()
    .AddDbContextCheck<JobTrackerContext>();

// Register IAmazonS3 — reads credentials + AWS_REGION from environment automatically
builder.Services.AddAWSService<IAmazonS3>();

// Use LocalStorageService in dev, S3StorageService in production
if (builder.Environment.IsDevelopment())
    builder.Services.AddSingleton<IStorageService, LocalStorageService>();
else
    builder.Services.AddSingleton<IStorageService, S3StorageService>();

// SES registration kept for reference — uncomment to revert if SES production access is granted
// builder.Services.AddAWSService<IAmazonSimpleEmailServiceV2>();

// Use LogEmailService in dev (logs to console), ResendEmailService in production
// AddHttpClient manages connection pooling safely — don't use AddScoped with HttpClient directly
if (builder.Environment.IsDevelopment())
    builder.Services.AddScoped<IEmailService, LogEmailService>();
else
    builder.Services.AddHttpClient<IEmailService, ResendEmailService>();

// AI parsing: extracts job fields from pasted listing text via Claude API
builder.Services.AddScoped<IParsingService, ClaudeParsingService>();

// Registers Identity's core services
builder.Services.AddIdentityCore<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<JobTrackerContext>()
    .AddDefaultTokenProviders(); // Registers the "Default" token provider — Identity's token generation (email confirmation, password reset) won't work without it

// JWT Bearer authentication — validates the token on every request
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey))
        };

        // After signature + expiry are verified, check that the SecurityStamp in the token still matches the DB
        // catches password changes that happened after the token was issued.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                var stampClaim = context.Principal?.FindFirstValue("stamp");

                if (userId == null)
                {
                    context.Fail("Missing sub claim.");
                    return;
                }

                var userManager = context.HttpContext.RequestServices
                    .GetRequiredService<UserManager<ApplicationUser>>();
                var user = await userManager.FindByIdAsync(userId);

                // Stamp mismatch
                if (user == null || user.SecurityStamp != stampClaim)
                    context.Fail("SecurityStamp mismatch — token invalidated.");
            }
        };
    });

// Named policies — reusable on any endpoint via [Authorize(Policy = "...")]
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireRole(Roles.Admin));
    options.AddPolicy("AiEnabled", policy => policy.RequireRole(Roles.AiUser));
});

// Rate limiting — fixed window per IP, applied to auth endpoints only via [EnableRateLimiting("auth")]
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429; // Too Many Requests — returned immediately when limit is exceeded

    options.AddFixedWindowLimiter("auth", config =>
    {
        config.Window = TimeSpan.FromMinutes(1);  // counter resets every 1 minute
        config.PermitLimit = 5;                   // max 5 requests per window per IP
        config.QueueLimit = 0;                    // reject immediately — don't queue excess requests
        config.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
    });

    // Tighter limit for resend — each request triggers a real SES call with a cost
    options.AddFixedWindowLimiter("resend-confirmation", config =>
    {
        config.Window = TimeSpan.FromHours(1);    // counter resets every 1 hour
        config.PermitLimit = 3;                   // max 3 resends per hour per IP
        config.QueueLimit = 0;
        config.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
    });

    // Tight limit for parse — each request hits the Claude API
    options.AddFixedWindowLimiter("parse", config =>
    {
        config.Window = TimeSpan.FromMinutes(1);
        config.PermitLimit = 2;
        config.QueueLimit = 0;
        config.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
    });
});

// CORS only needed in dev — in production, Nginx proxies /api/* so frontend and backend share one origin
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("DevCors", policy =>
        {
            // NOTE: AllowCredentials() only works when the origin is explicitly listed,
            // it's incompatible with AllowAnyOrigin(), but we uses WithOrigins()
            policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()!)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials(); // Required for browser to send httpOnly cookies cross-origin
        });
    });
}


// ForwardedHeaders — production only.
// Tells ASP.NET to overwrite RemoteIpAddress from X-Forwarded-For and Request.Scheme from X-Forwarded-Proto.
// Must be configured here so UseForwardedHeaders() picks it up at pipeline startup.
// https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer
if (!builder.Environment.IsDevelopment())
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders =
            ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

        // Clear the default loopback-only allowlist, then trust only the Docker internal network.
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        options.KnownIPNetworks.Add(
            new System.Net.IPNetwork(IPAddress.Parse("172.16.0.0"), 12)
        );
    });
}

// <snippet_UseSwagger>
var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.UseCors("DevCors"); // dev: CORS needed because frontend and backend run on different ports
else
    // prod: rewrite RemoteIpAddress + Request.Scheme from Nginx's forwarded headers to see the real client IP
    app.UseForwardedHeaders();

// Catch all unhandled exceptions — logs full details server-side, returns a safe generic JSON 500 to the client
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        // Resolve logger from DI — backed by Serilog at this point
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        // ASP.NET puts the caught exception here after intercepting it
        var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();

        if (error != null)
        {
            // Walk the whole chain: EF Core wraps a DB connection failure in a non-DbException,
            // so the DbException is nested, not top-level. See docs/plans/maintenance-page.md.
            var isDbDown = false;
            for (Exception? e = error.Error; e is not null; e = e.InnerException)
            {
                if (e is System.Data.Common.DbException)
                {
                    isDbDown = true;
                    break;
                }
            }

            if (isDbDown)
            {
                // DbException includes intentional maintenance window downtime
                logger.LogError(error.Error, "Database unavailable");
                context.Response.StatusCode = 503;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { error = "Service temporarily unavailable." });
                return;
            }

            // Logs full exception with stack trace — visible server-side only
            logger.LogError(error.Error, "Unhandled exception");
        }

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        // Generic message to client — no stack trace or internal details exposed
        await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
    });
});

app.UseSerilogRequestLogging(); // Emits one structured log event per request (method, path, status, duration)

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Enable the Swagger UI for API testing, run with:
    // dotnet run --launch-profile https
    // NOTE: if Migration in the DB is not running:
    // dotnet ef database update
    app.UseSwaggerUi(options =>
    {
        options.DocumentPath = "/openapi/v1.json";
    });
}
// <snippet_UseSwagger>

// In production the backend is behind Nginx (HTTP only) — Nginx handles SSL termination
if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication(); // on each request, figure out who is calling, must be before UseAuthorization
app.UseAuthorization();
app.UseRateLimiter(); // must be after UseAuthorization so rate limit policies can inspect auth state if needed

app.MapControllers();

// Health check endpoint — anonymous (no JWT), status only.
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { status = report.Status.ToString() });
    }
}).AllowAnonymous();

// Seed demo user on startup — idempotent, skips if already exists
// UserManager is a scoped service so it must be resolved inside a manually created scope.
// This is the standard pattern for using scoped DI services outside of a request.
// https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection#scope-validation
using (var scope = app.Services.CreateScope())
{
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    if (await userManager.FindByEmailAsync(DemoUser.Email) == null)
    {
        // EmailConfirmed = true — demo user bypasses email verification entirely
        var demo = new ApplicationUser { UserName = DemoUser.Email, Email = DemoUser.Email, EmailConfirmed = true };
        // Password is never used — demo endpoint bypasses auth entirely.
        // Random GUID + fixed suffix satisfies Identity's complexity rules (upper, digit, special char).
        await userManager.CreateAsync(demo, Guid.NewGuid().ToString() + "Aa1!");
    }
}

// Seed Identity roles and promote admin — idempotent, logs and continues if admin not found
using (var scope = app.Services.CreateScope())
{
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    foreach (var role in new[] { Roles.Admin, Roles.AiUser })
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));

    var admin = await userManager.FindByEmailAsync(adminEmail);
    // Admin promotion — assigns both Admin and AiUser; idempotent checks prevent duplicate role entries
    if (admin is { EmailConfirmed: true })
    {
        if (!await userManager.IsInRoleAsync(admin, Roles.Admin))
            await userManager.AddToRoleAsync(admin, Roles.Admin);
        if (!await userManager.IsInRoleAsync(admin, Roles.AiUser))
            await userManager.AddToRoleAsync(admin, Roles.AiUser);
    }
}

app.Run();
