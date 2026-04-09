# import os

# from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
# from sqlalchemy.orm import Session
# from database import SessionLocal
# import models
# from utils.cloudinary_upload import upload_image
# from utils.email import send_email

# router = APIRouter()

# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# @router.post("/tickets")
# def create_ticket(title: str, description: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
#     try:
#         image_url = upload_image(file.file)
#     except Exception as error:
#         raise HTTPException(status_code=400, detail=f"Image upload failed: {error}")

#     ticket = models.Ticket(
#         title=title,
#         description=description,
#         image_url=image_url
#     )

#     db.add(ticket)
#     db.commit()
#     db.refresh(ticket)

#     council_email = os.getenv("COUNCIL_EMAIL", "council@gmail.com")
#     try:
#         send_email(
#             council_email,
#             "New Ticket Created",
#             f"{title}\n{description}\n{image_url}"
#         )
#     except Exception:
#         pass

#     return ticket

# @router.get("/tickets")
# def get_tickets(db: Session = Depends(get_db)):
#     return db.query(models.Ticket).all()




from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, Request
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from utils.cloudinary_upload import upload_image
from utils.email import send_email
import os
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from pydantic import BaseModel, Field

router = APIRouter()


def get_escalation_days() -> int:
    raw_value = os.getenv("ESCALATION_DAYS", "2").strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        return 2
    if parsed < 1:
        return 2
    return parsed


ESCALATION_DAYS = get_escalation_days()
DUPLICATE_SCORE_THRESHOLD = float(os.getenv("DUPLICATE_SCORE_THRESHOLD", "0.75"))

STATUS_MAP = {
    "pending": "Pending",
    "in progress": "In Progress",
    "in-progress": "In Progress",
    "resolved": "Resolved",
    "done": "Resolved",
}


def normalize_category(category: str) -> str:
    return (category or "General").strip().lower()


def get_council_for_category(category: str) -> tuple[str, str]:
    fallback_email = os.getenv("COUNCIL_EMAIL", "council@gmail.com")
    fallback_name = os.getenv("COUNCIL_DEFAULT_NAME", "Facility Incharge")

    mapping = {
        "discipline": ("Discipline Incharge", os.getenv("COUNCIL_DISCIPLINE_EMAIL", fallback_email)),
        "english": ("English Facilitator", os.getenv("COUNCIL_ENGLISH_EMAIL", fallback_email)),
        "life skill": ("Life Skill Coach", os.getenv("COUNCIL_LIFESKILL_EMAIL", fallback_email)),
        "placement": ("Placement Specialist", os.getenv("COUNCIL_PLACEMENT_EMAIL", fallback_email)),
        "it": ("IT Facilitator", os.getenv("COUNCIL_IT_EMAIL", fallback_email)),
        "facility": ("Facility Incharge", os.getenv("COUNCIL_FACILITY_EMAIL", fallback_email)),
        "event": ("Event & Outreach Facilitator", os.getenv("COUNCIL_EVENT_EMAIL", fallback_email)),
        "safety": ("Safety & Workout Coordinator", os.getenv("COUNCIL_SAFETY_EMAIL", fallback_email)),
        "onboarding": ("Onboarding & Induction Facilitator", os.getenv("COUNCIL_ONBOARDING_EMAIL", fallback_email)),
        "health": ("Health & Well-Being Coordinator", os.getenv("COUNCIL_HEALTH_EMAIL", fallback_email)),
        "kitchen": ("Kitchen & Waste Management Coordinator", os.getenv("COUNCIL_KITCHEN_EMAIL", fallback_email)),
        "academic": ("Academic Facilitator", os.getenv("COUNCIL_ACADEMIC_EMAIL", fallback_email)),
        "offboarding": ("Offboarding Coordinator", os.getenv("COUNCIL_OFFBOARDING_EMAIL", fallback_email)),
        # Legacy categories kept for compatibility.
        "cleanliness": ("Kitchen & Waste Management Coordinator", os.getenv("COUNCIL_KITCHEN_EMAIL", fallback_email)),
        "water": ("Facility Incharge", os.getenv("COUNCIL_FACILITY_EMAIL", fallback_email)),
        "general": (fallback_name, fallback_email),
    }

    normalized = normalize_category(category)
    return mapping.get(normalized, (fallback_name, fallback_email))


