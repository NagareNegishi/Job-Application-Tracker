using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using JobTrackerApi.Data;

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


// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// GetConnectionString method looks for a configuration value
// https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-strings?tabs=dotnet-core-cli
// appsettings.json is not appropriate for secret values, keep them in .env
// .env -> Docker -> OS environment variables -> Configuration in .NET
var connectionString = builder.Configuration.GetConnectionString("JobTrackerContext")
    ?? throw new InvalidOperationException("Connection string 'JobTrackerContext' not found.");
// Npgsql Entity Framework
// https://www.npgsql.org/efcore/index.html?tabs=aspnet
// No AddDbContextPool for safety and simplicity
builder.Services.AddDbContext<JobTrackerContext>(options =>
    options.UseNpgsql(connectionString));

// <snippet_UseSwagger>
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Enable the Swagger UI for API testing, run with:
    // dotnet run --launch-profile https
    app.UseSwaggerUi(options =>
    {
        options.DocumentPath = "/openapi/v1.json";
    });
}
// <snippet_UseSwagger>

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
