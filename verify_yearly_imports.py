from __future__ import annotations

import argparse
import os
from collections import defaultdict
from pathlib import Path
import warnings

from openpyxl import load_workbook
import psycopg2

from yearly_header_utils import canonical_header, find_header_index


warnings.filterwarnings(
    "ignore",
    message="Data Validation extension is not supported and will be removed",
    category=UserWarning,
)


def choose_data_sheet(workbook) -> str:
    best_sheet = workbook.sheetnames[0]
    best_score = -1
    for sheet_name in workbook.sheetnames:
        lower_name = sheet_name.strip().lower()
        if lower_name in {"reference", "pivot"}:
            continue
        worksheet = workbook[sheet_name]
        first_row = [cell.value for cell in next(worksheet.iter_rows(min_row=1, max_row=1))]
        score = sum(1 for value in first_row if value not in (None, ""))
        if find_header_index(first_row, "Child Code") is not None:
            score += 100
        if score > best_score:
            best_score = score
            best_sheet = sheet_name
    return best_sheet


def summarize_source_duplicates(folder: Path) -> None:
    rows = defaultdict(list)
    for path in sorted(folder.glob("*.xlsx")):
        workbook = load_workbook(path, read_only=True, data_only=True)
        sheet_name = choose_data_sheet(workbook)
        worksheet = workbook[sheet_name]
        headers = [cell.value for cell in next(worksheet.iter_rows(min_row=1, max_row=1))]
        child_code_idx = find_header_index(headers, "Child Code")
        surname_idx = find_header_index(headers, "*Child's Surname", "Child's Surname")
        first_name_idx = find_header_index(headers, "*Child's First Name", "Child's First Name")
        dob_idx = find_header_index(headers, "*Date of Birth", "Date of Birth")
        if child_code_idx is None:
            continue
        for row_number, row in enumerate(worksheet.iter_rows(min_row=2, values_only=True), start=2):
            child_code = row[child_code_idx] if child_code_idx < len(row) else None
            if not child_code:
                continue
            rows[str(child_code).strip()].append(
                {
                    "file": path.name,
                    "sheet": sheet_name,
                    "row": row_number,
                    "surname": row[surname_idx] if surname_idx is not None and surname_idx < len(row) else None,
                    "first_name": row[first_name_idx] if first_name_idx is not None and first_name_idx < len(row) else None,
                    "dob": row[dob_idx] if dob_idx is not None and dob_idx < len(row) else None,
                }
            )

    duplicates = {
        child_code: entries
        for child_code, entries in rows.items()
        if len(entries) > 1 and len({(e["surname"], e["first_name"], e["dob"]) for e in entries}) > 1
    }

    print("Source child_code duplicates with identity drift:")
    if not duplicates:
        print("  none")
        return

    for child_code, entries in sorted(duplicates.items()):
        print(f"  {child_code}")
        for entry in entries:
            print(
                f"    {entry['file']}[{entry['sheet']}:{entry['row']}] "
                f"{entry['surname']!r} {entry['first_name']!r} dob={entry['dob']!r}"
            )


def summarize_source_counts(folder: Path) -> None:
    print("Source row counts by workbook:")
    for path in sorted(folder.glob("*.xlsx")):
        workbook = load_workbook(path, read_only=True, data_only=True)
        sheet_name = choose_data_sheet(workbook)
        worksheet = workbook[sheet_name]
        count = sum(1 for _ in worksheet.iter_rows(min_row=2, values_only=True))
        print(f"  {path.stem}: {count}")


def summarize_database() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set; skipping database checks.")
        return

    with psycopg2.connect(database_url) as connection:
        with connection.cursor() as cursor:
            print("Enrollment counts by school year:")
            cursor.execute(
                """
                select school_year, count(*)
                from enrollment_records
                group by school_year
                order by school_year
                """
            )
            for school_year, count in cursor.fetchall():
                print(f"  {school_year}: {count}")

            print("\nEnrollments missing academic_performance:")
            cursor.execute(
                """
                select er.school_year, count(*)
                from enrollment_records er
                left join academic_performance ap on ap.enrollment_record_id = er.id
                where ap.id is null
                group by er.school_year
                order by er.school_year
                """
            )
            rows = cursor.fetchall()
            if not rows:
                print("  none")
            else:
                for school_year, count in rows:
                    print(f"  {school_year}: {count}")

            print("\nStudents with more than one enrollment but missing an academic row for at least one year:")
            cursor.execute(
                """
                select s.child_code, s.surname, s.first_name, count(*) as enrollments,
                       count(ap.id) as academic_rows
                from students s
                join enrollment_records er on er.student_id = s.id
                left join academic_performance ap on ap.enrollment_record_id = er.id
                group by s.child_code, s.surname, s.first_name
                having count(*) > count(ap.id)
                order by s.child_code
                limit 50
                """
            )
            rows = cursor.fetchall()
            if not rows:
                print("  none")
            else:
                for child_code, surname, first_name, enrollments, academic_rows in rows:
                    print(f"  {child_code}: {surname}, {first_name} enrollments={enrollments} academic_rows={academic_rows}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify yearly import results in Postgres and source workbooks.")
    parser.add_argument("--source-dir", default="YearlyRecords", help="Optional workbook folder to scan for duplicate child_code values")
    parser.add_argument("--skip-source", action="store_true", help="Skip workbook duplicate scanning")
    parser.add_argument("--skip-db", action="store_true", help="Skip database checks")
    args = parser.parse_args()

    if not args.skip_source:
        summarize_source_counts(Path(args.source_dir))
        print()
        summarize_source_duplicates(Path(args.source_dir))
        print()

    if not args.skip_db:
        summarize_database()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
