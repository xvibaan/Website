"""add wallet and vendor finance

Revision ID: 0005_add_wallet_and_vendor_finance
Revises: 0004_add_variant_pricing_fields
Create Date: 2026-09-13 08:15:10.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0005_add_wallet_and_vendor_finance'
down_revision = '0004_add_variant_pricing_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create wallets table
    op.create_table(
        'wallets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('balance', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_wallets_id'), 'wallets', ['id'], unique=False)
    op.create_index(op.f('ix_wallets_user_id'), 'wallets', ['user_id'], unique=True)

    # 2. Create wallet_transactions table
    op.create_table(
        'wallet_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wallet_id', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('balance_before', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('balance_after', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('reference_type', sa.String(), nullable=True),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wallet_transactions_id'), 'wallet_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_wallet_transactions_reference_id'), 'wallet_transactions', ['reference_id'], unique=False)
    op.create_index(op.f('ix_wallet_transactions_reference_type'), 'wallet_transactions', ['reference_type'], unique=False)
    op.create_index(op.f('ix_wallet_transactions_transaction_type'), 'wallet_transactions', ['transaction_type'], unique=False)
    op.create_index(op.f('ix_wallet_transactions_wallet_id'), 'wallet_transactions', ['wallet_id'], unique=False)

    # 3. Create vendor_profiles table
    op.create_table(
        'vendor_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('business_name', sa.String(), nullable=False),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_vendor_profiles_id'), 'vendor_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_vendor_profiles_user_id'), 'vendor_profiles', ['user_id'], unique=True)

    # 4. Create vendor_transactions table
    op.create_table(
        'vendor_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('balance_before', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('balance_after', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('reference_type', sa.String(), nullable=True),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendor_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vendor_transactions_id'), 'vendor_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_vendor_transactions_reference_id'), 'vendor_transactions', ['reference_id'], unique=False)
    op.create_index(op.f('ix_vendor_transactions_reference_type'), 'vendor_transactions', ['reference_type'], unique=False)
    op.create_index(op.f('ix_vendor_transactions_transaction_type'), 'vendor_transactions', ['transaction_type'], unique=False)
    op.create_index(op.f('ix_vendor_transactions_vendor_id'), 'vendor_transactions', ['vendor_id'], unique=False)

    # 5. Create payouts table
    op.create_table(
        'payouts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('status', sa.String(), server_default='PENDING', nullable=False),
        sa.Column('payout_method', sa.String(), nullable=True),
        sa.Column('external_reference', sa.String(), nullable=True),
        sa.Column('idempotency_key', sa.String(), nullable=True),
        sa.Column('failure_reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendor_profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key')
    )
    op.create_index(op.f('ix_payouts_external_reference'), 'payouts', ['external_reference'], unique=False)
    op.create_index(op.f('ix_payouts_id'), 'payouts', ['id'], unique=False)
    op.create_index(op.f('ix_payouts_idempotency_key'), 'payouts', ['idempotency_key'], unique=True)
    op.create_index(op.f('ix_payouts_status'), 'payouts', ['status'], unique=False)
    op.create_index(op.f('ix_payouts_vendor_id'), 'payouts', ['vendor_id'], unique=False)


def downgrade() -> None:
    # 1. Drop payouts
    op.drop_index(op.f('ix_payouts_vendor_id'), table_name='payouts')
    op.drop_index(op.f('ix_payouts_status'), table_name='payouts')
    op.drop_index(op.f('ix_payouts_idempotency_key'), table_name='payouts')
    op.drop_index(op.f('ix_payouts_id'), table_name='payouts')
    op.drop_index(op.f('ix_payouts_external_reference'), table_name='payouts')
    op.drop_table('payouts')

    # 2. Drop vendor_transactions
    op.drop_index(op.f('ix_vendor_transactions_vendor_id'), table_name='vendor_transactions')
    op.drop_index(op.f('ix_vendor_transactions_transaction_type'), table_name='vendor_transactions')
    op.drop_index(op.f('ix_vendor_transactions_reference_type'), table_name='vendor_transactions')
    op.drop_index(op.f('ix_vendor_transactions_reference_id'), table_name='vendor_transactions')
    op.drop_index(op.f('ix_vendor_transactions_id'), table_name='vendor_transactions')
    op.drop_table('vendor_transactions')

    # 3. Drop vendor_profiles
    op.drop_index(op.f('ix_vendor_profiles_user_id'), table_name='vendor_profiles')
    op.drop_index(op.f('ix_vendor_profiles_id'), table_name='vendor_profiles')
    op.drop_table('vendor_profiles')

    # 4. Drop wallet_transactions
    op.drop_index(op.f('ix_wallet_transactions_wallet_id'), table_name='wallet_transactions')
    op.drop_index(op.f('ix_wallet_transactions_transaction_type'), table_name='wallet_transactions')
    op.drop_index(op.f('ix_wallet_transactions_reference_type'), table_name='wallet_transactions')
    op.drop_index(op.f('ix_wallet_transactions_reference_id'), table_name='wallet_transactions')
    op.drop_index(op.f('ix_wallet_transactions_id'), table_name='wallet_transactions')
    op.drop_table('wallet_transactions')

    # 5. Drop wallets
    op.drop_index(op.f('ix_wallets_user_id'), table_name='wallets')
    op.drop_index(op.f('ix_wallets_id'), table_name='wallets')
    op.drop_table('wallets')
