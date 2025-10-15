"""make users.hashed_password nullable

Revision ID: 9e51272869cb
Revises: be54f05039a1
Create Date: 2025-08-28 14:24:24.480651

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e51272869cb'
down_revision: Union[str, Sequence[str], None] = 'be54f05039a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column("users", "hashed_password", existing_type=sa.String(), nullable=True)

def downgrade():
    op.alter_column("users", "hashed_password", existing_type=sa.String(), nullable=False)
