# ==========================================
# Dockerfile unificado para desenvolvimento
# Backend (Django) + Frontend (Vite/React)
# ==========================================

ARG SERVICE=backend

# ==========================================
# BACKEND: Python/Django
# ==========================================
FROM python:3.12-slim AS backend

WORKDIR /app

# Dependências do sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dependências Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código
COPY backend/ .

# Diretórios
RUN mkdir -p logs backup media staticfiles

# Usuário não-root
RUN useradd --create-home app && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]


# ==========================================
# FRONTEND: Node/Vite/React
# ==========================================
FROM node:18-alpine AS frontend

WORKDIR /app

RUN apk add --no-cache curl

# Dependências Node
COPY frontend/package*.json ./
RUN npm ci

# Código
COPY frontend/ .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ==========================================
# FRONTEND PRODUÇÃO: Build estático
# ==========================================
FROM node:18-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# Servir com nginx
FROM nginx:alpine AS frontend-prod
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]