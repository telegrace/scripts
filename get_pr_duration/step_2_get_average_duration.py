import json
from datetime import datetime

def open_json_file(file):
    with open(file, 'r') as f:
        data = json.load(f)
    return data 

def filter_prs_by_date(merged_prs, start_date, end_date):
    filtered_prs = []
    for pr in merged_prs:
        created_at = pr['created_at']
        if start_date <= created_at <= end_date:
            filtered_prs.append(pr)
    return filtered_prs

def calculate_duration(pr):
    if "created_at" in pr and pr.get("merged_at") is not None:
        created_at = datetime.fromisoformat(pr["created_at"])
        merged_at = datetime.fromisoformat(pr["merged_at"])
        duration = (merged_at - created_at).total_seconds()
        return duration
    return None

def seconds_to_days_and_hours (seconds):
    days = seconds // (24 * 60 * 60)  
    hours = ((seconds) % (24 * 60 * 60)) / (60 * 60)
    return str(days) + " days and " + str(hours) + " hours"

def main():
    merged_prs = open_json_file('FILE_FROM_STEP_1')
    start_date = 'YYYY-MM-DD'
    end_date = 'YYYY-MM-DD'

    filtered_prs = filter_prs_by_date(merged_prs, start_date, end_date)


    durations = [calculate_duration(pr) for pr in filtered_prs]
    durations = [d for d in durations if d is not None]
    average_duration_seconds = sum(durations) / len(durations)
    average_duration = seconds_to_days_and_hours(average_duration_seconds)

    print(f"Total merged PRs between {start_date} and {end_date}: {len(filtered_prs)}")
    print(f"Average duration for PRs : {average_duration}")
        
if __name__ == "__main__":
    main()