"""
Entry point for the anime pipeline.
Supports: full pipeline run, single episode, or scheduled mode.
"""
import argparse
import sys
import logging
from config import config

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")


def main():
    parser = argparse.ArgumentParser(description="Anime Pipeline")
    subparsers = parser.add_subparsers(dest="command")

    # Full pipeline run
    subparsers.add_parser("run", help="Run the full pipeline (crawl → download → send)")

    # Single episode
    single = subparsers.add_parser("single", help="Process a single episode")
    single.add_argument("--anime", required=True, help="Anime name")
    single.add_argument("--season", type=int, default=1, help="Season number")
    single.add_argument("--episode", type=int, required=True, help="Episode number")
    single.add_argument("--url", required=True, help="Episode source URL")

    # Scheduler mode
    schedule = subparsers.add_parser("schedule", help="Run on a schedule")
    schedule.add_argument("--interval", type=int, default=3600, help="Interval in seconds (default: 3600)")

    args = parser.parse_args()

    if args.command == "run" or args.command is None:
        from pipeline import AnimePipeline
        p = AnimePipeline()
        p.run()

    elif args.command == "single":
        from pipeline import run_single
        run_single(args.anime, args.season, args.episode, args.url)

    elif args.command == "schedule":
        import time
        from pipeline import AnimePipeline
        logger.info(f"Starting scheduler with {args.interval}s interval")
        while True:
            try:
                p = AnimePipeline()
                p.run()
            except Exception as e:
                logger.error(f"Scheduled run failed: {e}", exc_info=True)
            logger.info(f"Next run in {args.interval}s...")
            time.sleep(args.interval)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
