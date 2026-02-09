# Voice Service Architecture

## Overview
Multi-Business Voice Service (v2.1.0) — Servicio de voz genérico para gestión de reservas/citas.

## Stack
- **Backend**: Python FastAPI (uvicorn)
- **Voice AI**: ElevenLabs Conversational AI (agent + webhooks)
- **Database**: Google Sheets (Mesas + Reservas)
- **Config**: business.yaml + agent_prompt.txt (sin tocar código)
- **Frontend**: Widget ElevenLabs embebido en index.html

## Flow
```
User speaks → ElevenLabs Agent → Webhook (tool call) → FastAPI → Google Sheets
```

## Negocio Activo
- **Bella Italia** (restaurante) — agent_7901kgfexyhvejbsr5ayg5nwxzsm

## Concepto "Tables"
Internamente usa "tables" pero representa cualquier recurso reservable:
- Restaurante → Mesas
- Dentista → Consultorios
- Peluquería → Sillas/Estilistas
- Spa → Cabinas

## Endpoints (6 webhooks)
1. check_table_availability — Verifica disponibilidad
2. create_reservation — Crea reserva/cita
3. search_reservations — Busca por teléfono
4. cancel_reservation — Cancela reserva
5. modify_reservation — Modifica fecha/hora
6. update_notes — Agrega notas acumulativas
