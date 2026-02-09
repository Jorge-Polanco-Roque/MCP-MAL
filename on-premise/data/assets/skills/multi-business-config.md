# Multi-Business Configuration System

## Archivos de configuración
```
config/
├── business.yaml      → nombre, duración, recursos, mensajes, tool descriptions
├── agent_prompt.txt   → personalidad del agente de voz
└── config_loader.py   → singleton que carga todo
```

## Adaptar a nuevo negocio (sin tocar código Python)
1. Editar config/business.yaml
2. Editar config/agent_prompt.txt
3. Editar .env (API keys, Sheet ID, Agent ID)
4. Crear Google Sheet + compartir con service account
5. python setup_sheets.py
6. python configure_elevenlabs.py
7. uvicorn app.main:app

## config_loader.py — API
```python
from config.config_loader import config

config.business_name          # "Bella Italia"
config.duration_hours         # 2.0
config.tables                 # lista de recursos
config.tool_descriptions      # dict de descripciones
config.agent_prompt           # texto del prompt
config.msg("key", var=value)  # mensaje formateado
config.get_mock_tables()      # tablas para mock mode
```

## business.yaml — Campos clave
- business_name / business_type
- reservation.duration_hours
- reservation.max_party_size
- tables[] — lista de recursos reservables
- tool_descriptions — textos para ElevenLabs
- messages — 22 mensajes con placeholders {variable}
