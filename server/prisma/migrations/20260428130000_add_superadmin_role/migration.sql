-- Rol SUPERADMIN: acceso global al SaaS (lectura de todos los tenants).
-- Sólo se asigna manualmente con el script admin-users.ts; nunca por
-- registro normal vía web.
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN' BEFORE 'OWNER';
