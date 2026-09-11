Explanation of Data Handling
 * Price Migration (products.price):
   Before the price column is dropped from the products table, the migration will execute an SQL script to copy every existing product's ID and price into the new product_variants table. It will automatically assign a default duration of "Standard" to these legacy products so they continue to function correctly in the new system.
 * File URL Handling (products.file_url):
   The file_url column is intentionally removed. Under the new architecture, digital assets are securely delivered as unique, individual database entries via the product_keys table rather than a static URL. General panel updates and tutorials have been replaced by the dynamic tg_update_url and tg_video_url columns.
 * Downgrade Safety:
   If you ever need to rollback this migration, the downgrade script restores the price column and populates it by extracting the lowest price from the associated product_variants.
Here is the revised migration file that includes safe data migration logic:
Exact File Path: backend/alembic/versions/0002_dynamic_products.py
"""dynamic products variants and keys with data migration

Revision ID: 0002_dynamic_products
Revises: 0001_initial_migration
Create Date: 2026-09-11 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_dynamic_products'
down_revision: Union[str, None] = '0001_initial_migration'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create product_variants table
    op.create_table('product_variants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('config_name', sa.String(), nullable=True),
        sa.Column('duration', sa.String(), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_variants_id'), 'product_variants', ['id'], unique=False)

    # 2. Create product_keys table
    op.create_table('product_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('variant_id', sa.Integer(), nullable=False),
        sa.Column('key_value', sa.String(), nullable=False),
        sa.Column('is_sold', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.Column('sold_to_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['sold_to_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['variant_id'], ['product_variants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_value')
    )
    op.create_index(op.f('ix_product_keys_id'), 'product_keys', ['id'], unique=False)

    # 3. Add new columns and modify description in products table
    op.add_column('products', sa.Column('image_url', sa.String(), nullable=True))
    op.add_column('products', sa.Column('tg_update_url', sa.String(), nullable=True))
    op.add_column('products', sa.Column('tg_video_url', sa.String(), nullable=True))
    
    op.alter_column('products', 'description',
               existing_type=sa.String(),
               type_=sa.Text(),
               existing_nullable=True)
               
    # 4. DATA MIGRATION: Move existing product prices into product_variants
    # This prevents data loss for previously created products
    op.execute(
        """
        INSERT INTO product_variants (product_id, duration, price, is_active)
        SELECT id, 'Standard', price, is_active FROM products
        """
    )
               
    # 5. Safely drop the old columns now that data is migrated
    op.drop_column('products', 'price')
    op.drop_column('products', 'file_url')


def downgrade() -> None:
    # 1. Re-add old columns with server defaults to satisfy NOT NULL constraints
    op.add_column('products', sa.Column('file_url', sa.String(), server_default='legacy_no_url', nullable=False))
    op.add_column('products', sa.Column('price', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False))
    
    # 2. DATA MIGRATION RECOVERY: Extract the lowest price from variants back into the products table
    op.execute(
        """
        UPDATE products
        SET price = v.price
        FROM (
            SELECT product_id, MIN(price) AS price
            FROM product_variants
            GROUP BY product_id
        ) AS v
        WHERE products.id = v.product_id
        """
    )
    
    # 3. Revert products table schema changes
    op.alter_column('products', 'description',
               existing_type=sa.Text(),
               type_=sa.String(),
               existing_nullable=True)
               
    op.drop_column('products', 'tg_video_url')
    op.drop_column('products', 'tg_update_url')
    op.drop_column('products', 'image_url')

    # 4. Drop new tables (must drop product_keys before product_variants due to FKs)
    op.drop_index(op.f('ix_product_keys_id'), table_name='product_keys')
    op.drop_table('product_keys')

    op.drop_index(op.f('ix_product_variants_id'), table_name='product_variants')
    op.drop_table('product_variants')

