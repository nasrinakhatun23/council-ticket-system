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

router = APIRouter()

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


# ✅ CREATE TICKET API (FIXED)
@router.post("/tickets")
def create_ticket(
    title: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        image_url = upload_image(file.file)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Image upload failed: {error}")

    # ✅ SAVE TO DB
    ticket = models.Ticket(
        title=title,
        description=description,
        location=location,
        image_url=image_url,
        status="Pending"
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # ✅ EMAIL SEND
    council_email = os.getenv("COUNCIL_EMAIL", "council@gmail.com")
    try:
        send_email(
            council_email,
            "New Ticket Created",
            f"Title: {title}\nDescription: {description}\nLocation: {location}\nImage: {image_url}"
        )
    except Exception:
        pass

    return {
        "id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "location": ticket.location,
        "image_url": ticket.image_url,
        "status": ticket.status,
        "vote_count": ticket.vote_count or 0,
        "has_voted": False,
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

    return {
        "ticket_id": ticket.id,
        "vote_count": ticket.vote_count or 0,
        "voted": voted,
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

    tickets = (
        db.query(models.Ticket)
        .order_by(models.Ticket.vote_count.desc(), models.Ticket.id.desc())
        .all()
    )

    return [
        {
            "id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "location": ticket.location,
            "image_url": ticket.image_url,
            "status": ticket.status,
            "vote_count": ticket.vote_count or 0,
            "has_voted": ticket.id in voted_ticket_ids,
        }
        for ticket in tickets
    ]