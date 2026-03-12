-- Fase 1.1: Adicionar novos valores ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'franqueadora';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'franqueado';