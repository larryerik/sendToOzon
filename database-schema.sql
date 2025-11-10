    -- 数据库表结构定义
    -- SendToOzon 发货计划管理系统

    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


    -- 发货计划主表
    CREATE TABLE IF NOT EXISTS public.shipping_plans (
        id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        name text NOT NULL,
        status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculating', 'ready', 'submitted', 'shipped', 'cancelled')),
        user_id uuid NOT NULL,
        planned_ship_date date,
        total_boxes integer NOT NULL DEFAULT 0 CHECK (total_boxes >= 0),
        total_skus integer NOT NULL DEFAULT 0 CHECK (total_skus >= 0),
        submitted_at timestamptz,
        sync_reference text,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT shipping_plans_user_name_unique UNIQUE (user_id, name)
    ) TABLESPACE pg_default;

    -- 计划产品表
    CREATE TABLE IF NOT EXISTS public.plan_products (
        id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        plan_id uuid NOT NULL REFERENCES shipping_plans(id) ON DELETE CASCADE,
        sku text NOT NULL,
        ozon_id text,
        product_name text,
        box_count integer NOT NULL DEFAULT 0 CHECK (box_count >= 0),
        items_per_box integer NOT NULL DEFAULT 1 CHECK (items_per_box > 0),
        total_items integer GENERATED ALWAYS AS (box_count * items_per_box) STORED,
        weight_kg numeric(10, 2),
        volume_cbm numeric(10, 4),
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT plan_products_plan_sku_unique UNIQUE (plan_id, sku)
    ) TABLESPACE pg_default;

    -- 计划集群表
    CREATE TABLE IF NOT EXISTS public.plan_clusters (
        id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        plan_id uuid NOT NULL REFERENCES shipping_plans(id) ON DELETE CASCADE,
        cluster_id bigint,
        cluster_code text,
        cluster_name text NOT NULL,
        shipping_point_id bigint REFERENCES shipping_points(id),
        shipping_point text,
        pallets integer NOT NULL DEFAULT 0 CHECK (pallets >= 0),
        pallet_allocations jsonb,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT plan_clusters_plan_cluster_unique UNIQUE (plan_id, cluster_id)
    ) TABLESPACE pg_default;

    -- 计划分配表
    CREATE TABLE IF NOT EXISTS public.plan_allocations (
        id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        plan_id uuid NOT NULL REFERENCES shipping_plans(id) ON DELETE CASCADE,
        cluster_id uuid NOT NULL REFERENCES plan_clusters(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES plan_products(id) ON DELETE CASCADE,
        boxes integer NOT NULL DEFAULT 0 CHECK (boxes >= 0),
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT plan_allocations_unique UNIQUE (plan_id, cluster_id, product_id)
    ) TABLESPACE pg_default;

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_products_sku_cluster ON public.products USING btree (sku, lower(coalesce(cluster, '')));
    CREATE INDEX IF NOT EXISTS idx_shipping_plans_user_id ON public.shipping_plans USING btree (user_id);
    CREATE INDEX IF NOT EXISTS idx_shipping_plans_status ON public.shipping_plans USING btree (status);
    CREATE INDEX IF NOT EXISTS idx_plan_products_plan_id ON public.plan_products USING btree (plan_id);
    CREATE INDEX IF NOT EXISTS idx_plan_products_plan_sku ON public.plan_products USING btree (plan_id, sku);
    CREATE INDEX IF NOT EXISTS idx_plan_clusters_plan_id ON public.plan_clusters USING btree (plan_id);
    CREATE INDEX IF NOT EXISTS idx_plan_clusters_plan_cluster ON public.plan_clusters USING btree (plan_id, cluster_id);
    CREATE INDEX IF NOT EXISTS idx_plan_allocations_plan_cluster_product ON public.plan_allocations USING btree (plan_id, cluster_id, product_id);

    -- 更新时间触发器函数
    CREATE OR REPLACE FUNCTION public.update_modified_column()
    RETURNS trigger AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- 更新时间触发器
    DROP TRIGGER IF EXISTS trigger_update_products ON public.products;
    CREATE TRIGGER trigger_update_products
        BEFORE UPDATE ON public.products
        FOR EACH ROW
        EXECUTE FUNCTION public.update_modified_column();

    DROP TRIGGER IF EXISTS trigger_update_shipping_plans ON public.shipping_plans;
    CREATE TRIGGER trigger_update_shipping_plans
        BEFORE UPDATE ON public.shipping_plans
        FOR EACH ROW
        EXECUTE FUNCTION public.update_modified_column();

    DROP TRIGGER IF EXISTS trigger_update_plan_products ON public.plan_products;
    CREATE TRIGGER trigger_update_plan_products
        BEFORE UPDATE ON public.plan_products
        FOR EACH ROW
        EXECUTE FUNCTION public.update_modified_column();

    DROP TRIGGER IF EXISTS trigger_update_plan_clusters ON public.plan_clusters;
    CREATE TRIGGER trigger_update_plan_clusters
        BEFORE UPDATE ON public.plan_clusters
        FOR EACH ROW
        EXECUTE FUNCTION public.update_modified_column();

    DROP TRIGGER IF EXISTS trigger_update_plan_allocations ON public.plan_allocations;
    CREATE TRIGGER trigger_update_plan_allocations
        BEFORE UPDATE ON public.plan_allocations
        FOR EACH ROW
        EXECUTE FUNCTION public.update_modified_column();
