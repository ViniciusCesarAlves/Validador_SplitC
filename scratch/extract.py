import json

with open(r'C:\Users\vini3\.gemini\antigravity\brain\943ec2d6-3ef8-47b1-b8af-2efb56bdba02\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if '"step_index":35' in line:
            obj = json.loads(line)
            c = obj.get('content', '')
            print("Full content of step 35:")
            print(c)

