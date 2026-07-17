using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobTrackerApi.Migrations
{
    /// <inheritdoc />
    public partial class SalaryExpectationsArray : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "SalaryExpectation",
                table: "UserProfiles",
                newName: "SalaryExpectations");

            // Reshape the single object (or null) into an array so existing rows
            // deserialize as List<SalaryExpectation>.
            migrationBuilder.Sql("""
                UPDATE "UserProfiles"
                SET "SalaryExpectations" = CASE
                    WHEN "SalaryExpectations" IS NULL THEN '[]'::jsonb
                    WHEN jsonb_typeof("SalaryExpectations") = 'object' THEN jsonb_build_array("SalaryExpectations")
                    ELSE "SalaryExpectations"
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Collapse the array back to its first entry (or null) before renaming.
            migrationBuilder.Sql("""
                UPDATE "UserProfiles"
                SET "SalaryExpectations" = CASE
                    WHEN "SalaryExpectations" IS NULL OR jsonb_array_length("SalaryExpectations") = 0 THEN NULL
                    ELSE "SalaryExpectations" -> 0
                END;
                """);

            migrationBuilder.RenameColumn(
                name: "SalaryExpectations",
                table: "UserProfiles",
                newName: "SalaryExpectation");
        }
    }
}
