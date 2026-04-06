from pydantic import BaseModel, field_validator

from app.utils.url_validator import validate_and_normalize_url, URLValidationError


class AnalyzeRequest(BaseModel):
    url: str

    @field_validator("url", mode="before")
    @classmethod
    def validate_and_normalize_url_field(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            raise ValueError("URL must be a non-empty string")
        try:
            return validate_and_normalize_url(v)
        except URLValidationError as e:
            raise ValueError(str(e))