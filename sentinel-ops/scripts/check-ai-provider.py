"""Check provider connectivity using a generic prompt, without machine records."""
import json, os, sys, httpx
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for file in [root/'services/ai-service/.env',root/'.env']:
 if file.exists():
  for line in file.read_text().splitlines():
   if '=' in line and not line.lstrip().startswith('#'):
    name,value=line.split('=',1);os.environ[name.strip()]=value.strip().strip('\"').strip("'")
key=os.getenv('GROQ_API_KEY','')
model=os.getenv('GROQ_MODEL','qwen/qwen3.8-27b')
print('Model:',model,'Key configured:',bool(key))
try:
 if '--models' in sys.argv:
  response=httpx.get('https://api.groq.com/openai/v1/models',headers={'Authorization':'Bearer '+key},timeout=30)
  response.raise_for_status()
  print('Available models:', ', '.join(m['id'] for m in response.json()['data'] if m.get('active',True)))
  raise SystemExit(0)
 response=httpx.post('https://api.groq.com/openai/v1/chat/completions',timeout=30,headers={'Authorization':'Bearer '+key},json={'model':model,'messages':[{'role':'user','content':'Return JSON with answer set to connection ready.'}],'response_format':{'type':'json_object'},'max_tokens':128})
 print('Provider status:',response.status_code)
 if response.is_success: print('Output:',response.json()['choices'][0]['message']['content'])
 else: print('Provider error:',response.text.replace(key,'[REDACTED]')[:1000] if key else response.text[:1000])
except Exception as error:
 print('Connection failure:',type(error).__name__);raise SystemExit(1)
