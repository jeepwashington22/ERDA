from __future__ import annotations

import argparse
from pathlib import Path
import warnings

from migrate_xlsx_to_supabase import format_stats, infer_school_year_from_filename, run_import


warnings.filterwarnings(
    "ignore",
    message="Data Validation extension is not supported and will be removed",
    category=UserWarning,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch import every yearly intake workbook in a folder.")
    parser.add_argument("folder", nargs="?", default="YearlyRecords", help="Folder containing yearly .xlsx files")
    parser.add_argument("--dry-run", action="store_true", help="Parse files and print stats without writing to the database")
    parser.add_argument("--verbose", action="store_true", help="Print extra progress information")
    args = parser.parse_args()

    folder = Path(args.folder)
    files = sorted(folder.glob("*.xlsx"))
    if not files:
        print(f"No .xlsx files found in {folder}")
        return 1

    successes = 0
    failures = 0
    for path in files:
        try:
            school_year = infer_school_year_from_filename(path.name)
            stats = run_import(path, school_year, dry_run=args.dry_run, verbose=args.verbose)
            print(format_stats(path, school_year, stats))
            successes += 1
        except Exception as exc:
            failures += 1
            print(f"{path.name}: FAILED - {exc}")

    print(f"Batch complete: success={successes} failed={failures}")
    return 0 if failures == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
