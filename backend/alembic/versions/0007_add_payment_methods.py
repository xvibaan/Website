"""add payment methods

Revision ID: 0007_add_payment_methods
Revises: 0006_add_payments
Create Date: 2026-09-13 08:54:11.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0007_add_payment_methods'
down_revision = '0006_add_payments'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create payment_methods table
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('method_type', sa.String(), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_methods_id'), 'payment_methods', ['id'], unique=False)
    op.create_index(op.f('ix_payment_methods_is_active'), 'payment_methods', ['is_active'], unique=False)
    op.create_index(op.f('ix_payment_methods_display_order'), 'payment_methods', ['display_order'], unique=False)


def downgrade() -> None:
    # 1. Drop payment_methods table and its indexes
    op.drop_index(op.f('ix_payment_methods_display_order'), table_name='payment_methods')
    op.drop_index(op.f('ix_payment_methods_is_active'), table_name='payment_methods')
    op.drop_index(op.f('ix_payment_methods_id'), table_name='payment_methods')
    op.drop_table('payment_methods')
