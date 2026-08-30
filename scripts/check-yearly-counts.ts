// Quick DB health check: enrollment counts per school year + multi-year stats
// Run: npx tsx scripts/check-yearly-counts.ts
import "dotenv/config";
import { queryPostgres } from "../src/server/lib/postgres";

async function main() {
  const years = await queryPostgres<{ school_year: string; count: string }>(
    `select school_year, count(*)::text as count
       from enrollment_records
      group by school_year
      order by school_year asc`,
  );
  console.log("=== Enrollment records per school year ===");
  for (const y of years) console.log(`  ${y.school_year}: ${y.count}`);

  const totalStudents = await queryPostgres<{ count: string }>(
    "select count(*)::text as count from students",
  );
  console.log(`\nTotal students: ${totalStudents[0]?.count}`);

  const multi = await queryPostgres<{ count: string }>(
    `select count(*)::text as count from (
       select student_id from enrollment_records group by student_id having count(*) > 1
     ) t`,
  );
  console.log(`Students with 2+ yearly records: ${multi[0]?.count}`);

  const single = await queryPostgres<{ count: string }>(
    `select count(*)::text as count from (
       select student_id from enrollment_records group by student_id having count(*) = 1
     ) t`,
  );
  console.log(`Students with exactly 1 yearly record: ${single[0]?.count}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
