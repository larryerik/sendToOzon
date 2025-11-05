-- 数据库表结构定义

-- 发货计划主表
CREATE TABLE IF NOT EXISTS public.shipping_plans (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    name text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shipping_plans_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 计划产品表
CREATE TABLE IF NOT EXISTS public.plan_products (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    plan_id uuid NOT NULL,
    sku text NOT NULL,
    ozon_id text NOT NULL,
    box_count integer NOT NULL DEFAULT 0,
    items_per_box integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_products_pkey PRIMARY KEY (id),
    CONSTRAINT plan_products_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES shipping_plans(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 计划集群表
CREATE TABLE IF NOT EXISTS public.plan_clusters (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    plan_id uuid NOT NULL,
    cluster_id integer NOT NULL,
    cluster_name text NOT NULL,
    shipping_point text,
    pallets integer NOT NULL DEFAULT 0,
    pallet_allocations jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_clusters_pkey PRIMARY KEY (id),
    CONSTRAINT plan_clusters_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES shipping_plans(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 计划分配表
CREATE TABLE IF NOT EXISTS public.plan_allocations (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    plan_id uuid NOT NULL,
    cluster_id uuid NOT NULL,
    product_id uuid NOT NULL,
    boxes integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_allocations_pkey PRIMARY KEY (id),
    CONSTRAINT plan_allocations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES shipping_plans(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 索引
CREATE INDEX IF NOT EXISTS idx_shipping_plans_user_id ON public.shipping_plans USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_plan_products_plan_id ON public.plan_products USING btree (plan_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_plan_clusters_plan_id ON public.plan_clusters USING btree (plan_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_plan_allocations_plan_id ON public.plan_allocations USING btree (plan_id) TABLESPACE pg_default;

-- 更新时间触发器函数
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新时间触发器
DROP TRIGGER IF EXISTS trigger_update_shipping_plans_updated_at ON public.shipping_plans;
CREATE TRIGGER trigger_update_shipping_plans_updated_at 
    BEFORE UPDATE ON public.shipping_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS trigger_update_plan_products_updated_at ON public.plan_products;
CREATE TRIGGER trigger_update_plan_products_updated_at 
    BEFORE UPDATE ON public.plan_products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS trigger_update_plan_clusters_updated_at ON public.plan_clusters;
CREATE TRIGGER trigger_update_plan_clusters_updated_at 
    BEFORE UPDATE ON public.plan_clusters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS trigger_update_plan_allocations_updated_at ON public.plan_allocations;
CREATE TRIGGER trigger_update_plan_allocations_updated_at 
    BEFORE UPDATE ON public.plan_allocations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();