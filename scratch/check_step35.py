import json

with open(r'C:\Users\vini3\.gemini\antigravity\brain\943ec2d6-3ef8-47b1-b8af-2efb56bdba02\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if '"step_index":35' in line:
            obj = json.loads(line)
            for k, v in obj.items():
                print(k, type(v), len(str(v)) if v else 0)
                if k == 'content':
                    print("content repr:", repr(v[:300]))
                if k == 'media':
                    print("media:", v)

