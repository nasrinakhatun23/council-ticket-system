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




from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
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

    return ticket


# ✅ GET ALL TICKETS
@router.get("/tickets")
def get_tickets(db: Session = Depends(get_db)):
    return db.query(models.Ticket).all()