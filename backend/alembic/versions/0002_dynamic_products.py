"""add orders and order items

Revision ID: 0003_add_orders_and_order_items
Revises: 0002_dynamic_products
Create Date: 2026-09-12 22:46:43.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003_add_orders_and_order_items'
down_revision = '0002_dynamic_products'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create orders table
    op.create_table(
        'orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.String(), server_default='PENDING', nullable=True),
        sa.Column('payment_status', sa.String(), server_default='PENDING', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_orders_id'), 'orders', ['id'], unique=False)
    op.create_index(op.f('ix_orders_user_id'), 'orders', ['user_id'], unique=False)
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)
    op.create_index(op.f('ix_orders_payment_status'), 'orders', ['payment_status'], unique=False)

    # 2. Create order_items table
    op.create_table(
        'order_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('variant_id', sa.Integer(), nullable=False),
        sa.Column('product_key_id', sa.Integer(), nullable=True),
        sa.Column('price_at_purchase', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('product_name_snapshot', sa.String(), nullable=False),
        sa.Column('variant_name_snapshot', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_key_id'], ['product_keys.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['variant_id'], ['product_variants.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_key_id', name='uq_order_items_product_key_id')
    )
    op.create_index(op.f('ix_order_items_id'), 'order_items', ['id'], unique=False)
    op.create_index(op.f('ix_order_items_order_id'), 'order_items', ['order_id'], unique=False)
    op.create_index(op.f('ix_order_items_variant_id'), 'order_items', ['variant_id'], unique=False)

    # 3. Add order_id to product_keys table
    op.add_column('product_keys', sa.Column('order_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_product_keys_order_id_orders', 'product_keys', 'orders', ['order_id'], ['id'])
    op.create_index(op.f('ix_product_keys_order_id'), 'product_keys', ['order_id'], unique=False)
    
    # 4. Add composite index on product_keys (variant_id, is_sold)
    op.create_index('ix_product_keys_variant_sold', 'product_keys', ['variant_id', 'is_sold'], unique=False)


def downgrade() -> None:
    # 1. Reverse changes on product_keys table
    op.drop_index('ix_product_keys_variant_sold', table_name='product_keys')
    op.drop_index(op.f('ix_product_keys_order_id'), table_name='product_keys')
    op.drop_constraint('fk_product_keys_order_id_orders', 'product_keys', type_='foreignkey')
    op.drop_column('product_keys', 'order_id')

    # 2. Reverse order_items table
    op.drop_index(op.f('ix_order_items_variant_id'), table_name='order_items')
    op.drop_index(op.f('ix_order_items_order_id'), table_name='order_items')
    op.drop_index(op.f('ix_order_items_id'), table_name='order_items')
    op.drop_table('order_items')

    # 3. Reverse orders table
    op.drop_index(op.f('ix_orders_payment_status'), table_name='orders')
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_index(op.f('ix_orders_user_id'), table_name='orders')
    op.drop_index(op.f('ix_orders_id'), table_name='orders')
    op.drop_table('orders')
