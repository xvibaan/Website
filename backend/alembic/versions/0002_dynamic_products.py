"""dynamic products

Revision ID: 0002_dynamic_products
Revises: 0001_initial_migration
Create Date: 2026-09-12 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002_dynamic_products'
down_revision = '0001_initial_migration'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Alter products table
    op.add_column('products', sa.Column('image_url', sa.String(), nullable=True))
    op.add_column('products', sa.Column('tg_update_url', sa.String(), nullable=True))
    op.add_column('products', sa.Column('tg_video_url', sa.String(), nullable=True))
    
    op.drop_column('products', 'price')
    op.drop_column('products', 'file_url')

    # 2. Create product_variants table
    op.create_table(
        'product_variants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('config_name', sa.String(), nullable=True),
        sa.Column('duration', sa.String(), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_variants_id'), 'product_variants', ['id'], unique=False)
    op.create_index(op.f('ix_product_variants_product_id'), 'product_variants', ['product_id'], unique=False)

    # 3. Create product_keys table
    op.create_table(
        'product_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('variant_id', sa.Integer(), nullable=False),
        sa.Column('key_value', sa.String(), nullable=False),
        sa.Column('is_sold', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('sold_to_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['sold_to_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['variant_id'], ['product_variants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_keys_id'), 'product_keys', ['id'], unique=False)
    op.create_index(op.f('ix_product_keys_is_sold'), 'product_keys', ['is_sold'], unique=False)
    op.create_index(op.f('ix_product_keys_key_value'), 'product_keys', ['key_value'], unique=True)
    op.create_index(op.f('ix_product_keys_sold_to_user_id'), 'product_keys', ['sold_to_user_id'], unique=False)
    op.create_index(op.f('ix_product_keys_variant_id'), 'product_keys', ['variant_id'], unique=False)


def downgrade() -> None:
    # 1. Drop product_keys table
    op.drop_index(op.f('ix_product_keys_variant_id'), table_name='product_keys')
    op.drop_index(op.f('ix_product_keys_sold_to_user_id'), table_name='product_keys')
    op.drop_index(op.f('ix_product_keys_key_value'), table_name='product_keys')
    op.drop_index(op.f('ix_product_keys_is_sold'), table_name='product_keys')
    op.drop_index(op.f('ix_product_keys_id'), table_name='product_keys')
    op.drop_table('product_keys')

    # 2. Drop product_variants table
    op.drop_index(op.f('ix_product_variants_product_id'), table_name='product_variants')
    op.drop_index(op.f('ix_product_variants_id'), table_name='product_variants')
    op.drop_table('product_variants')

    # 3. Restore products table
    op.add_column('products', sa.Column('file_url', sa.String(), nullable=True))
    op.add_column('products', sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=True))
    
    op.drop_column('products', 'tg_video_url')
    op.drop_column('products', 'tg_update_url')
    op.drop_column('products', 'image_url')
