-- Extensions needed for accent-insensitive fuzzy search on food names
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() is STABLE, not IMMUTABLE, so it can't be used directly in an index
-- expression. Wrap it in an IMMUTABLE function (safe here: the "unaccent" text
-- search dictionary is fixed data, not session/config-dependent).
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text AS $$
    SELECT public.unaccent($1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Speeds up the leading-wildcard LIKE search in buscarLocal (buscar-alimentos.ts)
CREATE INDEX "alimento_nome_trgm_idx" ON "Alimento" USING gin (immutable_unaccent(lower(nome)) gin_trgm_ops);
