-- AYZO PHASE 22.9.56 — Device RPC search_path hardening
-- Purpose: version the previously reviewed staging configuration in Git.
-- Scope: four existing SECURITY DEFINER functions, no body replacement.
-- Baseline: MD5 of PL/pgSQL bodies extracted from the four user-reviewed
--           staging pg_get_functiondef() definitions (2026-10-15),
--           with CRLF normalized to LF (CSV export used CRLF).
--           The live pg_proc.prosrc is normalized the same way and checked
--           BEFORE ALTER; any difference fails closed.
--
-- The prior local 2,269-byte file was Bash, not SQL; never run it.
-- The entire change is a single PostgreSQL DO statement. An exception in any
-- precheck, ALTER, or postcheck aborts the statement atomically.
--
-- DO NOT run on production until reviewed in a separate release gate.
-- This file MUST be created in a Supabase CLI-generated migration path.

DO $ayzo_phase22956$
DECLARE
    r record;
    f oid;
    actual_body_md5 text;
    actual_owner text;
    actual_definer boolean;
    actual_path text;
    normalized_path text;
BEGIN
    -- Every source precondition is checked BEFORE the first ALTER.
    FOR r IN
        SELECT * FROM (VALUES
            (
                'public.ayzo_bootstrap_account_device(uuid,text,text,text,text)',
                'aafd9f5bbc23aaac446ee5f5cd89fbc9'
            ),
            (
                'public.ayzo_register_account_device(uuid,text,text,text,text)',
                '12a26e5c487c5907f342328d75c35882'
            ),
            (
                'public.ayzo_revoke_account_device(uuid,text,text)',
                'c81f5caa724879e11ec0c2376a77858a'
            ),
            (
                'public.ayzo_touch_account_device(uuid,text)',
                '4a75f4be1a5cb79ac5e0137f4f31d1bd'
            )
        ) AS expected(signature, body_md5)
    LOOP
        f := to_regprocedure(r.signature);
        IF f IS NULL THEN
            RAISE EXCEPTION 'AYZO_SAFE_STOP: missing function: %', r.signature;
        END IF;

        SELECT
            md5(replace(p.prosrc, chr(13) || chr(10), chr(10))),
            pg_get_userbyid(p.proowner),
            p.prosecdef,
            (SELECT cfg FROM unnest(p.proconfig) AS cfg
             WHERE cfg LIKE 'search_path=%' LIMIT 1)
        INTO STRICT
            actual_body_md5,
            actual_owner,
            actual_definer,
            actual_path
        FROM pg_proc AS p WHERE p.oid = f;

        normalized_path := regexp_replace(
            lower(COALESCE(actual_path, '')),
            '[[:space:]]+', '', 'g'
        );

        IF actual_body_md5 IS DISTINCT FROM r.body_md5 THEN
            RAISE EXCEPTION 'AYZO_SAFE_STOP: function body drift: %', r.signature;
        END IF;
        IF actual_owner IS DISTINCT FROM 'postgres'
           OR actual_definer IS DISTINCT FROM true THEN
            RAISE EXCEPTION 'AYZO_SAFE_STOP: function privilege model drift: %', r.signature;
        END IF;
        IF normalized_path NOT IN (
            'search_path=public',
            'search_path=pg_catalog,pg_temp'
        ) THEN
            RAISE EXCEPTION 'AYZO_SAFE_STOP: unexpected search_path: %', r.signature;
        END IF;
        IF has_function_privilege('anon', f, 'EXECUTE')
           OR has_function_privilege('authenticated', f, 'EXECUTE')
           OR NOT has_function_privilege('service_role', f, 'EXECUTE') THEN
            RAISE EXCEPTION 'AYZO_SAFE_STOP: EXECUTE privileges drift: %', r.signature;
        END IF;
        RAISE NOTICE 'AYZO_SOURCE_GATE_PASS: %', r.signature;
    END LOOP;

    -- Signatures are STATIC values above, never received from an application user.
    FOR r IN
        SELECT signature FROM (VALUES
            ('public.ayzo_bootstrap_account_device(uuid,text,text,text,text)'),
            ('public.ayzo_register_account_device(uuid,text,text,text,text)'),
            ('public.ayzo_revoke_account_device(uuid,text,text)'),
            ('public.ayzo_touch_account_device(uuid,text)')
        ) AS approved(signature)
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %s SET search_path = pg_catalog, pg_temp',
            r.signature
        );
    END LOOP;

    -- Check the final configuration and the preserved invocation permissions.
    FOR r IN
        SELECT signature FROM (VALUES
            ('public.ayzo_bootstrap_account_device(uuid,text,text,text,text)'),
            ('public.ayzo_register_account_device(uuid,text,text,text,text)'),
            ('public.ayzo_revoke_account_device(uuid,text,text)'),
            ('public.ayzo_touch_account_device(uuid,text)')
        ) AS approved(signature)
    LOOP
        f := to_regprocedure(r.signature);
        IF f IS NULL THEN
            RAISE EXCEPTION 'AYZO_SAFE_STOP: function missing post-ALTER: %', r.signature;
        END IF;

        SELECT
            (SELECT cfg FROM unnest(p.proconfig) AS cfg
             WHERE cfg LIKE 'search_path=%' LIMIT 1),
            pg_get_userbyid(p.proowner),
            p.prosecdef
        INTO STRICT actual_path, actual_owner, actual_definer
        FROM pg_proc AS p WHERE p.oid = f;

        normalized_path := regexp_replace(
            lower(COALESCE(actual_path, '')),
            '[[:space:]]+', '', 'g'
        );
        IF normalized_path <> 'search_path=pg_catalog,pg_temp'
           OR actual_owner IS DISTINCT FROM 'postgres'
           OR actual_definer IS DISTINCT FROM true
           OR has_function_privilege('anon', f, 'EXECUTE')
           OR has_function_privilege('authenticated', f, 'EXECUTE')
           OR NOT has_function_privilege('service_role', f, 'EXECUTE') THEN
            RAISE EXCEPTION 'AYZO_SAFE_STOP: post-ALTER verification failed: %', r.signature;
        END IF;
        RAISE NOTICE 'AYZO_POSTCHECK_PASS: %', r.signature;
    END LOOP;

    RAISE NOTICE 'AYZO_PHASE22956_SECURITY_MIGRATION: PASS_4';
END;
$ayzo_phase22956$;
