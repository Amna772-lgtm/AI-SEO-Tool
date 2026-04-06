import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator

from app.dependencies.auth import get_current_user
from app.store.history_store import (
    create_schedule,
    delete_schedule,
    get_schedule,
    list_schedules,
    mark_schedule_ran,
    update_schedule,
)
from app.store.crawl_store import set_meta
from app.analyzers.robots import check_robots
from app.utils.url_validator import validate_and_normalize_url, URLValidationError
from app.worker.tasks import process_site

router = APIRouter()


class CreateScheduleRequest(BaseModel):
    url: str
    frequency: Literal["daily", "weekly", "monthly"]
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int | None = Field(None, ge=0, le=6)
    day_of_month: int | None = Field(None, ge=1, le=31)

    @model_validator(mode="after")
    def check_day_fields(self):
        if self.frequency == "weekly" and self.day_of_week is None:
            raise ValueError("day_of_week is required for weekly frequency")
        if self.frequency == "monthly" and self.day_of_month is None:
            raise ValueError("day_of_month is required for monthly frequency")
        return self


class UpdateScheduleRequest(BaseModel):
    frequency: Literal["daily", "weekly", "monthly"] | None = None
    hour: int | None = Field(None, ge=0, le=23)
    day_of_week: int | None = Field(None, ge=0, le=6)
    day_of_month: int | None = Field(None, ge=1, le=31)
    enabled: bool | None = None


@router.post("/", status_code=201)
def create(
    body: CreateScheduleRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    try:
        normalized_url = validate_and_normalize_url(body.url)
    except URLValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return create_schedule(
        normalized_url,
        body.frequency,
        body.hour,
        body.day_of_week,
        body.day_of_month,
        user_id=current_user["id"],
    )


@router.get("/")
def list_all(
    domain: str | None = Query(None),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return {"schedules": list_schedules(user_id=current_user["id"], domain=domain)}


@router.get("/{schedule_id}")
def get_one(
    schedule_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    s = get_schedule(schedule_id, user_id=current_user["id"])
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return s


@router.patch("/{schedule_id}")
def edit(
    schedule_id: str,
    body: UpdateScheduleRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    updated = update_schedule(
        schedule_id,
        current_user["id"],
        **body.model_dump(exclude_none=True),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return updated


@router.delete("/{schedule_id}", status_code=204)
def remove(
    schedule_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    if not delete_schedule(schedule_id, user_id=current_user["id"]):
        raise HTTPException(status_code=404, detail="Schedule not found")


@router.post("/{schedule_id}/trigger", status_code=202)
def trigger(
    schedule_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Immediately dispatch process_site for this schedule."""
    s = get_schedule(schedule_id, user_id=current_user["id"])
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Always advance the timer first to avoid retry spam on robots blocks
    mark_schedule_ran(schedule_id)

    robots_result = check_robots(s["url"])
    if not robots_result["crawl_allowed"]:
        return {"status": "skipped", "reason": "robots_disallowed", "site_id": None}

    task_id = str(uuid.uuid4())
    set_meta(task_id, {
        "id": task_id,
        "url": s["url"],
        "status": "queued",
        "robots_allowed": True,
        "ai_crawler_access": robots_result.get("ai_crawler_access"),
        "disallowed_paths": robots_result.get("disallowed_paths", []),
        "triggered_by_schedule": schedule_id,
        "user_id": current_user["id"],
    })
    process_site.delay(
        s["url"],
        task_id,
        robots_allowed=True,
        ai_crawler_access=robots_result.get("ai_crawler_access"),
    )
    return {"status": "queued", "site_id": task_id}
