"""Pagination utilities."""

from typing import TypeVar, Generic, List
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: List[T]
    total: int
    page: int
    pages: int
    per_page: int


def paginate(query, page: int = 1, per_page: int = 10):
    """Apply pagination to a SQLAlchemy query."""
    total = query.count()
    pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return items, total, pages