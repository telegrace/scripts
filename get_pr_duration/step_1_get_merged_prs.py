import requests
from datetime import datetime
import json


def get_merged_prs(author, org, repo, access_token):
    merged_prs = []
    page = 1
    while True:
        url = f"https://api.github.com/repos/{org}/{repo}/pulls?state=closed&page={page}&per_page=100"
        response = requests.get(url, headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github.v3+json"
    })
        if response.status_code == 200:
            pr_data = response.json()
            if len(pr_data) == 0:
                break
            for pr in pr_data:
                if pr['user']['login'] == author and pr['merged_at'] is not None:
                    merged_prs.append(pr)
            page += 1
        else:
            print(f"Failed to fetch data. Status code: {response.status_code}")
            break
    return merged_prs

def save_json(data, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def main():
    author = "GITHUB_USERNAME"
    org = "ORGANISATION_NAME" 
    repo = "REPRO_NAME"
    access_token = "YOUR_GENERATED_TOKEN" #you need to give organisation rights to your generated token

    merged_prs = get_merged_prs(author, org, repo, access_token)

    # API call can be long so save the data
    save_json(merged_prs)

    print(f"Total merged PRs from {author} in {org}/{repo}: {len(merged_prs)}")
        
if __name__ == "__main__":
    main()