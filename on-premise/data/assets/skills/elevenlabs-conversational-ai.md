# ElevenLabs Conversational AI Integration

## Agent Configuration
- Agentes se crean via API (POST /v1/convai/agents/create) o consola
- configure_elevenlabs.py actualiza prompt + tools programáticamente
- Voice ID configurable via ELEVENLABS_VOICE_ID

## Webhook Tools (6)
| Tool | Descripción |
|------|-------------|
| check_table_availability | Verifica disponibilidad |
| create_reservation | Crea reserva/cita |
| search_reservations | Busca por teléfono |
| cancel_reservation | Cancela reserva |
| modify_reservation | Modifica fecha/hora |
| update_notes | Agrega notas acumulativas |

## System Tools (ElevenLabs built-in)
- end_call — Terminar la llamada
- language_detection — Detectar idioma

## Experiencia Conversacional (v2.1)
- Flujo natural: UNA pregunta a la vez
- Idioma consistente: solo español por defecto
- Escalamiento de agresividad (3 niveles):
  1. Empatía → "Entiendo tu frustración..."
  2. Advertencia → "Si continúa, tendré que terminar"
  3. Terminar → end_call con despedida
- Transferencia a humano: mensaje + end_call (temporal)

## Widget Frontend
```html
<elevenlabs-convai agent-id="agent_xxx"></elevenlabs-convai>
```

## Modo texto en widget
ElevenLabs Console → Agent → Widget → Interface → "Voice + text"
