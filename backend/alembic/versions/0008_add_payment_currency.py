"""add currency to payments

Revision ID: 0008_add_payment_currency
Revises: 0007_add_payment_methods
Create Date: 2026-09-13 15:35:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0008_add_payment_currency'
down_revision = '0007_add_payment_methods'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add the currency column as nullable=True to safely handle existing rows
    # without guessing or backfilling unknown currency values.
    # The application model will enforce currency requirements for new records.
    op.add_column(
        'payments',
        sa.Column('currency', sa.String(length=3), nullable=True)
    )


def downgrade() -> None:
    # Safely remove the currency column
    op.drop_column('payments', 'currency')
