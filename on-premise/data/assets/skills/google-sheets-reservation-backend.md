# Google Sheets Reservation Backend

## Estructura (creada por setup_sheets.py)

### Hoja "Mesas" (recursos reservables)
| ID | Nombre | Capacidad | Ubicacion | Activa |

### Hoja "Reservas" (citas/reservas)
| ID | MesaID | Fecha | HoraInicio | HoraFin | NombreCliente | Telefono | NumPersonas | Estado | Notas | CreadoEn |

## Lógica de Reservas

### Check Availability
1. Encuentra recursos con capacidad >= party_size
2. Verifica conflictos de horario (duración configurable)
3. Un recurso NO puede tener dos reservas solapadas
4. Retorna disponibles ordenados por capacidad (menor primero)

### Create Reservation
1. Verifica disponibilidad automáticamente
2. Asigna el recurso más pequeño disponible
3. Genera ID interno (no visible al cliente)
4. Calcula hora de fin = inicio + config.duration_hours

### Search/Cancel/Modify
- Requiere verificación por teléfono
- Solo afecta reservas no canceladas

## Mock Mode
- Se activa sin GOOGLE_SERVICE_ACCOUNT_JSON
- Lee recursos de config/business.yaml via config.get_mock_tables()

## Setup
```bash
python setup_sheets.py  # crea estructura desde business.yaml
```
