using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobTrackerApi.Migrations
{
    /// <inheritdoc />
    public partial class ProfileConditions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdditionalConditions",
                table: "UserProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContractTypes",
                table: "UserProfiles",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "PreferredLocations",
                table: "UserProfiles",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SalaryExpectation",
                table: "UserProfiles",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkModes",
                table: "UserProfiles",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdditionalConditions",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "ContractTypes",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "PreferredLocations",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "SalaryExpectation",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "WorkModes",
                table: "UserProfiles");
        }
    }
}
