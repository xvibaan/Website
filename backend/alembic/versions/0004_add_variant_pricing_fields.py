"""add variant pricing fields

Revision ID: 0004_add_variant_pricing_fields
Revises: 0003_add_orders_and_order_items
Create Date: 2026-09-13 00:37:17.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0004_add_variant_pricing_fields'
down_revision = '0003_add_orders_and_order_items'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Rename product_variants.price to selling_price
    op.alter_column(
        'product_variants',
        'price',
        new_column_name='selling_price',
        existing_type=sa.Numeric(precision=12, scale=2),
        existing_nullable=False
    )

    # 2. Add product_variants.vendor_cost
    op.add_column(
        'product_variants',
        sa.Column('vendor_cost', sa.Numeric(precision=12, scale=2), nullable=True)
    )

    # 3. Alter orders.total_amount precision from (10, 2) to (12, 2)
    op.alter_column(
        'orders',
        'total_amount',
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Numeric(precision=12, scale=2),
        existing_nullable=False
    )

    # 4. Alter order_items.price_at_purchase precision from (10, 2) to (12, 2)
    op.alter_column(
        'order_items',
        'price_at_purchase',
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Numeric(precision=12, scale=2),
        existing_nullable=False
    )

    # 5. Add order_items.vendor_cost_snapshot
    op.add_column(
        'order_items',
        sa.Column('vendor_cost_snapshot', sa.Numeric(precision=12, scale=2), nullable=True)
    )

    # 6. Add order_items.platform_profit_snapshot
    op.add_column(
        'order_items',
        sa.Column('platform_profit_snapshot', sa.Numeric(precision=12, scale=2), nullable=True)
    )


def downgrade() -> None:
    # 1. Drop order_items.platform_profit_snapshot
    op.drop_column('order_items', 'platform_profit_snapshot')

    # 2. Drop order_items.vendor_cost_snapshot
    op.drop_column('order_items', 'vendor_cost_snapshot')

    # 3. Revert order_items.price_at_purchase precision back to (10, 2)
    op.alter_column(
        'order_items',
        'price_at_purchase',
        existing_type=sa.Numeric(precision=12, scale=2),
        type_=sa.Numeric(precision=10, scale=2),
        existing_nullable=False
    )

    # 4. Revert orders.total_amount precision back to (10, 2)
    op.alter_column(
        'orders',
        'total_amount',
        existing_type=sa.Numeric(precision=12, scale=2),
        type_=sa.Numeric(precision=10, scale=2),
        existing_nullable=False
    )

    # 5. Drop product_variants.vendor_cost
    op.drop_column('product_variants', 'vendor_cost')

    # 6. Rename product_variants.selling_price back to price
    op.alter_column(
        'product_variants',
        'selling_price',
        new_column_name='price',
        existing_type=sa.Numeric(precision=12, scale=2),
        existing_nullable=False
    )
