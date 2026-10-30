-- Migration 008: Estandariza el `num` de las unidades a {torre}-{pisonumero} / {torre}OF-{pisonumero}
--
-- Formato destino (fuente canónica: docs/alicuotas.json):
--   residencial   -> "{TORRE}-{piso}{numero}"   ej. 0031 -> A-031, 032 -> A-032, 0121 -> A-121
--   oficina/local -> "{TORRE}OF-{sufijo}"       ej. AOF11 -> AOF-11, AOMC1 -> AOF-MC1,
--                                                   AOPB1 -> AOF-PB1, AOFM1 -> AOF-M1,
--                                                   CO042 -> COF-042, BO164 -> BOF-164
--
-- Torres:
--   oUAIqVCtj6LvNqTa1C8v                  -> A
--   bc458120-85c5-4b96-95a3-b8ba659c82cd  -> A  (locales AOFM1-3)
--   yIjvTgPKvFTtNrLMrDlx                  -> B
--   hIjbDTUS4zX8K1HbRdxk                  -> C
--
-- Idempotente: los num ya estandarizados ({T}-… / {T}OF-…) quedan igual.
-- Guarda contra colisiones: aborta la transacción si el resultado duplicaría un `num`.

BEGIN;

-- Mapa torre por edificio
CREATE TEMP TABLE torre_map (building text PRIMARY KEY, tower text NOT NULL);
INSERT INTO torre_map VALUES
  ('oUAIqVCtj6LvNqTa1C8v',                 'A'),
  ('bc458120-85c5-4b96-95a3-b8ba659c82cd', 'A'),
  ('yIjvTgPKvFTtNrLMrDlx',                 'B'),
  ('hIjbDTUS4zX8K1HbRdxk',                 'C');

-- Guarda de colisiones: aborta si el nuevo `num` se repetiría en cualquier unidad
DO $$
DECLARE
  clash integer;
BEGIN
  SELECT count(*) INTO clash
  FROM (
    SELECT new_num
    FROM (
      SELECT CASE
               WHEN u.type = 'office'
                 THEN left(u.num, 1) || 'OF-' ||
                      regexp_replace(regexp_replace(substring(u.num, 2), '^OF-?', ''), '^O', '')
               WHEN u.num ~ '^[A-C]-' THEN u.num
               WHEN t.tower IS NOT NULL
                 THEN t.tower || '-' ||
                      CASE WHEN length(u.num) > 3 THEN substring(u.num, 2) ELSE u.num END
               ELSE u.num
             END AS new_num
      FROM units u
      LEFT JOIN torre_map t ON t.building = u.building
    ) x
    GROUP BY new_num
    HAVING count(*) > 1
  ) y;

  IF clash > 0 THEN
    RAISE EXCEPTION 'Estandarización cancelada: % conflictos de num duplicado', clash;
  END IF;
END $$;

-- Renombra las unidades de las torres A/B/C (incluye locales AOFM1-3)
UPDATE units u
SET num = CASE
      WHEN u.type = 'office'
        THEN left(u.num, 1) || 'OF-' ||
             regexp_replace(regexp_replace(substring(u.num, 2), '^OF-?', ''), '^O', '')
      WHEN u.num ~ '^[A-C]-' THEN u.num
      ELSE t.tower || '-' ||
           CASE WHEN length(u.num) > 3 THEN substring(u.num, 2) ELSE u.num END
    END,
    updated_at = now()
FROM torre_map t
WHERE u.building = t.building;

COMMIT;