# 🦷 PulpApp — Sistema de Gestión Odontológica

Aplicación web completa para consultorio dental. Frontend React + Backend Node.js/Express + Base de datos Supabase.

## 🚀 Características

| Módulo | Descripción |
|--------|-------------|
| 🔐 **Login con roles** | Admin, Dentista, Asistente — con control de acceso |
| 📊 **Dashboard** | Estadísticas, citas del día, ingresos, gráfico de revenue |
| 👥 **Pacientes** | Ficha completa con foto, contacto, seguro, datos de emergencia |
| 🏥 **Historia médica** | Condiciones sistémicas, alergias, medicamentos, hábitos |
| 🦷 **Odontograma** | 32 dientes interactivos (notación FDI), 5 superficies, 13 estados |
| 📋 **Historia clínica** | Registros de visitas con diagnóstico, tratamiento, recetas |
| 📅 **Agenda** | Vista semanal, arrastrar citas, estados de cita |
| ✍ **Firma digital** | Canvas para firma del consentimiento del paciente |
| 💳 **Facturación** | Facturas, items, impuestos, descuentos, cobros parciales |
| 🤖 **PulpIA** | Asistente IA dental con GPT-4o-mini |
| ⭐ **Suscripciones** | Dueño (jojacale@gmail.com) gratis, demás pagan mensual |

---

## ⚙️ Configuración — Paso a paso

### 1. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo
2. En el SQL Editor, ejecuta el archivo `supabase/schema.sql` completo
3. En **Settings → API**, copia:
   - Project URL
   - `anon` key (pública)
   - `service_role` key (privada — nunca en el frontend)
4. En **Authentication → Settings**:
   - Desactiva "Confirm email" para desarrollo (o configura tu SMTP)
   - Agrega tu dominio a "Redirect URLs" cuando desplegues

### 2. Crear usuario administrador (dueño)

En el **SQL Editor** de Supabase:

```sql
-- Crear usuario admin (reemplaza con tu contraseña)
-- También puedes hacerlo desde Authentication → Users → Add user
SELECT auth.uid();  -- solo para verificar
```

O desde **Authentication → Users → Add user**:
- Email: `jojacale@gmail.com`
- Password: la que quieras
- Este usuario automáticamente tendrá acceso gratuito

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de Supabase y OpenAI
npm install
npm run dev
# Backend en http://localhost:3001
```

**Variables de entorno del backend** (`.env`):
```env
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # service_role key
SUPABASE_ANON_KEY=eyJ...          # anon key
OPENAI_API_KEY=sk-...             # opcional (para PulpIA)
FRONTEND_URL=http://localhost:5173
OWNER_EMAIL=jojacale@gmail.com
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# Si el backend no está en /api proxy, edita VITE_API_URL
npm install
npm run dev
# Frontend en http://localhost:5173
```

**Variables de entorno del frontend** (`.env`):
```env
VITE_API_URL=http://localhost:3001/api
```

### 5. Primer acceso

1. Abre http://localhost:5173
2. Inicia sesión con `jojacale@gmail.com` y tu contraseña
3. ¡Listo! Tienes acceso completo como administrador

---

## 🌐 Despliegue en producción

### Frontend (Vercel / Netlify)
```bash
cd frontend
npm run build
# Sube la carpeta `dist` a Vercel, Netlify, o cualquier CDN
```

Variables de entorno en Vercel/Netlify:
```
VITE_API_URL=https://tu-backend.railway.app/api
```

### Backend (Railway / Render / VPS)
```bash
cd backend
# En Railway: conecta el repo, Railway detecta Node.js automáticamente
# Variables de entorno: las mismas que en .env
```

### Supabase (ya está en la nube)
- Cambia `FRONTEND_URL` en el backend al dominio de producción
- Agrega el dominio a los "Redirect URLs" permitidos en Supabase Auth

---

## 📁 Estructura del proyecto

```
pulpapp/
├── supabase/
│   └── schema.sql          # Schema completo de base de datos
├── backend/
│   ├── src/
│   │   ├── index.js         # Entrada Express
│   │   ├── config/
│   │   │   └── supabase.js  # Clientes Supabase
│   │   ├── middleware/
│   │   │   └── auth.js      # JWT + verificación suscripción
│   │   └── routes/
│   │       ├── auth.js      # Login, registro, perfil
│   │       ├── patients.js  # CRUD pacientes + historia médica
│   │       ├── appointments.js
│   │       ├── clinicalHistory.js
│   │       ├── odontogram.js
│   │       ├── invoices.js
│   │       ├── dashboard.js
│   │       └── ai.js        # OpenAI / PulpIA
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── services/
    │   │   └── api.js       # Todas las llamadas al backend
    │   ├── components/
    │   │   ├── Layout/      # Sidebar, Header, MainLayout
    │   │   ├── Odontogram/  # Odontograma interactivo SVG
    │   │   └── SignatureCanvas.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── Patients.jsx
    │       ├── PatientDetail.jsx
    │       ├── Appointments.jsx
    │       ├── ClinicalHistory.jsx
    │       ├── Billing.jsx
    │       └── AIAssistant.jsx
    └── package.json
```

---

## 💎 Sistema de suscripciones

| Usuario | Acceso |
|---------|--------|
| `jojacale@gmail.com` | ✅ Gratuito permanente (`subscription_status = 'free'`) |
| Otros odontólogos | Requieren `subscription_status = 'active'` o `'trial'` |
| Asistentes | Mismo control de suscripción |

Para activar una suscripción manualmente (desde SQL):
```sql
UPDATE user_profiles
SET subscription_status = 'active',
    subscription_end_date = NOW() + INTERVAL '1 month'
WHERE email = 'otro@doctor.com';
```

---

## 🔑 Roles y permisos

| Acción | Admin | Dentista | Asistente |
|--------|-------|----------|-----------|
| Ver pacientes | ✅ | ✅ | ✅ |
| Crear/editar pacientes | ✅ | ✅ | ✅ |
| Eliminar pacientes | ✅ | ✅ | ❌ |
| Historia clínica | ✅ | ✅ | ❌ |
| Facturas | ✅ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |

---

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router 6, Vite 5
- **Backend**: Node.js, Express 4, Helmet, Rate Limiting
- **Base de datos**: Supabase (PostgreSQL + Auth + RLS)
- **IA**: OpenAI GPT-4o-mini
- **Estilos**: CSS puro con variables (sin dependencias extra)

---

## 📞 Soporte

Sistema desarrollado para **jojacale@gmail.com** con acceso de administrador gratuito permanente.

**Colores de la marca:**
- Verde principal: `#1a9e75`
- Azul principal: `#185fa5`
