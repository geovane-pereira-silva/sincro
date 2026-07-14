-- Normaliza o campo `tipo` das batidas de ponto com base na ORDEM CRONOLÓGICA
-- de cada dia (no fuso do usuário). Corrige registros com papéis trocados
-- (ex.: várias batidas salvas como "entrada"). Não move horários, apenas o papel.
WITH base AS (
  SELECT
    pr.id,
    pr.tipo,
    (pr.data_hora AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'America/Sao_Paulo'))::date AS dia,
    row_number() OVER (
      PARTITION BY pr.user_id,
        (pr.data_hora AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'America/Sao_Paulo'))::date
      ORDER BY pr.data_hora
    ) AS pos,
    count(*) OVER (
      PARTITION BY pr.user_id,
        (pr.data_hora AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'America/Sao_Paulo'))::date
    ) AS n
  FROM public.ponto_registros pr
  JOIN public.profiles p ON p.id = pr.user_id
),
alvo AS (
  SELECT id,
    CASE
      WHEN pos = 1 THEN 'entrada'
      WHEN pos = n AND n % 2 = 0 THEN 'saida'
      WHEN pos % 2 = 0 THEN 'saida_intervalo'
      ELSE 'entrada_intervalo'
    END AS novo_tipo
  FROM base
)
UPDATE public.ponto_registros pr
SET tipo = alvo.novo_tipo
FROM alvo
WHERE pr.id = alvo.id
  AND pr.tipo <> alvo.novo_tipo;