def normalize_text(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


def score_duplicate(
    source_title: str,
    source_desc: str,
    ticket: models.Ticket,
) -> float:
    candidate_title = normalize_text(ticket.title)
    candidate_desc = normalize_text(ticket.description)

    title_similarity = SequenceMatcher(None, source_title, candidate_title).ratio()
    desc_similarity = SequenceMatcher(None, source_desc, candidate_desc).ratio()

    source_words = {word for word in source_title.split() if len(word) > 2}
    candidate_words = {word for word in candidate_title.split() if len(word) > 2}
    overlap_similarity = 0.0
    if source_words and candidate_words:
        overlap_similarity = len(source_words & candidate_words) / max(len(source_words), 1)

    # Weighted score that prefers title similarity for basic duplicate detection.
    return (title_similarity * 0.6) + (desc_similarity * 0.25) + (overlap_similarity * 0.15)


def find_duplicate_matches(
    db: Session,
    title: str,
    description: str,
    category: str | None,
    location: str | None,
    exclude_ticket_id: int | None = None,
    limit: int = 3,
) -> list[dict]:
    normalized_title = normalize_text(title)
    normalized_desc = normalize_text(description)
    normalized_category = normalize_text(category)
    normalized_location = normalize_text(location)

    if not normalized_title:
        return []

    candidates = db.query(models.Ticket).order_by(models.Ticket.id.desc()).limit(150).all()

    scored_matches = []
    for ticket in candidates:
        if exclude_ticket_id and ticket.id == exclude_ticket_id:
            continue

        ticket_category = normalize_text(ticket.category)
        ticket_location = normalize_text(ticket.location)

        if normalized_category and ticket_category and ticket_category != normalized_category:
            continue

        if normalized_location and ticket_location and ticket_location != normalized_location:
            continue

        score = score_duplicate(normalized_title, normalized_desc, ticket)
        if score < DUPLICATE_SCORE_THRESHOLD and normalize_text(ticket.title) != normalized_title:
            continue

        scored_matches.append(
            {
                "id": ticket.id,
                "title": ticket.title,
                "status": ticket.status,
                "location": ticket.location,
                "category": ticket.category or "General",
                "score": round(score, 2),
            }
        )

    scored_matches.sort(key=lambda row: (row["score"], row["id"]), reverse=True)
    return scored_matches[:limit]


def get_feedback_stats_map(db: Session) -> dict[int, dict]:
    rows = (
        db.query(
            models.TicketFeedback.ticket_id,
            models.TicketFeedback.rating,
        )
        .all()
    )

    stats: dict[int, dict] = {}
    for ticket_id, rating in rows:
        entry = stats.setdefault(ticket_id, {"total": 0, "sum": 0})
        entry["total"] += 1
        entry["sum"] += int(rating)

    result: dict[int, dict] = {}
    for ticket_id, entry in stats.items():
        result[ticket_id] = {
            "feedback_count": entry["total"],
            "feedback_avg": round(entry["sum"] / entry["total"], 2) if entry["total"] else None,
        }

    return result


def serialize_ticket(
    ticket: models.Ticket,
    has_voted: bool = False,
    feedback_stats_map: dict[int, dict] | None = None,
) -> dict:
    priority, escalated = get_effective_priority(ticket)
    feedback_stats = (feedback_stats_map or {}).get(ticket.id, {})
    return {
        "id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "category": ticket.category or "General",
        "location": ticket.location,
        "image_url": ticket.image_url,
        "status": ticket.status,
        "assigned_council": ticket.assigned_council or "General Council",
        "assigned_council_email": ticket.assigned_council_email,
        "vote_count": ticket.vote_count or 0,
        "priority": priority,
        "escalated": escalated,
        "has_voted": has_voted,
        "feedback_avg": feedback_stats.get("feedback_avg"),
        "feedback_count": feedback_stats.get("feedback_count", 0),
    }


class TicketStatusUpdateRequest(BaseModel):
    status: str


class TicketDuplicateCheckRequest(BaseModel):
    title: str
    description: str = ""
    category: str = "General"
    location: str = ""


class TicketFeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class TicketCommentRequest(BaseModel):
    text: str

# DB connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_voter_id(request: Request) -> str:
    user = request.session.get("user")
    if not user or user.get("id") is None:
        raise HTTPException(status_code=401, detail="Login required to vote")
    return str(user["id"])


def get_priority_from_votes(vote_count: int) -> str:
    if vote_count >= 10:
        return "Critical"
    if vote_count >= 6:
        return "High"
    if vote_count >= 3:
        return "Medium"
    return "Low"


def is_ticket_escalated(ticket: models.Ticket) -> bool:
    status = (ticket.status or "").strip().lower()
    if status in {"resolved", "done"}:
        return False

    if ticket.created_at is None:
        return False

    return (datetime.utcnow() - ticket.created_at) >= timedelta(days=ESCALATION_DAYS)


def get_effective_priority(ticket: models.Ticket) -> tuple[str, bool]:
    base_priority = get_priority_from_votes(ticket.vote_count or 0)
    escalated = is_ticket_escalated(ticket)

    if not escalated:
        return base_priority, False

    bumped_priority = {
        "Low": "Medium",
        "Medium": "High",
        "High": "Critical",
        "Critical": "Critical",
    }
    return bumped_priority.get(base_priority, base_priority), True


def get_priority_rank(priority: str) -> int:
    rank_map = {
        "Low": 1,
        "Medium": 2,
        "High": 3,
        "Critical": 4,
    }
    return rank_map.get(priority, 0)


# ✅ CREATE TICKET API (FIXED)
@router.post("/tickets")
def create_ticket(
    title: str = Form(...),
    category: str = Form("General"),
    description: str = Form(...),
    location: str = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db)
):
    image_url = None
    if file:
        try:
            image_url = upload_image(file.file)
        except Exception as error:
            raise HTTPException(status_code=400, detail=f"Image upload failed: {error}")

    category_value = category.strip() if category else "General"
    council_name, council_email = get_council_for_category(category_value)

    # ✅ SAVE TO DB
    ticket = models.Ticket(
        title=title,
        category=category_value,
        description=description,
        location=location,
        assigned_council=council_name,
        assigned_council_email=council_email,
        image_url=image_url,
        status="Pending"
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    duplicate_matches = find_duplicate_matches(
        db=db,
        title=title,
        description=description,
        category=category_value,
        location=location,
        exclude_ticket_id=ticket.id,
    )

    # ✅ EMAIL SEND
    try:
        send_email(
            council_email,
            "New Ticket Created",
            (
                f"Title: {title}\n"
                f"Category: {category_value}\n"
                f"Description: {description}\n"
                f"Location: {location}\n"
                f"Assigned Council: {council_name}\n"
                f"Image: {image_url or 'No image attached'}"
            )
        )
    except Exception:
        pass

    payload = serialize_ticket(ticket, has_voted=False)
    payload["duplicate_matches"] = duplicate_matches
    return payload


@router.post("/tickets/check-duplicates")
def check_ticket_duplicates(payload: TicketDuplicateCheckRequest, db: Session = Depends(get_db)):
    matches = find_duplicate_matches(
        db=db,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        location=payload.location,
    )
    return {
        "possible_duplicates": matches,
        "duplicate_count": len(matches),
    }


@router.post("/tickets/{ticket_id}/vote")
def toggle_ticket_vote(ticket_id: int, request: Request, db: Session = Depends(get_db)):
    voter_id = get_voter_id(request)

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    existing_vote = (
        db.query(models.TicketVote)
        .filter(
            models.TicketVote.ticket_id == ticket_id,
            models.TicketVote.voter_id == voter_id,
        )
        .first()
    )

    voted = False
    if existing_vote:
        db.delete(existing_vote)
        ticket.vote_count = max(0, (ticket.vote_count or 0) - 1)
    else:
        db.add(models.TicketVote(ticket_id=ticket_id, voter_id=voter_id))
        ticket.vote_count = (ticket.vote_count or 0) + 1
        voted = True

    db.commit()
    db.refresh(ticket)

    ticket_payload = serialize_ticket(ticket, has_voted=voted)
    return {
        "ticket_id": ticket.id,
        "vote_count": ticket_payload["vote_count"],
        "priority": ticket_payload["priority"],
        "escalated": ticket_payload["escalated"],
        "voted": voted,
    }


@router.patch("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    payload: TicketStatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = request.session.get("user")
    if not user or user.get("id") is None:
        raise HTTPException(status_code=401, detail="Login required to update status")

    # Check if user is admin
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only admins can update ticket status")

    normalized_status = (payload.status or "").strip().lower()
    mapped_status = STATUS_MAP.get(normalized_status)
    if not mapped_status:
        allowed_values = ", ".join(sorted(set(STATUS_MAP.values())))
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {allowed_values}")

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = mapped_status
    db.commit()
    db.refresh(ticket)

    voter_id = str(user["id"])
    has_voted = (
        db.query(models.TicketVote.id)
        .filter(
            models.TicketVote.ticket_id == ticket_id,
            models.TicketVote.voter_id == voter_id,
        )
        .first()
        is not None
    )

    feedback_stats_map = get_feedback_stats_map(db)
    return serialize_ticket(ticket, has_voted=has_voted, feedback_stats_map=feedback_stats_map)


@router.delete("/tickets/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = request.session.get("user")
    if not user or user.get("id") is None:
        raise HTTPException(status_code=401, detail="Login required to delete a ticket")

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Delete associated votes first (due to foreign key constraints)
    db.query(models.TicketVote).filter(models.TicketVote.ticket_id == ticket_id).delete()

    # Delete associated feedback
    db.query(models.TicketFeedback).filter(models.TicketFeedback.ticket_id == ticket_id).delete()

    # Delete the ticket
    db.delete(ticket)
    db.commit()

    return {
        "detail": "Ticket deleted successfully",
        "ticket_id": ticket_id,
    }


@router.post("/tickets/{ticket_id}/feedback")
def add_ticket_feedback(
    ticket_id: int,
    payload: TicketFeedbackRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = request.session.get("user")
    if not user or user.get("id") is None:
        raise HTTPException(status_code=401, detail="Login required to submit feedback")

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    reviewer_id = str(user["id"])
    feedback = (
        db.query(models.TicketFeedback)
        .filter(
            models.TicketFeedback.ticket_id == ticket_id,
            models.TicketFeedback.reviewer_id == reviewer_id,
        )
        .first()
    )

    sanitized_comment = (payload.comment or "").strip()
    if feedback:
        feedback.rating = payload.rating
        feedback.comment = sanitized_comment
    else:
        db.add(
            models.TicketFeedback(
                ticket_id=ticket_id,
                reviewer_id=reviewer_id,
                rating=payload.rating,
                comment=sanitized_comment,
            )
        )

    db.commit()

    feedback_rows = (
        db.query(models.TicketFeedback)
        .filter(models.TicketFeedback.ticket_id == ticket_id)
        .all()
    )
    feedback_count = len(feedback_rows)
    feedback_avg = round(sum(int(row.rating) for row in feedback_rows) / feedback_count, 2) if feedback_count else None

    return {
        "ticket_id": ticket_id,
        "feedback_count": feedback_count,
        "feedback_avg": feedback_avg,
    }


@router.get("/tickets/{ticket_id}/feedback")
def get_ticket_feedback(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Query feedback and manually match with users since reviewer_id is stored as string
    feedback_rows = (
        db.query(models.TicketFeedback)
        .filter(models.TicketFeedback.ticket_id == ticket_id)
        .order_by(models.TicketFeedback.id.desc())
        .all()
    )
    
    # Fetch all users for manual matching
    users_map = {str(u.id): u for u in db.query(models.User).all()}
    
    # Pair feedback with users
    feedback_with_users = []
    for fb in feedback_rows:
        user = users_map.get(str(fb.reviewer_id))
        feedback_with_users.append((fb, user))
    
    feedback_count = len(feedback_rows)
    feedback_avg = (
        round(sum(int(fb.rating) for fb in feedback_rows) / feedback_count, 2)
        if feedback_count
        else None
    )

    return {
        "ticket_id": ticket_id,
        "feedback_count": feedback_count,
        "feedback_avg": feedback_avg,
        "recent_feedback": [
            {
                "rating": int(feedback.rating),
                "comment": feedback.comment or "",
                "reviewer_name": user.name if user else "Anonymous",
            }
            for feedback, user in feedback_with_users[:5]
        ],
    }


@router.post("/tickets/{ticket_id}/comments")
def add_ticket_comment(
    ticket_id: int,
    payload: TicketCommentRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = request.session.get("user")
    if not user or user.get("id") is None:
        raise HTTPException(status_code=401, detail="Login required to add comment")

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    comment_text = payload.text.strip()
    if not comment_text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    comment = models.TicketComment(
        ticket_id=ticket_id,
        user_id=user["id"],  # Store as integer (database user ID)
        text=comment_text
    )
    db.add(comment)
    db.commit()

    return {
        "id": comment.id,
        "ticket_id": ticket_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "text": comment_text,
    }


@router.get("/tickets/{ticket_id}/comments")
def get_ticket_comments(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Join comments with user data in a single query
    comments = (
        db.query(models.TicketComment, models.User)
        .join(models.User, models.TicketComment.user_id == models.User.id, isouter=True)
        .filter(models.TicketComment.ticket_id == ticket_id)
        .order_by(models.TicketComment.created_at.desc())
        .all()
    )

    comments_list = []
    for comment_record in comments:
        comment = comment_record[0]
        user = comment_record[1]
        comments_list.append({
            "id": comment.id,
            "text": comment.text,
            "user_id": comment.user_id,
            "user_name": user.name if user else "Anonymous",
            "created_at": comment.created_at.isoformat() if comment.created_at else None,
        })

    return {
        "ticket_id": ticket_id,
        "comments": comments_list,
    }


@router.put("/tickets/{ticket_id}/comments/{comment_id}")
def update_ticket_comment(
    ticket_id: int,
    comment_id: int,
    payload: TicketCommentRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = request.session.get("user")
    if not user or user.get("id") is None:
        raise HTTPException(status_code=401, detail="Login required to update comment")

    comment = db.query(models.TicketComment).filter(
        models.TicketComment.id == comment_id,
        models.TicketComment.ticket_id == ticket_id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Only student authors can edit their own comments.
    if user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Council users cannot edit comments")

    if comment.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Only comment author can edit")

    comment_text = payload.text.strip()
    if not comment_text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    comment.text = comment_text
    db.commit()

    return {
        "id": comment.id,
        "ticket_id": ticket_id,
        "text": comment_text,
        "message": "Comment updated successfully"
    }


@router.delete("/tickets/{ticket_id}/comments/{comment_id}")
def delete_ticket_comment(
    ticket_id: int,
    comment_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = request.session.get("user")
    if not user or user.get("id") is None:
        raise HTTPException(status_code=401, detail="Login required to delete comment")

    comment = db.query(models.TicketComment).filter(
        models.TicketComment.id == comment_id,
        models.TicketComment.ticket_id == ticket_id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Only student authors can delete their own comments.
    if user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Council users cannot delete comments")

    if comment.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Only comment author can delete")

    db.delete(comment)
    db.commit()

    return {
        "message": "Comment deleted successfully",
        "comment_id": comment_id
    }


@router.get("/analytics/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).all()
    feedback_rows = db.query(models.TicketFeedback).all()

    total_tickets = len(tickets)
    resolved_tickets = 0
    pending_tickets = 0
    in_progress_tickets = 0
    escalated_tickets = 0
    total_votes = 0

    category_counts: dict[str, int] = {}
    priority_counts: dict[str, int] = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}

    for ticket in tickets:
        status = (ticket.status or "").strip().lower()
        if status in {"resolved", "done"}:
            resolved_tickets += 1
        elif status in {"in progress", "in-progress"}:
            in_progress_tickets += 1
        else:
            pending_tickets += 1

        priority, escalated = get_effective_priority(ticket)
        if escalated:
            escalated_tickets += 1
        priority_counts[priority] = priority_counts.get(priority, 0) + 1
        total_votes += ticket.vote_count or 0

        category = ticket.category or "General"
        category_counts[category] = category_counts.get(category, 0) + 1

    feedback_count = len(feedback_rows)
    feedback_avg = (
        round(sum(int(row.rating) for row in feedback_rows) / feedback_count, 2)
        if feedback_count
        else None
    )

    top_voted_tickets = sorted(
        tickets,
        key=lambda ticket: (ticket.vote_count or 0, ticket.id),
        reverse=True,
    )[:5]

    return {
        "total_tickets": total_tickets,
        "resolved_tickets": resolved_tickets,
        "pending_tickets": pending_tickets,
        "in_progress_tickets": in_progress_tickets,
        "open_tickets": max(total_tickets - resolved_tickets, 0),
        "escalated_tickets": escalated_tickets,
        "total_votes": total_votes,
        "feedback_count": feedback_count,
        "feedback_avg": feedback_avg,
        "resolution_rate": round((resolved_tickets / total_tickets) * 100, 2) if total_tickets else 0,
        "tickets_by_category": [
            {"category": category, "count": count}
            for category, count in sorted(category_counts.items(), key=lambda item: item[1], reverse=True)
        ],
        "tickets_by_priority": [
            {"priority": priority, "count": count}
            for priority, count in sorted(
                priority_counts.items(),
                key=lambda item: get_priority_rank(item[0]),
                reverse=True,
            )
        ],
        "top_voted_tickets": [
            {
                "id": ticket.id,
                "title": ticket.title,
                "vote_count": ticket.vote_count or 0,
                "status": ticket.status,
                "priority": get_effective_priority(ticket)[0],
            }
            for ticket in top_voted_tickets
        ],
    }


# ✅ GET ALL TICKETS
@router.get("/tickets")
def get_tickets(request: Request, db: Session = Depends(get_db)):
    voted_ticket_ids = set()
    user = request.session.get("user")

    if user and user.get("id") is not None:
        voter_id = str(user["id"])
        vote_rows = (
            db.query(models.TicketVote.ticket_id)
            .filter(models.TicketVote.voter_id == voter_id)
            .all()
        )
        voted_ticket_ids = {row[0] for row in vote_rows}

    tickets = db.query(models.Ticket).all()
    feedback_stats_map = get_feedback_stats_map(db)

    sorted_tickets = sorted(
        tickets,
        key=lambda ticket: (
            get_priority_rank(get_effective_priority(ticket)[0]),
            ticket.vote_count or 0,
            ticket.id,
        ),
        reverse=True,
    )

    return [
        serialize_ticket(
            ticket,
            has_voted=ticket.id in voted_ticket_ids,
            feedback_stats_map=feedback_stats_map,
        )
        for ticket in sorted_tickets
    ]