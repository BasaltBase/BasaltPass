from typing import Optional

class ApiError(Exception):
    def __init__(self, code: Optional[str], message: str, *, status: Optional[int] = None, request_id: Optional[str] = None):
        super().__init__(f"{code or 'http_error'}: {message}")
        self.code = code
        self.message = message
        self.status = status
        self.request_id = request_id

    def __str__(self) -> str:  # pragma: no cover
        rid = f" request_id={self.request_id}" if self.request_id else ""
        code = self.code or "http_error"
        return f"ApiError({code}, status={self.status}): {self.message}{rid}"
