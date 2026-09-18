"""add financial constraints and idempotency

Revision ID: 0009_add_financial_constraints
Revises: 0008_add_payment_currency
Create Date: 2026-09-18 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0009_add_financial_constraints'
down_revision = '0008_add_payment_currency'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add balance to vendor_profiles with server_default for existing rows
    op.add_column(
        'vendor_profiles', 
        sa.Column('balance', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False)
    )
    
    # 2. Add CheckConstraints to prevent double-spending at DB layer
    op.create_check_constraint(
        'check_vendor_balance_positive', 
        'vendor_profiles', 
        'balance >= 0'
    )
    op.create_check_constraint(
        'check_wallet_balance_positive', 
        'wallets', 
        'balance >= 0'
    )

    # 3. Add idempotency_key to orders (nullable=True for existing rows)
    op.add_column(
        'orders', 
        sa.Column('idempotency_key', sa.String(), nullable=True)
    )
    op.create_index(op.f('ix_orders_idempotency_key'), 'orders', ['idempotency_key'], unique=True)


def downgrade() -> None:
    # 1. Revert orders changes
    op.drop_index(op.f('ix_orders_idempotency_key'), table_name='orders')
    op.drop_column('orders', 'idempotency_key')
    
    # 2. Revert constraints
    op.drop_constraint('check_wallet_balance_positive', 'wallets', type_='check')
    op.drop_constraint('check_vendor_balance_positive', 'vendor_profiles', type_='check')
    
    # 3. Revert vendor_profiles changes
    op.drop_column('vendor_profiles', 'balance')
